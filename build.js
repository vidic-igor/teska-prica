/*
 * Builds the publishable site into dist/.
 *
 * Cloudflare Pages settings:
 *   Build command:    npm run build
 *   Output directory: dist
 *
 * Only the files listed in ASSETS reach the public site. Source (app.jsx),
 * docs/, and the tooling files stay out of it on purpose.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const babel = require('@babel/core');
const React = require('react');
const { renderToString } = require('react-dom/server');

const root = __dirname;
const dist = path.join(root, 'dist');

const ASSETS = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  '_headers',
  'favicon.ico',
  'favicon-32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'admin',
  'content',
  'img',
  'uploads',
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const { code } = babel.transformFileSync(path.join(root, 'app.jsx'), {
  presets: [require.resolve('@babel/preset-react')],
  babelrc: false,
  configFile: false,
});
fs.writeFileSync(path.join(dist, 'app.js'), code + '\n');

/* Minify the shipped bundle. Run as a child process so build.js stays
   synchronous; terser's API is promise-based. The prerender below uses the
   unminified `code` in memory, so it is unaffected either way. */
const appJsPath = path.join(dist, 'app.js');
const rawSize = fs.statSync(appJsPath).size;
execFileSync(
  process.execPath,
  [require.resolve('terser/bin/terser'), appJsPath, '--compress', '--mangle', '--output', appJsPath],
  { stdio: 'inherit' },
);
const minSize = fs.statSync(appJsPath).size;

let missing = [];
for (const name of ASSETS) {
  const src = path.join(root, name);
  if (!fs.existsSync(src)) {
    missing.push(name);
    continue;
  }
  fs.cpSync(src, path.join(dist, name), { recursive: true });
}

if (missing.length) {
  console.error('build: missing required files: ' + missing.join(', '));
  process.exit(1);
}

/*
 * Inline the content into index.html. Without this the browser waits on
 * html -> app.js -> four JSON fetches before anything renders, and App()
 * returns null for the whole of that.
 */
const CONTENT_MARKER = '<!--build:content-->';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const bundle = {
  gigs: readJson('content/gigs.json').items,
  members: readJson('content/members.json').items,
  settings: readJson('content/settings.json'),
  venues: readJson('content/venues.json').items,
};

/* Escaping < stops the payload closing the script element early. */
const payload = JSON.stringify(bundle).replace(/</g, '\\u003c');

const indexPath = path.join(dist, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes(CONTENT_MARKER)) {
  console.error(`build: ${CONTENT_MARKER} is missing from index.html`);
  process.exit(1);
}
fs.writeFileSync(
  indexPath,
  html.replace(CONTENT_MARKER, `<script>window.__CONTENT__=${payload};</script>`),
);

/*
 * Prerender the app into #root.
 *
 * Without this a crawler that does not run JavaScript sees 49 words, one
 * paragraph and no external links, because everything visible is built by
 * React at runtime. Prerendering puts the same markup a visitor sees into
 * the HTML itself. Nothing is hidden and nothing is duplicated: the client
 * re-renders over it on load.
 *
 * The client keeps using createRoot().render() rather than hydrating. Gigs
 * work out UPCOMING vs PAST from the current date, so a build-time snapshot
 * drifts out of date and would not match on hydration. Letting React throw
 * the snapshot away means crawlers get the build-time view and visitors
 * always get today's.
 */
function prerender(appCode, content) {
  const sandbox = {
    React,
    /* app.js ends by mounting into the DOM. Stub both so that line is inert
       here; the real mount happens in the browser. */
    ReactDOM: { createRoot: () => ({ render: () => {} }) },
    document: { getElementById: () => null },
    window: { __CONTENT__: content },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(appCode, sandbox, { filename: 'app.js' });

  if (typeof sandbox.App !== 'function') {
    throw new Error('App was not defined after evaluating app.js');
  }
  return renderToString(React.createElement(sandbox.App));
}

const ROOT_DIV = '<div id="root"></div>';
let prerendered;
try {
  prerendered = prerender(code, bundle);
} catch (err) {
  console.error('build: prerender failed -', err.message);
  process.exit(1);
}

const withContent = fs.readFileSync(indexPath, 'utf8');
if (!withContent.includes(ROOT_DIV)) {
  console.error(`build: ${ROOT_DIV} is missing from index.html`);
  process.exit(1);
}
fs.writeFileSync(
  indexPath,
  withContent.replace(ROOT_DIV, `<div id="root">${prerendered}</div>`),
);

const count = (function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? walk(path.join(dir, e.name)) : 1), 0);
})(dist);

console.log(
  `build: dist/ ready (${count} files, ${payload.length} B content inlined, ` +
  `${prerendered.length} B prerendered, app.js ${rawSize} -> ${minSize} B)`,
);

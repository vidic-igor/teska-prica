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
const babel = require('@babel/core');

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

const count = (function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? walk(path.join(dir, e.name)) : 1), 0);
})(dist);

console.log(`build: dist/ ready (${count} files, ${payload.length} B content inlined)`);

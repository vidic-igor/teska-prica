/*
 * Builds the publishable site into dist/.
 *
 * Cloudflare Workers Builds settings:
 *   Build command:  npm run build:cloudflare
 *   Deploy command: npx wrangler deploy
 *   Assets:         dist/, via assets.directory in wrangler.jsonc
 *
 * Only the files listed in ASSETS reach the public site. Source (app.jsx),
 * docs/, worker/ and the tooling files stay out of it on purpose.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const babel = require('@babel/core');
const sharp = require('sharp');
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

/* Photo directories only. The favicons and the manifest icons live at the
   root and have to keep their PNG/ICO form. */
const IMAGE_DIRS = ['img', 'uploads'];
const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png']);
const MAX_EDGE = 1400;
const WEBP_QUALITY = 76;

/* Social crawlers are not browsers. Facebook, LinkedIn and WhatsApp handle
   WebP link previews poorly or not at all, so og:image and the JSON-LD image
   keep a JPEG. Only the absolute https:// URLs are swapped back; the preload
   link and the CSS background stay WebP for real browsers. */
const SOCIAL_SOURCE = 'img/hero.jpg';
const SOCIAL_OUT = 'img/hero.jpg';
const SOCIAL_WIDTH = 1200;

const fail = (msg) => {
  console.error('build: ' + msg);
  process.exit(1);
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

/*
 * Re-encode the photos as WebP, capped at MAX_EDGE on the long edge. The
 * originals stay in git as the source of truth and stay editable in the CMS;
 * only the converted files ship. Doing it here rather than by hand means the
 * photos the band uploads through /admin get the same treatment.
 *
 * Returns old -> new relative paths so every reference can be rewritten.
 */
async function optimizeImages() {
  const renames = new Map();
  let before = 0;
  let after = 0;

  for (const dir of IMAGE_DIRS) {
    const abs = path.join(dist, dir);
    if (!fs.existsSync(abs)) continue;

    for (const file of walk(abs)) {
      const ext = path.extname(file).toLowerCase();
      if (!CONVERTIBLE.has(ext)) continue;

      const rel = path.relative(dist, file).split(path.sep).join('/');
      const sizeBefore = fs.statSync(file).size;

      const buf = await sharp(file)
        .rotate() /* honour EXIF orientation before the metadata is dropped */
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      /* Never ship something bigger than what we started with. */
      if (buf.length >= sizeBefore) {
        before += sizeBefore;
        after += sizeBefore;
        continue;
      }

      const outRel = rel.slice(0, -ext.length) + '.webp';
      fs.writeFileSync(path.join(dist, outRel), buf);
      fs.rmSync(file);
      renames.set(rel, outRel);
      before += sizeBefore;
      after += buf.length;
    }
  }

  return { renames, before, after };
}

const rewritePaths = (text, renames) => {
  let out = text;
  for (const [from, to] of renames) out = out.split(from).join(to);
  return out;
};

/* ---------------------------------------------------------------------- */

async function main() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  const missing = [];
  for (const name of ASSETS) {
    const src = path.join(root, name);
    if (!fs.existsSync(src)) {
      missing.push(name);
      continue;
    }
    fs.cpSync(src, path.join(dist, name), { recursive: true });
  }
  if (missing.length) fail('missing required files: ' + missing.join(', '));

  const { renames, before, after } = await optimizeImages();

  /* Compile, then point every image reference at the converted file. */
  const compiled = babel.transformFileSync(path.join(root, 'app.jsx'), {
    presets: [require.resolve('@babel/preset-react')],
    babelrc: false,
    configFile: false,
  }).code;
  const code = rewritePaths(compiled, renames);

  const appJsPath = path.join(dist, 'app.js');
  fs.writeFileSync(appJsPath, code + '\n');

  /* Minify the shipped bundle. Run as a child process because terser's API is
     promise-based and this keeps the ordering obvious. The prerender below
     uses the unminified `code` in memory, so it is unaffected. */
  const rawSize = fs.statSync(appJsPath).size;
  execFileSync(
    process.execPath,
    [require.resolve('terser/bin/terser'), appJsPath, '--compress', '--mangle', '--output', appJsPath],
    { stdio: 'inherit' },
  );
  const minSize = fs.statSync(appJsPath).size;

  /*
   * Inline the content. Without this the browser waits on
   * html -> app.js -> four JSON fetches before anything renders.
   */
  const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const bundle = JSON.parse(
    rewritePaths(
      JSON.stringify({
        gigs: readJson('content/gigs.json').items,
        members: readJson('content/members.json').items,
        settings: readJson('content/settings.json'),
        venues: readJson('content/venues.json').items,
      }),
      renames,
    ),
  );

  /* Escaping < stops the payload closing the script element early. */
  const payload = JSON.stringify(bundle).replace(/</g, '\\u003c');

  const CONTENT_MARKER = '<!--build:content-->';
  const ROOT_DIV = '<div id="root"></div>';
  const indexPath = path.join(dist, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  if (!html.includes(CONTENT_MARKER)) fail(`${CONTENT_MARKER} is missing from index.html`);
  if (!html.includes(ROOT_DIV)) fail(`${ROOT_DIV} is missing from index.html`);

  html = rewritePaths(html, renames); /* the hero preload link */

  /* Emit a JPEG purely for link previews and swap the absolute URLs back. */
  const socialSrc = path.join(root, SOCIAL_SOURCE);
  if (!fs.existsSync(socialSrc)) fail(SOCIAL_SOURCE + ' is missing; it is the share image');
  await sharp(socialSrc)
    .rotate()
    .resize({ width: SOCIAL_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(dist, SOCIAL_OUT));

  const socialWebp = renames.get(SOCIAL_SOURCE);
  if (socialWebp) {
    html = html.split('teskaprica.rs/' + socialWebp).join('teskaprica.rs/' + SOCIAL_OUT);
  }
  if (!html.includes('teskaprica.rs/' + SOCIAL_OUT)) {
    fail('share image URL was not restored to a JPEG');
  }
  html = html.replace(CONTENT_MARKER, `<script>window.__CONTENT__=${payload};</script>`);

  /*
   * Prerender into #root.
   *
   * Everything visible is built by React, so without this a crawler that does
   * not run JavaScript sees about 50 words and no external links. Prerendering
   * puts the markup a visitor sees into the HTML itself. Nothing is hidden and
   * nothing is duplicated: the client re-renders over it on load.
   *
   * The client keeps using createRoot().render() rather than hydrating. Gigs
   * work out UPCOMING vs PAST from the current date, so a build-time snapshot
   * drifts and would not match on hydration. Letting React throw the snapshot
   * away means crawlers get the build's view and visitors get today's.
   */
  let prerendered;
  try {
    const sandbox = {
      React,
      /* app.js ends by mounting into the DOM. Stub both so that line is inert
         here; the real mount happens in the browser. */
      ReactDOM: { createRoot: () => ({ render: () => {} }) },
      document: { getElementById: () => null },
      window: { __CONTENT__: bundle },
      console,
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: 'app.js' });
    if (typeof sandbox.App !== 'function') throw new Error('App was not defined');
    prerendered = renderToString(React.createElement(sandbox.App));
  } catch (err) {
    fail('prerender failed - ' + err.message);
  }

  fs.writeFileSync(indexPath, html.replace(ROOT_DIV, `<div id="root">${prerendered}</div>`));

  /* The JSON is only the fallback path, but it must not point at files that
     are no longer there. */
  for (const file of walk(path.join(dist, 'content'))) {
    fs.writeFileSync(file, rewritePaths(fs.readFileSync(file, 'utf8'), renames));
  }

  /* Nothing may reference an image that did not survive the conversion. */
  const finalHtml = fs.readFileSync(indexPath, 'utf8');
  const finalJs = fs.readFileSync(appJsPath, 'utf8');
  const referenced = new Set(
    [...`${finalHtml}\n${finalJs}`.matchAll(
      /(?:img|uploads)\/[A-Za-z0-9._-]+\.(?:webp|jpg|jpeg|png|mp4)/g,
    )].map((m) => m[0]),
  );
  const broken = [...referenced].filter((r) => !fs.existsSync(path.join(dist, r)));
  if (broken.length) fail('references point at missing files: ' + broken.join(', '));

  const count = walk(dist).length;
  const saved = before ? Math.round(100 - (after / before) * 100) : 0;
  console.log(
    `build: dist/ ready (${count} files, ${payload.length} B content inlined, ` +
    `${prerendered.length} B prerendered, app.js ${rawSize} -> ${minSize} B, ` +
    `images ${(before / 1024).toFixed(0)} -> ${(after / 1024).toFixed(0)} KB, ${saved}% off)`,
  );
}

main().catch((err) => fail(err.stack || err.message));

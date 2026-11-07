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

const count = (function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? walk(path.join(dir, e.name)) : 1), 0);
})(dist);

console.log(`build: dist/ ready (${count} files)`);

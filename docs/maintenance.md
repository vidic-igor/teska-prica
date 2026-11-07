# teskaprica.rs — maintenance guide

The migration off Netlify is finished. This describes how the site works now
and how to change it.

## Where things live

| Thing | Where |
|---|---|
| Site | `teskaprica.rs`, a Cloudflare Worker named `teska-prica` serving static assets |
| Also reachable at | `teska-prica.igor-vidic92.workers.dev` |
| CMS auth broker | a second Worker, `teska-prica-auth` |
| Repo | `github.com/vidic-igor/teska-prica`, public |
| Booking enquiries | Web3Forms, relayed to e-mail |
| Cloudflare account | `eb45849dc4f7f95d47db660742f2e495` |

`www.teskaprica.rs` 301s to the apex via a Cloudflare redirect rule, which
lives in the dashboard rather than in this repo.

## Deploying

Push to `main`. Cloudflare Workers Builds rebuilds and deploys, usually within
a minute. Its settings:

| Setting | Value |
|---|---|
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Output | `dist/`, via `assets.directory` in `wrangler.jsonc` |

The free plan allows 500 builds a month. Netlify's 20 is what forced the move.

## What the build does

`npm run build` (and its `build:cloudflare` alias) runs `build.js`, which:

1. Compiles `app.jsx` to `dist/app.js` with Babel.
2. Copies only the files in `ASSETS` into `dist/`. Everything else — `app.jsx`,
   `package.json`, `docs/`, `worker/` — stays out of the published site. Do not
   publish from the repo root; it served all of that to the internet for months.
3. Inlines the four `content/*.json` files into `index.html` as
   `window.__CONTENT__`, replacing the `<!--build:content-->` marker. Without
   it the browser waits on html → app.js → four fetches before anything paints.
4. Prerenders the React tree with `renderToString` and writes it into `#root`.

A missing asset, a missing marker or a failed prerender fails the build, so a
broken page cannot ship.

### Why prerendering matters

Everything visible is built by React. Without the prerender a crawler that does
not run JavaScript sees 49 words, one paragraph and no external links; with it,
358 words, 14 paragraphs and 11 external links. Almost every finding in the SEO
audit traced back to this.

The client calls `createRoot().render()`, not `hydrateRoot()`. Gigs work out
UPCOMING vs PAST from the current date, so a build-time snapshot drifts and
would not match on hydration. React throws the snapshot away and re-renders:
crawlers get the build's view, visitors get today's.

Two traps worth remembering:

- **Do not add hidden text for crawlers.** There used to be a `#seo-static`
  block. The prerender replaced it, and keeping it would have meant two `<h1>`s
  and a block of duplicate text that only robots see.
- **`<br />` fuses words in text content.** `TEŠKA<br />PRIČA` reads as
  `TEŠKAPRIČA`. Write `TEŠKA{' '}<br />PRIČA`.

## Editing content

The band edits at `/admin` (Decap CMS). Saving commits to `main`, which triggers
a deploy. Content lives in `content/*.json`.

Editing `admin/config.yml`:

- **Every field is required unless you add `required: false`.** This is the
  opposite of what most people expect and it has bitten us.
- Lists want `collapsed: true` and a `summary`, or the editor renders every item
  fully expanded and the add button ends up below all of them.
- `add_to_top: true` puts new entries where people look for them.
- A broken `config.yml` takes `/admin` down entirely and the build will not
  catch it. Parse it before pushing:
  `python3 -c "import yaml;yaml.safe_load(open('admin/config.yml'))"`

## The auth broker

Decap's `github` backend needs a server to hold the OAuth client secret and
exchange the code for a token. Netlify did this at `api.netlify.com`, which only
works for sites hosted there. `worker/` replaces it.

**Always pass `-c worker/wrangler.toml`.** Running wrangler from inside
`worker/` resolves the *root* `wrangler.jsonc` and operates on the site Worker
instead. This sent the OAuth secret to the wrong Worker twice. Adding a
`package.json` to `worker/` did not fix it.

```bash
npx wrangler deploy      -c worker/wrangler.toml
npx wrangler secret list -c worker/wrangler.toml
npx wrangler secret put GITHUB_OAUTH_SECRET -c worker/wrangler.toml
```

`secrets.required` in `worker/wrangler.toml` fails the deploy if the secret is
missing, which is the guard against that mistake.

`SITE_ORIGINS` lists the origins allowed to receive the token. The site's origin
must be in it or login fails silently after GitHub redirects back.

### The GitHub OAuth App

It must be an **OAuth App**, not a GitHub App. A GitHub App logs in fine and
loads content, then fails every save with
`Resource not accessible by integration`, because it returns a user-to-server
token capped by installation permissions.

**Do not judge the type by the client-ID prefix.** `Ov23li…` is an OAuth App and
`Iv1.` / `Iv23li…` is a GitHub App, but the convention is undocumented and we
got it backwards once. Check which list it appears under in GitHub settings, or
the token prefix: `gho_` is an OAuth App, `ghu_` is a GitHub App.

The callback URL must be exactly
`https://teska-prica-auth.igor-vidic92.workers.dev/callback`. GitHub would not
match it when the broker appended `?provider=github`, so the broker sends a bare
callback URL.

## The booking form

`app.jsx` POSTs JSON to `https://api.web3forms.com/submit`. The access key is a
submit-only endpoint id and is meant to ship in the page.

- Free tier is 250 submissions a month.
- Payload keys become the field labels in the e-mail, which is why they are
  written out in Serbian.
- `replyto` is set when the contact field contains an `@`.
- Web3Forms **blocks non-browser clients**, so you cannot test it with curl. It
  has to be a real submission from the deployed site.
- The first e-mails land in spam. Allowlist the `web3forms.com` domain and mark
  several as not spam.

## Still open

- Backlinks: 1 referring domain. Off-page, so no code change helps. Instagram
  bio, a Google Business Profile, links from venues.
- `sitemap.xml` hardcodes `lastmod`; it could be generated at build time.
- The broker could move to `auth.teskaprica.rs`, which needs a custom domain on
  the Worker and a new callback URL on the OAuth App.
- Images are unresized JPEGs, roughly 1 MB in `img/`.
- Gigs are a `list` inside one file. A folder collection, one file per gig,
  would give a proper "New Nastup" button, search and sorting.

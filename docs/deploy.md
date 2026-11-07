# Moving the prototype from Netlify to Cloudflare

## Why

Netlify's free plan gives 300 credits a month and charges 15 per production
deploy, so we get 20. We pushed 22 commits in the last 30 days, which is why
deploys are blocked. Every edit the band makes in `/admin` is a commit and so
another deploy, so this ceiling gets hit every month.

Cloudflare's free tier allows 500 builds a month, with unlimited bandwidth and
unlimited static requests.

There is no domain yet. The site runs on a `workers.dev` subdomain, so there is
no DNS, no registrar and no cutover. Buying a domain later is a separate, small
job; see the last section.

## Where it runs

Connecting the repo in the Cloudflare dashboard created a **Worker serving
static assets**, not a Pages project. That is what Cloudflare's current
onboarding does, and it is a fine place to be. The site is at:

    https://teska-prica.igor-vidic92.workers.dev

The account subdomain is `igor-vidic92`, so the OAuth broker below lands at
`teska-prica-auth.igor-vidic92.workers.dev`.

## What depends on Netlify

| Piece | How |
|---|---|
| Hosting + redirects | `netlify.toml` |
| Booking form | Netlify Forms: hidden `<form data-netlify>` in `index.html`, `app.jsx` POSTs to `/` |
| `/admin` login | Decap's `github` backend with no `base_url`, so it silently uses Netlify's OAuth broker at `api.netlify.com` |

The last one is the trap: CMS login breaks off Netlify even though the backend
is `github` and not `git-gateway`.

## In the repo

`npm run build` still produces the root `app.js` Netlify needs, so the Netlify
site is unaffected by any of this.

- `wrangler.jsonc` — the Worker's config: name, and `assets.directory` set to
  `./dist`.
- `build.js` + `npm run build:cloudflare` — builds `dist/`, holding only the 30
  files the public should see.
- `worker/` — our own GitHub OAuth broker, replacing `api.netlify.com`.

No `_redirects` file is needed. Cloudflare's static-asset handling already
redirects `/admin` to `/admin/` and serves the index file.

## Step 1 — Stop publishing the source

The first deploy published the whole repo, so `app.jsx`, `package.json`,
`netlify.toml`, `admin/config.yml` and `docs/superpowers/plans/*.md` are all
readable on the live site today. `wrangler.jsonc` fixes that by publishing only
`dist/`.

1. Push `main`.
2. In the Cloudflare dashboard, open the `teska-prica` Worker →
   **Settings → Build**, and set:

   | Setting | Value |
   |---|---|
   | Build command | `npm run build:cloudflare` |
   | Deploy command | `npx wrangler deploy` |

3. Redeploy, then confirm the source is gone:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     https://teska-prica.igor-vidic92.workers.dev/app.jsx
   ```

   It should be `404`. So should `/package.json` and the `docs/` path.

## Step 2 — Deploy the OAuth broker

Only needed so the band can use `/admin`.

1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**.
   Not GitHub Apps: a client id starting `Ov23li` means the wrong type.
   - Homepage URL: `https://teska-prica.igor-vidic92.workers.dev`
   - Authorization callback URL:
     `https://teska-prica-auth.igor-vidic92.workers.dev/callback`
2. Put the client id in `worker/wrangler.toml` as `GITHUB_OAUTH_ID`.
3. Generate a client secret, then:

   ```bash
   cd worker
   npx wrangler deploy
   npx wrangler secret put GITHUB_OAUTH_SECRET   # paste the secret
   ```

## Step 3 — Point the CMS at the broker

In `admin/config.yml`, under `backend:`:

```yaml
backend:
  name: github
  repo: vidic-igor/teska-prica
  branch: main
  base_url: https://teska-prica-auth.igor-vidic92.workers.dev
```

Push, wait for the build, then log in at `/admin` and confirm a test edit
commits to GitHub.

This also changes `/admin` on the old Netlify site. To keep both working, add
the `*.netlify.app` origin to `SITE_ORIGINS` in `worker/wrangler.toml` and
redeploy the broker.

## Step 4 — Move the booking form

Netlify Forms only works on Netlify. Do this last and verify a real submission
arrives.

1. Get a free access key at <https://web3forms.com>. 250 submissions a month.
2. In `app.jsx`, in `Booking`'s `submit`, replace the `fetch('/', ...)` with a
   POST to `https://api.web3forms.com/submit`, sending `access_key` plus the
   form fields as JSON, and treat `data.success === false` as an error.
3. Delete the hidden `<form name="booking" data-netlify="true">` block from
   `index.html`.

## Step 5 — Tear down

Once the above is verified, and not before:

- Delete `netlify.toml`.
- Delete the Netlify site, and remove its origin from `SITE_ORIGINS`.

## Later — when the domain is bought

1. Add the domain in the Cloudflare dashboard and change the nameservers at the
   registrar.
2. Worker → **Settings → Domains & Routes** → add the apex and `www`.
3. **Rules → Redirect Rules** for `www` to apex, 301.
4. Give the broker the custom domain `auth.<domain>`, then update `base_url` in
   `admin/config.yml`, `SITE_ORIGINS`, and the GitHub OAuth App callback URL.
5. Update the canonical URL and the JSON-LD block in `index.html`, plus
   `sitemap.xml`, which already claim `https://teskaprica.rs/`.

# Moving the prototype from Netlify to Cloudflare Pages

## Why

Netlify's free plan gives 300 credits a month and charges 15 per production
deploy, so we get 20. We pushed 22 commits in the last 30 days, which is why
deploys are blocked. Every edit the band makes in `/admin` is a commit and so
another deploy, so this ceiling gets hit every month.

Cloudflare Pages' free tier allows 500 builds a month, with unlimited bandwidth
and unlimited static requests.

There is no domain yet. The site runs on a Netlify subdomain and will run on a
`*.pages.dev` subdomain instead, so there is no DNS, no registrar and no
cutover. Buying a domain later is a separate, small job (see the last section).

## What depends on Netlify

| Piece | How |
|---|---|
| Hosting + redirects | `netlify.toml` |
| Booking form | Netlify Forms: hidden `<form data-netlify>` in `index.html`, `app.jsx` POSTs to `/` |
| `/admin` login | Decap's `github` backend with no `base_url`, so it silently uses Netlify's OAuth broker at `api.netlify.com` |

The last one is the trap: CMS login breaks off Netlify even though the backend
is `github` and not `git-gateway`.

## Already in the repo

Additive. `npm run build` is unchanged and the Netlify site keeps working.

- `build.js` + `npm run build:cloudflare` — builds `dist/`, holding only the 31
  files the public should see. Publishing from the repo root, which is what
  Netlify does, also serves `app.jsx`, `package.json` and
  `docs/superpowers/plans/*.md`. `dist/app.js` is byte-identical to the root
  `app.js` the Netlify build produces.
- `_redirects` — carries over the `/admin` rewrite.
- `worker/` — our own GitHub OAuth broker, replacing `api.netlify.com`.

## Step 1 — Put the site on Cloudflare Pages

Nothing here touches Netlify.

1. Sign up at <https://dash.cloudflare.com> if you have no account. Free plan,
   no card.
2. **Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub,
   pick `vidic-igor/teska-prica`.
3. Settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Build command | `npm run build:cloudflare` |
   | Build output directory | `dist` |

4. Deploy. The site comes up at `https://teska-prica.pages.dev`.

Everything works at this point except `/admin` login and the booking form.

## Step 2 — Deploy the OAuth broker

Only needed so the band can use `/admin`.

1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**.
   Not GitHub Apps: a client id starting `Ov23li` means the wrong type.
   - Homepage URL: `https://teska-prica.pages.dev`
   - Authorization callback URL: leave a placeholder for now, fixed in step 4.
2. Copy the client id into `worker/wrangler.toml` as `GITHUB_OAUTH_ID`.
3. Generate a client secret and keep the tab open.
4. Deploy:

   ```bash
   cd worker
   npx wrangler deploy
   npx wrangler secret put GITHUB_OAUTH_SECRET   # paste the secret
   ```

   The first `wrangler deploy` opens a browser to log in and asks you to pick a
   `workers.dev` subdomain. The Worker ends up at
   `https://teska-prica-auth.<your-subdomain>.workers.dev`.

5. Go back to the GitHub OAuth App and set the callback URL to that Worker URL
   with `/callback` on the end.

## Step 3 — Point the CMS at the broker

In `admin/config.yml`, under `backend:`, add the Worker's base URL with no
trailing slash and no path:

```yaml
backend:
  name: github
  repo: vidic-igor/teska-prica
  branch: main
  base_url: https://teska-prica-auth.<your-subdomain>.workers.dev
```

Push, wait for the Pages build, then log in at `/admin` on the pages.dev site
and confirm a test edit commits to GitHub.

This also changes `/admin` on the old Netlify site. To keep both working, add
the `*.netlify.app` origin to `SITE_ORIGINS` in `worker/wrangler.toml` and
redeploy the Worker.

## Step 4 — Move the booking form

Netlify Forms only works on Netlify, so this has to move. Do it last and verify
a real submission arrives.

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

1. Put the domain on Cloudflare (add it in the dashboard, change the
   nameservers at the registrar).
2. Pages project → **Custom domains** → add the apex and `www`.
3. **Rules → Redirect Rules** for `www` to apex, 301. `_redirects` cannot do it
   because it cannot match on hostname.
4. Give the Worker the custom domain `auth.<domain>`, update `base_url` in
   `admin/config.yml`, `SITE_ORIGINS`, and the GitHub OAuth App callback URL.
5. Update the canonical URL and the JSON-LD block in `index.html`, which
   already claim `https://teskaprica.rs/`.

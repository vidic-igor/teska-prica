# Moving off Netlify to Cloudflare Pages

## Why

Netlify's Free plan is 300 credits/month and a production deploy costs 15
credits, so the site gets 20 deploys a month. We pushed 22 commits in the last
30 days, which is why deploys are blocked. Every edit the band makes in `/admin`
is a GitHub commit, which is another deploy, so this ceiling gets hit every
month.

Cloudflare Pages' free tier allows 500 builds/month, unlimited bandwidth and
unlimited static requests. Nothing pauses when we deploy a lot.

## What depends on Netlify today

| Piece | How it depends on Netlify |
|---|---|
| Hosting + redirects | `netlify.toml` |
| Booking form | Netlify Forms: hidden `<form data-netlify>` in `index.html`, `app.jsx` POSTs to `/` |
| `/admin` login | Decap's `github` backend with no `base_url`, so it silently uses Netlify's OAuth broker at `api.netlify.com` |

That last one is the trap: CMS login breaks off-Netlify even though the backend
is `github` and not `git-gateway`.

## What is already in the repo

These are additive. The live Netlify site is untouched and `npm run build` still
behaves exactly as before.

- `build.js` + `npm run build:cloudflare` — builds `dist/`, which contains only
  the 31 files the public should see. Publishing from the repo root (what
  Netlify does) also serves `app.jsx`, `package.json` and
  `docs/superpowers/plans/*.md`. `dist/app.js` is byte-identical to the root
  `app.js` that Netlify builds.
- `_redirects` — the Cloudflare Pages equivalent of the `/admin` rewrite.
- `worker/` — our own GitHub OAuth broker for Decap, replacing `api.netlify.com`.

## Migration

Nothing below takes the live site down. DNS keeps pointing at Netlify until
step 5, and step 5 is reversible in a minute.

### 1. Add the domain to Cloudflare (no cutover yet)

1. Cloudflare dashboard → **Add a domain** → `teskaprica.rs`, Free plan.
2. Let it import the existing DNS records. Check that the records still point at
   Netlify before continuing.
3. At the registrar, change the nameservers to the two Cloudflare gives you.

Traffic still resolves to Netlify throughout. Propagation takes up to 24h.

### 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
`vidic-igor/teska-prica`.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build:cloudflare` |
| Build output directory | `dist` |

It deploys to `teska-prica.pages.dev`. Check the site there. No custom domain
yet, so the live site is unaffected.

### 3. Deploy the OAuth broker

The band's `/admin` login needs this before the domain moves.

1. GitHub → Settings → Developer settings → **OAuth Apps** (not GitHub Apps —
   a client id starting `Ov23li` means you made the wrong type).
   Use the existing app if there is one.
   - Homepage URL: `https://teskaprica.rs`
   - Authorization callback URL: `https://auth.teskaprica.rs/callback`
2. Put the client id in `worker/wrangler.toml` as `GITHUB_OAUTH_ID`.
3. Deploy and set the secret:

   ```bash
   cd worker
   npx wrangler deploy
   npx wrangler secret put GITHUB_OAUTH_SECRET
   ```

4. Workers & Pages → `teska-prica-auth` → Settings → **Domains & Routes** → add
   the custom domain `auth.teskaprica.rs`. (Needs step 1 finished.)

`SITE_ORIGINS` in `wrangler.toml` lists both `https://teskaprica.rs` and
`https://teska-prica.pages.dev`, so CMS login works on the live site and on the
Pages preview at the same time.

### 4. Point the CMS at the broker

This one line can land while the site is still on Netlify, and it works on both
hosts. Revert it to fall back to Netlify's broker.

In `admin/config.yml`, under `backend:`:

```yaml
  base_url: https://auth.teskaprica.rs
```

Then log in at `/admin` on the live site and confirm a test edit commits.

### 5. Cut the domain over

Cloudflare → Pages project → **Custom domains** → add `teskaprica.rs` and
`www.teskaprica.rs`. Cloudflare updates the DNS record for you.

To replace the `www` → apex redirect from `netlify.toml`: Cloudflare → the
domain → **Rules → Redirect Rules** → `www.teskaprica.rs/*` → `https://teskaprica.rs/$1`,
301. `_redirects` cannot do it, because it cannot match on hostname.

Rollback: point the DNS record back at Netlify.

### 6. Move the booking form

Netlify Forms dies with the move, so do this last and verify a real submission
arrives.

1. Get a free access key at <https://web3forms.com> (250 submissions/month).
2. In `app.jsx`, replace the `fetch('/', ...)` in `Booking`'s `submit` with a
   POST to `https://api.web3forms.com/submit`, sending `access_key` plus the
   form fields as JSON, and treat `data.success === false` as an error.
3. Delete the hidden `<form name="booking" data-netlify="true">` block from
   `index.html`.

### 7. Tear down

Once everything above is verified, and not before:

- Delete `netlify.toml`.
- Remove `https://teska-prica.pages.dev` from `SITE_ORIGINS` and redeploy the
  Worker.
- Delete the Netlify site.

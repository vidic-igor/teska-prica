/*
 * GitHub OAuth broker for Decap CMS.
 *
 * Decap's `github` backend needs a server to hold the OAuth client secret and
 * swap the authorization code for a token. Netlify did this for us at
 * api.netlify.com, which only works while the site is hosted on Netlify.
 * This Worker replaces it.
 *
 * Routes:
 *   GET /auth?provider=github      -> redirect into GitHub's consent screen
 *   GET /callback?provider=github  -> exchange the code, hand the token to the CMS
 *
 * The token goes back to the CMS tab via postMessage, pinned to an origin from
 * SITE_ORIGINS rather than "*", so no other page can pick it up. The list holds
 * more than one entry during the migration, so /admin keeps working on the live
 * Netlify site and on the Cloudflare Pages preview at the same time.
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_COOKIE = 'decap_oauth_state';

const allowedOrigins = (env) =>
  (env.SITE_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

const htmlResponse = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const randomState = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const readCookie = (request, name) => {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
};

/* Both values are hex of the same length; compare without an early exit. */
const sameState = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/* Embed a value as a JS literal without letting it close the <script>. */
const jsLiteral = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

function handshakePage(message, origins) {
  return htmlResponse(`<!doctype html>
<html lang="sr">
<head><meta charset="utf-8" /><title>Decap CMS</title></head>
<body>
<p>Prijava u toku…</p>
<script>
(function () {
  var message = ${jsLiteral(message)};
  var origins = ${jsLiteral(origins)};
  if (!window.opener) {
    document.body.textContent = 'Otvorite ovu stranicu iz CMS-a.';
    return;
  }
  function receive(event) {
    if (origins.indexOf(event.origin) === -1) return;
    window.removeEventListener('message', receive, false);
    window.opener.postMessage(message, event.origin);
  }
  window.addEventListener('message', receive, false);
  origins.forEach(function (origin) {
    window.opener.postMessage('authorizing:github', origin);
  });
})();
</script>
</body>
</html>`);
}

function handleAuth(env, url) {
  const state = randomState();

  const authorize = new URL(AUTHORIZE_URL);
  authorize.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/callback?provider=github`);
  authorize.searchParams.set('scope', env.GITHUB_SCOPE || 'public_repo,user');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'cache-control': 'no-store',
      'set-cookie': `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function handleCallback(request, env, url) {
  const origins = allowedOrigins(env);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return htmlResponse('<p>Missing code.</p>', 400);
  if (!sameState(state, readCookie(request, STATE_COOKIE))) {
    return htmlResponse('<p>Invalid state. Start the login again.</p>', 400);
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'teska-prica-auth',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
      redirect_uri: `${url.origin}/callback?provider=github`,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    const reason = data.error_description || data.error || 'token exchange failed';
    return handshakePage(
      `authorization:github:error:${JSON.stringify({ message: reason })}`,
      origins,
    );
  }

  const payload = JSON.stringify({ token: data.access_token, provider: 'github' });
  const page = handshakePage(`authorization:github:success:${payload}`, origins);

  /* Burn the state cookie now that it has been used. */
  page.headers.append(
    'set-cookie',
    `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return page;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (url.searchParams.get('provider') !== 'github') {
      return new Response('Unsupported provider', { status: 400 });
    }

    if (url.pathname === '/auth') return handleAuth(env, url);
    if (url.pathname === '/callback') return handleCallback(request, env, url);

    return new Response('Not found', { status: 404 });
  },
};

// OttoTHON editor sign-in helper (a Cloudflare Worker). No dependencies.
//
// What it does: lets people who are allowed by Cloudflare Access (Google sign-in) use the editor
// at /admin WITHOUT having a GitHub account. After Cloudflare Access has checked who they are,
// this Worker hands the editor one shared GitHub "bot" token, so edits are saved as commits by that bot.
//
// Safety: the bot token is only ever sent to someone carrying a valid, unexpired Cloudflare Access
// login for THIS application. If Access is missing or misconfigured, the Worker refuses (fail closed).
//
// Settings (wrangler.toml [vars]): TEAM_DOMAIN, POLICY_AUD, SITE_ORIGIN.   Secret: GITHUB_BOT_TOKEN.

const b64urlToBytes = s => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};
const b64urlToJson = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

const teamHost = env => String(env.TEAM_DOMAIN || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
let certCache = {at: 0, keys: null};
async function accessKeys(env) {
  if (certCache.keys && Date.now() - certCache.at < 3600e3) return certCache.keys;
  const res = await fetch(`https://${teamHost(env)}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Could not load Cloudflare Access keys');
  certCache = {at: Date.now(), keys: (await res.json()).keys || []};
  return certCache.keys;
}

// Returns the signed-in person's email, or throws.
async function verifyAccessJwt(jwt, env, now = Date.now()) {
  const parts = (jwt || '').split('.');
  if (parts.length !== 3) throw new Error('no login');
  const header = b64urlToJson(parts[0]), payload = b64urlToJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('bad algorithm');
  const jwk = (await accessKeys(env)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad signature');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.POLICY_AUD)) throw new Error('wrong application');
  if (payload.iss !== `https://${teamHost(env)}`) throw new Error('wrong issuer');
  if (!payload.exp || payload.exp * 1000 < now) throw new Error('expired');
  if (payload.nbf && payload.nbf * 1000 > now + 60e3) throw new Error('not yet valid');
  return payload.email || '';
}

const page = (body, status = 200) => new Response(body, {status, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer'}});
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');   // safe to place inside a <script>

export default {
  verifyAccessJwt,   // exposed only so test.mjs can call it
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/auth') return page('<p>OttoTHON editor sign-in. Open the editor from the website’s /admin page.</p>');
    const missing = ['GITHUB_BOT_TOKEN', 'TEAM_DOMAIN', 'POLICY_AUD', 'SITE_ORIGIN'].filter(k => !String(env[k] || '').trim());
    if (missing.length) return page(`<p>This sign-in helper is not fully set up yet. Missing setting${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Add ${missing.length > 1 ? 'them' : 'it'} in the Worker's Settings, Variables and Secrets, then deploy again.</p>`, 500);
    let email;
    try { email = await verifyAccessJwt(request.headers.get('cf-access-jwt-assertion'), env); }
    catch (e) { return page('<p>Sign-in was refused. Close this window and try again, or ask an admin to add your Google email.</p>', 403); }

    // The editor (Decap CMS) opened this window. It expects this exact handshake:
    //   1. we say "authorizing:github"   2. it echoes that back   3. we send the token.
    const origins = String(env.SITE_ORIGIN).split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
    const wanted = url.searchParams.get('site_id');
    const site = origins.find(o => { try { return new URL(o).hostname === wanted; } catch (e) { return false; } }) || origins[0];
    const msg = 'authorization:github:success:' + JSON.stringify({token: env.GITHUB_BOT_TOKEN, provider: 'github'});
    return page(`<!doctype html><meta charset="utf-8"><title>Signing in…</title><p>Signing in${email ? ' as ' + email.replace(/[<>&"]/g, '') : ''}…</p>
<script>
(function () {
  var site = ${json(site)}, msg = ${json(msg)};
  window.addEventListener('message', function (e) {
    if (e.origin !== site || e.data !== 'authorizing:github') return;
    window.opener.postMessage(msg, site);
    window.close();
  });
  if (window.opener) window.opener.postMessage('authorizing:github', site);
})();
</script>`);
  }
};

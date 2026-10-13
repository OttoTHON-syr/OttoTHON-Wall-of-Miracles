// Offline tests for the sign-in helper. Run: node cloudflare/editor-auth/test.mjs
import worker from './index.js';
const verifyAccessJwt = worker.verifyAccessJwt;
import assert from 'node:assert/strict';

const env = {TEAM_DOMAIN: 'team.cloudflareaccess.com', POLICY_AUD: 'aud-123', SITE_ORIGIN: 'https://ottothon-syr.github.io', GITHUB_BOT_TOKEN: 'ghp_SECRETBOTTOKEN'};
const b64u = b => Buffer.from(b).toString('base64url');
const pair = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const jwk = {...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig'};
globalThis.fetch = async u => { assert.equal(String(u), 'https://team.cloudflareaccess.com/cdn-cgi/access/certs'); return new Response(JSON.stringify({keys: [jwk]})); };

async function jwt(over = {}, signer = pair.privateKey, kid = 'k1') {
  const h = b64u(JSON.stringify({alg: 'RS256', kid, typ: 'JWT'}));
  const p = b64u(JSON.stringify({aud: ['aud-123'], iss: 'https://team.cloudflareaccess.com', email: 'editor@gmail.com', exp: Math.floor(Date.now() / 1000) + 600, ...over}));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(Buffer.from(sig))}`;
}
const call = (path, token) => worker.fetch(new Request('https://helper.example' + path, {headers: token ? {'cf-access-jwt-assertion': token} : {}}), env);

// valid login -> token handshake page
let r = await call('/auth', await jwt());
let html = await r.text();
assert.equal(r.status, 200); assert.ok(html.includes('ghp_SECRETBOTTOKEN')); assert.ok(html.includes('authorizing:github'));
assert.ok(html.includes('https://ottothon-syr.github.io')); assert.equal(r.headers.get('cache-control'), 'no-store');
assert.equal(await verifyAccessJwt(await jwt(), env), 'editor@gmail.com');

// everything else is refused, and never leaks the token
const bad = {
  'no login': undefined,
  'garbage': 'a.b.c',
  'wrong audience': await jwt({aud: ['someone-else']}),
  'wrong issuer': await jwt({iss: 'https://evil.example'}),
  'expired': await jwt({exp: Math.floor(Date.now() / 1000) - 10}),
  'forged signature': await jwt({}, other.privateKey),
  'unknown key id': await jwt({}, pair.privateKey, 'zzz')
};
for (const [name, t] of Object.entries(bad)) {
  r = await call('/auth', t); html = await r.text();
  assert.equal(r.status, 403, name); assert.ok(!html.includes('ghp_SECRETBOTTOKEN'), name + ' leaked the token');
}
// TEAM_DOMAIN pasted with https:// and a trailing slash still works
r = await worker.fetch(new Request('https://helper.example/auth', {headers: {'cf-access-jwt-assertion': await jwt()}}), {...env, TEAM_DOMAIN: 'https://team.cloudflareaccess.com/'});
assert.equal(r.status, 200);
// misconfigured -> refuses
r = await worker.fetch(new Request('https://helper.example/auth', {headers: {'cf-access-jwt-assertion': await jwt()}}), {...env, GITHUB_BOT_TOKEN: ''});
assert.equal(r.status, 500);
// other paths show no token
r = await call('/', await jwt()); assert.ok(!(await r.text()).includes('ghp_'));
console.log('All sign-in helper tests passed.');

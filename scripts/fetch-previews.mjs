// Looks up the headline, outlet, date and a short summary for every news link on a published story,
// and saves them to content/article-previews.json so the site can show a link card. No dependencies.
//
//   node scripts/fetch-previews.mjs            fetch anything new (and retry failures older than a week)
//   node scripts/fetch-previews.mjs --force    fetch everything again
//
// It only reads the page's own preview tags (the ones sites publish so links look good when shared).
// It never copies article text or pictures. A site that blocks the request just gets a plain link card.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const STORIES = arg('--stories') || join(root, 'content', 'stories.json');
const OUT = arg('--out') || join(root, 'content', 'article-previews.json');
const FORCE = args.includes('--force');
const NOW = arg('--now') ? new Date(arg('--now')) : new Date();
const ALLOW_LOCAL = process.env.PREVIEW_ALLOW_LOCAL === '1';      // for tests only
const RETRY_DAYS = 7, TIMEOUT_MS = 15000, MAX_BYTES = 400000, MAX_REDIRECTS = 5;
const UA = 'Mozilla/5.0 (compatible; OttoTHONLinkPreview/1.0; +https://ottothon-syr.github.io/OttoTHON-Wall-of-Miracles/)';

// ---------- keep the fetcher away from private networks ----------
function privateIp(ip) {
  if (ip.includes(':')) { const x = ip.toLowerCase(); return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || (x.startsWith('::ffff:') && privateIp(x.slice(7))); }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
async function checkUrl(u) {
  const url = new URL(u);
  if (ALLOW_LOCAL) return url;
  if (url.protocol !== 'https:') throw new Error('only https links are fetched');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('private address');
  const addrs = isIP(host) ? [{address: host}] : await lookup(host, {all: true});
  if (addrs.some(a => privateIp(a.address))) throw new Error('private address');
  return url;
}

// ---------- tiny HTML helpers ----------
const NAMED = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…'};
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return NAMED[e.toLowerCase()] ?? m;
});
const clean = (s, max) => { const t = decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t; };
function metas(html) {
  const out = {};
  for (const m of html.matchAll(/<meta\s+([^>]*?)\/?>/gi)) {
    const a = {};
    for (const x of m[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[x[1].toLowerCase()] = x[2] ?? x[3];
    const key = (a.property || a.name || '').toLowerCase();
    if (key && a.content != null && !(key in out)) out[key] = a.content;
  }
  return out;
}
export function parsePreview(html, url) {
  const m = metas(html), titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const host = new URL(url).hostname.replace(/^www\./, '');
  const title = clean(m['og:title'] || m['twitter:title'] || titleTag, 200);
  const date = ((m['article:published_time'] || m['og:article:published_time'] || m['date'] || m['pubdate'] || '').match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  return {ok: !!title, title, outlet: clean(m['og:site_name'] || m['application-name'], 80) || host,
    description: clean(m['og:description'] || m['description'] || m['twitter:description'], 260), date};
}

// ---------- fetching ----------
async function fetchHead(u) {
  let url = await checkUrl(u);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {redirect: 'manual', headers: {'user-agent': UA, accept: 'text/html,application/xhtml+xml'}, signal: AbortSignal.timeout(TIMEOUT_MS)});
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = await checkUrl(new URL(res.headers.get('location'), url).href); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/html/i.test(res.headers.get('content-type') || '')) throw new Error('not a web page');
    const reader = res.body.getReader(), dec = new TextDecoder('utf-8'); let buf = '', n = 0;
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      n += value.length; buf += dec.decode(value, {stream: true});
      if (/<\/head>/i.test(buf) || n > MAX_BYTES) { try { await reader.cancel(); } catch (e) { /* done */ } break; }
    }
    return buf;
  }
  throw new Error('too many redirects');
}

async function main() {
  const stories = existsSync(STORIES) ? JSON.parse(readFileSync(STORIES, 'utf8')) : {items: []};
  const wanted = [...new Set((stories.items || []).filter(s => s && s.published === true)
    .flatMap(s => (Array.isArray(s.articles) ? s.articles : [])).map(a => String((a && a.url) || '').trim()).filter(u => /^https?:\/\/\S+$/i.test(u)))];
  const old = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).items || {}) : {};
  const items = {};
  let fetched = 0, failed = 0;
  for (const u of wanted) {
    const prev = old[u], age = prev ? (NOW - new Date(prev.fetchedAt)) / 864e5 : Infinity;
    if (!FORCE && prev && (prev.ok || age < RETRY_DAYS)) { items[u] = prev; continue; }
    try { items[u] = {...parsePreview(await fetchHead(u), u), fetchedAt: NOW.toISOString()}; if (!items[u].ok) { items[u].error = 'no headline found'; failed++; } else fetched++; }
    catch (e) { items[u] = {ok: false, error: String(e.message || e).slice(0, 120), fetchedAt: NOW.toISOString()}; failed++; }
    console.log(`${items[u].ok ? 'ok    ' : 'failed'} ${u}${items[u].ok ? '' : '  (' + items[u].error + ')'}`);
  }
  const same = JSON.stringify(items) === JSON.stringify(old);
  if (same) { console.log(`No changes (${wanted.length} link(s) checked).`); return; }
  writeFileSync(OUT, JSON.stringify({updatedAt: NOW.toISOString(), items}, null, 2) + '\n');
  console.log(`Saved previews for ${Object.keys(items).length} link(s): ${fetched} new, ${failed} could not be read (those show as plain link cards).`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error('error:', e.message); process.exit(1); });

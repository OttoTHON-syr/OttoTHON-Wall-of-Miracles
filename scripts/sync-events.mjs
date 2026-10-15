// Pulls OttoTHON's events from the Syracuse University campus calendar feed and saves them to
// content/events-feed.json. No dependencies (needs Node 18+). The sync workflow runs this once a day.
//
//   node scripts/sync-events.mjs                  fetch the live feed
//   node scripts/sync-events.mjs --file feed.xml  read a saved copy instead (for testing)
//
// The feed lists EVERY public student event on campus, so we keep only events hosted by OttoTHON.
// If the feed can't be fetched, this exits with an error and leaves the last good copy untouched.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEED_URL = 'https://cuseactivities.syr.edu/organization/ottothon-at-syracuse-university/events.rss';
const MATCH = /ottothon/i;               // matches the host name or the organizer email
const TIME_ZONE = 'America/New_York';
const KEEP_PAST = 60;                    // how many finished events to remember for "Where we've been"
const MAX_DESC = 400;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const OUT = arg('--out') || join(root, 'content', 'events-feed.json');
const NOW = arg('--now') ? new Date(arg('--now')) : new Date();

// ---------- tiny XML helpers ----------
const NAMED = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', eacute: 'é', iacute: 'í', aacute: 'á', oacute: 'ó', uacute: 'ú', ntilde: 'ñ'};
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return NAMED[e.toLowerCase()] ?? m;
});
const unCdata = s => { const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/); return m ? m[1] : decode(s); };
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g'))].map(m => unCdata(m[1]).trim());
const tag = (xml, name) => tags(xml, name)[0] || '';
const clean = s => decode(s.replace(/<(br|\/p|\/li|\/div|\/h\d|p|li|div)\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function description(item) {
  const m = item.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/);
  if (!m) return '';
  let html = m[1];
  const cut = html.search(/<div>\s*<p>\s*From\s*<time/);       // the feed appends a "From … to … at …" block
  if (cut > 0) html = html.slice(0, cut);
  html = html.replace(/<div class="p-name summary">[\s\S]*?<\/div>/, '');
  const text = clean(html);
  return text.length > MAX_DESC ? text.slice(0, MAX_DESC).replace(/\s+\S*$/, '') + '…' : text;
}

// ---------- time helpers (the feed gives UTC; the site shows Syracuse time) ----------
const part = (d, opts) => new Intl.DateTimeFormat('en-US', {timeZone: TIME_ZONE, ...opts}).format(d);
const localDate = d => new Intl.DateTimeFormat('en-CA', {timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
const clock = d => part(d, {hour: 'numeric', minute: '2-digit'});
function timeLabel(start, end) {
  const s = clock(start), e = end ? clock(end) : '';
  const sameDay = end && localDate(start) === localDate(end);
  if (sameDay && s === '12:00 AM' && (e === '11:59 PM' || e === '12:00 AM')) return 'All day';
  return sameDay && e ? `${s} – ${e}` : s;
}

// ---------- category (drives the color and icon on the Events page) ----------
function categorize(title, feedCats) {
  const text = `${title} ${feedCats.join(' ')}`;
  if (/meeting|general body|captains|committee/i.test(text)) return 'meeting';
  if (/fundrais|sale|bake|raffle|donat|pie |marathon|walk|dance/i.test(text)) return 'fundraiser';
  if (/volunt|communit|service|hospital|golisano|visit/i.test(text)) return 'community';
  if (/social|party|mixer|reveal|night|game|bonding|trivia|paint/i.test(text)) return 'social';
  return 'other';
}

// ---------- parse ----------
export function parseFeed(xml) {
  if (!/<rss[\s>]/.test(xml)) throw new Error('That does not look like an RSS feed.');
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1];
    const hosts = tags(item, 'host'), author = tag(item, 'author');
    if (![...hosts, author].some(h => MATCH.test(h))) continue;           // not ours
    if (/^cancel/i.test(tag(item, 'status'))) continue;                    // cancelled
    const title = tag(item, 'title').replace(/\s+/g, ' ').trim();
    const start = new Date(tag(item, 'start')), end = tag(item, 'end') ? new Date(tag(item, 'end')) : null;
    const link = tag(item, 'link');
    if (!title || Number.isNaN(start.getTime())) continue;
    out.push({
      id: tag(item, 'guid') || link || `${title}|${start.toISOString()}`,
      title, date: localDate(start), start: start.toISOString(), end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : '',
      category: categorize(title, tags(item, 'category')), feedCategory: tags(item, 'category').join(', '),
      timeLabel: timeLabel(start, end && !Number.isNaN(end.getTime()) ? end : null),
      place: tag(item, 'location').replace(/\s+/g, ' ').trim(),
      desc: description(item),
      link: /^https:\/\//.test(link) ? link : '',
      host: hosts.filter(h => MATCH.test(h))[0] || ''
    });
  }
  return out;
}

// Merge: everything in today's feed, plus finished events we saw before (the feed only looks ahead).
// An upcoming event that disappeared from the feed was cancelled or deleted, so it is dropped.
export function merge(oldItems, fresh, now = NOW) {
  const ids = new Set(fresh.map(x => x.id));
  const finished = x => new Date(x.end || x.start) < now;
  const kept = oldItems.filter(x => x && !ids.has(x.id) && finished(x));
  const all = [...fresh, ...kept].sort((a, b) => a.start.localeCompare(b.start));
  const past = all.filter(finished), upcoming = all.filter(x => !finished(x));
  return [...past.slice(-KEEP_PAST), ...upcoming];
}

// ---------- run ----------
async function main() {
  let xml;
  const file = arg('--file');
  if (file) xml = readFileSync(file, 'utf8');
  else {
    const res = await fetch(FEED_URL, {headers: {'user-agent': 'ottothon-site-sync (github actions)', accept: 'application/rss+xml, application/xml'}, signal: AbortSignal.timeout(30000)});
    if (!res.ok) throw new Error(`The feed answered ${res.status}. Keeping the last good copy.`);
    xml = await res.text();
  }
  const fresh = parseFeed(xml);
  const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {items: []};
  const items = merge(Array.isArray(old.items) ? old.items : [], fresh);
  if (JSON.stringify(items) === JSON.stringify(old.items || [])) { console.log(`No changes (${items.length} OttoTHON event(s) in the feed copy).`); return; }
  writeFileSync(OUT, JSON.stringify({syncedAt: NOW.toISOString(), source: FEED_URL, items}, null, 2) + '\n');
  console.log(`Saved ${items.length} OttoTHON event(s) (${fresh.length} from today's feed).`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error('error:', e.message); process.exit(1); });

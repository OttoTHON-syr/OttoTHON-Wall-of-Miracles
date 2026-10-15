// Checks everything in /content before the site is published. No dependencies.
// Run it yourself:  node scripts/validate-content.mjs
// The deploy workflow runs it too, so a typo in a content file can never take the live site down.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

const PALETTES = ['classic', 'powder', 'hydrangea', 'seaglass', 'lavender'];
const FONTS = ['lookbook', 'soft', 'clean'];
const SECTIONS = ['stories', 'wed', 'impact'];
const CATEGORIES = ['Hospital moments', 'Family', 'Community', 'Fundraiser'];

function read(name) {
  const path = join(root, 'content', `${name}.json`);
  if (!existsSync(path)) { err(`content/${name}.json is missing.`); return null; }
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { err(`content/${name}.json is not valid JSON (${e.message}). Undo the last edit to this file.`); return null; }
}
const isStr = v => typeof v === 'string';
const urlOk = v => !v || /^(https?:\/\/\S+|mailto:\S+)$/i.test(v);
const dateOk = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));
function imageOk(where, v) {
  if (!v) return;
  if (v.includes('#')) {   // the editor's focus box adds "#focus=45,25" to the photo path
    const [path, frag] = v.split('#');
    const m = /^focus=(\d{1,3}(?:\.\d+)?),(\d{1,3}(?:\.\d+)?)$/.exec(frag);
    if (!m || +m[1] > 100 || +m[2] > 100) err(`${where}: the photo focus "#${frag}" is not valid. Use the focus box in the editor, or remove everything from the # onward.`);
    v = path;
  }
  if (!/^assets\/[\w\-. /]+$/.test(v) || v.includes('..')) return err(`${where}: image path "${v}" must start with assets/ (use the Upload button in the editor).`);
  if (!existsSync(join(root, v))) err(`${where}: image "${v}" does not exist in the repository.`);
}

// ---- lists ----
const LISTS = {
  kids:       {req: ['name', 'story'], images: ['photo'], consent: true},
  stories:    {req: ['title', 'story', 'date'], images: ['photo'], consent: true, dates: ['date']},
  wednesdays: {req: ['title', 'author', 'body', 'date'], dates: ['date']},
  board:      {req: ['name', 'role'], images: ['photo'], urls: ['link']},
  events:     {req: ['title', 'date'], dates: ['date'], urls: ['link'], images: ['photo']},
  'past-events': {req: ['title', 'date'], dates: ['date'], urls: ['link'], images: ['photo']},
  ways:       {req: ['title'], urls: ['link']},
  faq:        {req: ['question', 'answer']}
};
// the same video links the website knows how to embed
const VIDEO_OK = [/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=[\w-]{6,15}/i, /^https:\/\/youtu\.be\/[\w-]{6,15}/i, /^https:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts|live)\/[\w-]{6,15}/i,
  /^https:\/\/(?:www\.)?vimeo\.com\/\d{5,12}/i, /^https:\/\/player\.vimeo\.com\/video\/\d{5,12}/i];
let unapproved = 0;
for (const [name, rule] of Object.entries(LISTS)) {
  const data = read(name); if (!data) continue;
  if (!Array.isArray(data.items)) { err(`content/${name}.json must look like {"items": [ ... ]}.`); continue; }
  data.items.forEach((x, i) => {
    const where = `${name}[${i + 1}]${x && x.name ? ` "${x.name}"` : x && x.title ? ` "${x.title}"` : ''}`;
    if (!x || typeof x !== 'object') return err(`${where}: not an entry.`);
    if (typeof x.published !== 'boolean') err(`${where}: "published" must be true or false.`);
    for (const f of rule.images || []) imageOk(`${where}.${f}`, x[f]);
    if (rule.images && x.focus && !/^(\s*(left|right|top|bottom|center|middle)[\s,/-]*)+$/i.test(x.focus) && !/^\s*\d{1,3}(\.\d+)?\s*[, ]\s*\d{1,3}(\.\d+)?\s*$/.test(x.focus)) err(`${where}.focus: "${x.focus}" is not understood. Use words like left, right, top, bottom, or two numbers like 45,25.`);
    if (rule.images && x.focus && /^\s*\d/.test(x.focus)) { const m = String(x.focus).match(/\d+(\.\d+)?/g) || []; if (m.some(n => Number(n) > 100)) err(`${where}.focus: numbers must be between 0 and 100.`); }
    if (rule.images) for (const f of ['focusX', 'focusY']) if (x[f] !== undefined && x[f] !== '' && x[f] !== null && !(Number.isFinite(Number(x[f])) && Number(x[f]) >= 0 && Number(x[f]) <= 100)) err(`${where}.${f}: "${x[f]}" must be a number from 0 to 100.`);
    for (const f of rule.urls || []) if (!urlOk(x[f])) err(`${where}.${f}: "${x[f]}" must start with https:// (or mailto:).`);
    for (const f of rule.dates || []) if (x.published && !dateOk(x[f])) err(`${where}.${f}: "${x[f]}" is not a date like 2026-10-14.`);
    if (x.published) for (const f of rule.req) if (!isStr(x[f]) || !x[f].trim()) err(`${where} is published but "${f}" is empty.`);
    if (name === 'stories' && x.published && !CATEGORIES.includes(x.category)) warn(`${where}: category "${x.category}" is not one of ${CATEGORIES.join(', ')}.`);
    if (name === 'stories') {
      if (x.articles !== undefined && !Array.isArray(x.articles)) err(`${where}.articles must be a list.`);
      (Array.isArray(x.articles) ? x.articles : []).forEach((a, j) => {
        if (!a || !/^https:\/\/\S+$/i.test(a.url || '')) err(`${where}.articles[${j + 1}]: the article link must start with https://.`);
        else if (a.date && !dateOk(a.date)) err(`${where}.articles[${j + 1}].date: "${a.date}" is not a date like 2026-10-14.`);
      });
      if (x.video && !VIDEO_OK.some(re => re.test(String(x.video).trim()))) err(`${where}.video: "${x.video}" is not a YouTube or Vimeo link. Only those can play on the page. Put other sites under News articles.`);
    }
    if (rule.consent) {
      if (typeof x.approved !== 'boolean') err(`${where}: "approved" must be true or false.`);
      if (x.published && !x.approved) warn(`${where} is marked "show" but family approval is not ticked, so it stays hidden.`);
      if (!x.approved) unapproved++;
    }
  });
}
if (unapproved) warn(`${unapproved} kid/story entries are not approved. This repository is public, so anything saved here can be read by anyone. Only enter a child's story after the family approves.`);

// ---- event categories ----
for (const fname of ['events', 'past-events']) {
const evs = read(fname);
if (evs && Array.isArray(evs.items)) evs.items.forEach((x, i) => {
  if (x && x.category && !['fundraiser', 'meeting', 'social', 'community', 'other'].includes(x.category)) err(`${fname}[${i + 1}] "${x.title}": category must be fundraiser, meeting, social, community, or other.`);
});
}

// ---- board layout fields ----
const board = read('board');
if (board && Array.isArray(board.items)) {
  board.items.forEach((x, i) => {
    if (!x) return;
    const where = `board[${i + 1}]${x.name ? ` "${x.name}"` : ''}`;
    if (x.tier !== undefined && !['executive', 'director', 'team'].includes(x.tier)) err(`${where}: "tier" must be executive, director, or team.`);
    if (x.email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(x.email)) err(`${where}: email "${x.email}" does not look like an email address.`);
    if (x.published && x.tier === 'team' && !String(x.team || '').trim()) warn(`${where} is a team member with no team, so they are listed under "More of the team".`);
  });
}

// ---- news link previews (written by scripts/fetch-previews.mjs; optional) ----
if (existsSync(join(root, 'content', 'article-previews.json'))) {
  const pv = read('article-previews');
  if (pv && (typeof pv.items !== 'object' || pv.items === null || Array.isArray(pv.items))) err('content/article-previews.json must have an "items" object. Re-run the previews workflow.');
}

// ---- settings ----
const s = read('settings');
if (s) {
  const need = ['links', 'photos', 'home', 'wall', 'team', 'events', 'involve', 'about', 'footer', 'nav', 'theme'];
  for (const k of need) if (!s[k] || typeof s[k] !== 'object') err(`content/settings.json is missing "${k}".`);
  if (s.theme) {
    if (!PALETTES.includes(s.theme.palette)) err(`settings.theme.palette must be one of: ${PALETTES.join(', ')}.`);
    if (!FONTS.includes(s.theme.font)) err(`settings.theme.font must be one of: ${FONTS.join(', ')}.`);
    if (s.theme.photoFrame && !['square', 'portrait', 'landscape'].includes(s.theme.photoFrame)) err('settings.theme.photoFrame must be square, portrait, or landscape.');
    for (const sec of s.theme.wallSections || []) if (!SECTIONS.includes(sec.key)) err(`settings.theme.wallSections has unknown section "${sec.key}".`);
  }
  if (s.links) {
    if (s.links.hospitalUrl && String(s.links.hospitalUrl).toLowerCase() !== 'none' && !/^https:\/\/\S+$/i.test(s.links.hospitalUrl)) err('settings.links.hospitalUrl must start with https:// (or be empty, or none).');
    for (const f of ['donateUrl', 'registerUrl']) if (!urlOk(s.links[f])) err(`settings.links.${f} must start with https://.`);
    if (!s.links.donateUrl) warn('The Donate link is empty, so Donate buttons are hidden.');
    if (!s.links.registerUrl) warn('The Register link is empty, so Register buttons are hidden.');
  }
  if (s.photos) for (const f of ['heroPhoto', 'wallPhoto']) imageOk(`settings.photos.${f}`, s.photos[f]);
  for (const k of ['stats', 'impact']) if (!Array.isArray(s[k])) err(`settings.${k} must be a list.`);
}

// ---- synced events (written by scripts/sync-events.mjs; optional) ----
if (existsSync(join(root, 'content', 'events-feed.json'))) {
  const f = read('events-feed');
  if (f) {
    if (!Array.isArray(f.items)) err('content/events-feed.json must have an "items" list. Re-run the sync workflow.');
    else f.items.forEach((x, i) => {
      const where = `events-feed[${i + 1}] "${x && x.title}"`;
      if (!x || !isStr(x.title) || !x.title.trim()) err(`${where}: missing title.`);
      else if (!dateOk(x.date)) err(`${where}: bad date "${x.date}".`);
      else if (x.link && !/^https:\/\//.test(x.link)) err(`${where}: link must start with https://.`);
    });
  }
}

for (const w of warnings) console.warn('warning:', w);
for (const e of errors) console.error('error:  ', e);
console.log(errors.length ? `\n${errors.length} problem(s) found. The site was NOT published.` : `\nContent is valid (${warnings.length} warning(s)).`);
process.exit(errors.length ? 1 : 0);

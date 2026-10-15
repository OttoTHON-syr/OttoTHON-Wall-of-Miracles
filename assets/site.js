/* =====================================================================
   OttoTHON site runtime. No libraries, no build step.
   Every page loads the JSON files in /content, then draws itself.
   Content is edited through /admin (Decap CMS) or directly on GitHub.
   ===================================================================== */
'use strict';
const IMG = {logo: 'assets/img/ottothon-logo.jpg', golisano: 'assets/img/golisano-logo.svg'};
const NEWDAISY = 'assets/img/stemless-daisy.png';
const newDaisy = (cls = '') => S.design.daisies ? `<img class="daisy ${cls}" src="${NEWDAISY}" alt="" aria-hidden="true">` : '';
const imgOk = u => /^(assets\/[\w\-. \/]+|https:\/\/)/i.test(u || '') && !/\.\./.test(u) ? u : '';
document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs id="defs"></defs></svg>');
let S;
const ui = {turn: 0, cat: 'All', wedI: 0, preview: false, page: document.body.dataset.page || 'home'};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The hospital's website. Mentions of its name become links (the first mention in each block of text).
// Set under Words and links; type "none" there to turn the links off.
const HOSP_DEFAULT = 'https://www.upstate.edu/gch/';
let HOSP = HOSP_DEFAULT;
const linkHosp = html => !HOSP ? html : html.replace(/Upstate Golisano(?: Children(?:’|&#39;|')s Hospital)?/, m => `<a class="inline-link" href="${esc(HOSP)}" target="_blank" rel="noopener noreferrer">${m}</a>`);
const rich = t => linkHosp(esc(t));
const paras = t => { let done = false; return String(t || '').split(/\n\s*\n/).filter(x => x.trim()).map(p => { let h = esc(p.trim()).replace(/\n/g, '<br>'); if (!done && HOSP && h !== (h = linkHosp(h))) done = true; return `<p>${h}</p>`; }).join(''); };
const safeUrl = u => /^(https?:\/\/|mailto:)/i.test((u || '').trim()) ? u.trim() : '';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const dt = s => new Date(s + 'T00:00:00');
const fmt = s => s ? dt(s).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '';
const fmtLong = s => s ? dt(s).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'}) : '';
const mod = (a, n) => ((a % n) + n) % n;
const nextWed = () => { const d = new Date(); while (d.getDay() !== 3) d.setDate(d.getDate() + 1); return ymd(d); };


/* ---------- looks ---------- */
const PAL = {
  classic:   {n:'OttoTHON classic', bg:'#FBF6E9', card:'#FFFFFF', soft:'#C7E0F1', mid:'#93BEE0', ink:'#28456A', ink2:'#4C6B8F', yolk:'#F4C84B', nav:'#15BDEE', pale:'#E8F2FA'},
  powder:    {n:'Powder blue',   bg:'#EAF3FB', card:'#FBFDFF', soft:'#CFE3F5', mid:'#8DB4DE', ink:'#1D3557', ink2:'#46607F', yolk:'#F4C84B'},
  hydrangea: {n:'Hydrangea',     bg:'#EEF0FB', card:'#FCFCFF', soft:'#D5D9F3', mid:'#98A3DE', ink:'#28305E', ink2:'#525A8A', yolk:'#F4C84B'},
  seaglass:  {n:'Sea glass',     bg:'#E8F5F4', card:'#FAFEFD', soft:'#C9E8E5', mid:'#86C3BE', ink:'#1B4A4D', ink2:'#426B6D', yolk:'#F4C84B'},
  lavender:  {n:'Lavender mist', bg:'#F1ECF8', card:'#FDFBFF', soft:'#DDD2F0', mid:'#B19ED9', ink:'#3A2D5C', ink2:'#63558A', yolk:'#F4C84B'}
};
const FONTS = {
  lookbook: {n:'Lookbook serif', display:"'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif", body:"'Avenir Next','Segoe UI',system-ui,-apple-system,sans-serif"},
  soft:     {n:'Soft rounded',   display:"ui-rounded,'Hiragino Maru Gothic ProN','Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif", body:"ui-rounded,'Hiragino Maru Gothic ProN','Trebuchet MS',system-ui,sans-serif"},
  clean:    {n:'Clean sans',     display:"'Avenir Next','Helvetica Neue',Arial,system-ui,sans-serif", body:"'Avenir Next','Helvetica Neue',Arial,system-ui,sans-serif"}
};
function paletteCSS(p) {
  const light = `--bg:${p.bg};--card:${p.card};--soft:${p.soft};--mid:${p.mid};--ink:${p.ink};--ink2:${p.ink2};--yolk:${p.yolk};--on-ink:#fff;--nav:${p.nav || p.mid};--pale:${p.pale || p.soft};`;
  const dark = `--bg:color-mix(in srgb,${p.ink} 52%,#000);--card:color-mix(in srgb,${p.ink} 80%,#000);--soft:${p.ink};--mid:${p.mid};--ink:${p.bg};--ink2:${p.soft};--yolk:${p.yolk};--on-ink:${p.ink};--nav:color-mix(in srgb,${p.nav || p.mid} 45%,#000);--pale:color-mix(in srgb,${p.ink} 65%,#000);`;
  return `:root{${light}}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}
function applyTheme() {
  const d = S.design;
  let el = document.getElementById('theme'); if (!el) { el = document.createElement('style'); el.id = 'theme'; document.head.appendChild(el); }
  el.textContent = paletteCSS(PAL[d.palette] || PAL.classic) + `:root{--display:${(FONTS[d.font] || FONTS.lookbook).display};--body:${(FONTS[d.font] || FONTS.lookbook).body}}`;
  document.body.classList.toggle('nodaisy', !d.daisies);
  ['portrait', 'square', 'landscape'].forEach(f => document.body.classList.remove('frame-' + f));
  document.body.classList.add('frame-' + (['portrait', 'square', 'landscape'].includes(d.photoFrame) ? d.photoFrame : 'square'));
}
(function () { // the daisy, drawn once and reused everywhere
  let petals = '';
  for (let i = 0; i < 12; i++) petals += `<ellipse cx="50" cy="19" rx="8.5" ry="17" transform="rotate(${i * 30} 50 50)"/>`;
  $('#defs').innerHTML = `<symbol id="daisy" viewBox="0 0 100 100"><g fill="#fff" stroke="var(--mid)" stroke-width="1.6">${petals}</g><circle cx="50" cy="50" r="13" fill="var(--yolk)" stroke="var(--ink)" stroke-opacity=".35" stroke-width="1.2"/></symbol>`;
})();
const daisy = (cls = '') => `<svg class="daisy ${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#daisy"/></svg>`;


/* ---------- what is visible ---------- */
// A kid or story shows only when it is published AND family approval is ticked.
// A Why Wednesday shows only on or after its date.
const NEEDS_APPROVAL = {kids: 1, stories: 1};
const isLive = (x, c) => x.status === 'published' && (!NEEDS_APPROVAL[c] || x.approved === true) && (c !== 'wed' || (x.date || '') <= today());
const live = c => S[c].filter(x => isLive(x, c));
const byDate = (a, b) => (b.date || '').localeCompare(a.date || '');
const notLive = () => false;

// Photo focus: where the crop is centred, as percentages (0 = left/top edge, 100 = right/bottom edge).
// focusX / focusY come from the Photo Focus Tool. Older entries used focus = left | center | right.
const FOCUS = {left: '22%', center: '50%', right: '78%'};   // older entries
const pct = v => (v === '' || v == null || Number.isNaN(+v)) ? null : Math.min(100, Math.max(0, +v));
// Reads the "Photo focus" box: words (left, right, top, bottom, top left, ...) or two numbers like 45,25.
function parseFocus(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  const nums = t.match(/^(\d{1,3}(?:\.\d+)?)\s*[, ]\s*(\d{1,3}(?:\.\d+)?)$/);
  if (nums) return [pct(nums[1]), pct(nums[2])];
  const w = t.split(/[\s,\/-]+/);
  const has = x => w.includes(x);
  const x = has('left') ? 10 : has('right') ? 90 : null, y = has('top') ? 5 : has('bottom') ? 95 : null;
  return (x == null && y == null && !has('center') && !has('middle')) ? null : [x, y];
}
// Photo focus: where the crop is centred (0 = left/top edge, 100 = right/bottom edge).
const pos = (item, dy = 25) => {
  const it = item || {}, f = parseFocus(it.focus);
  const x = (f && f[0] != null ? f[0] : null) ?? pct(it.focusX) ?? (FOCUS[it.focus] ? parseFloat(FOCUS[it.focus]) : 50);
  const y = (f && f[1] != null ? f[1] : null) ?? pct(it.focusY) ?? dy;
  return `object-position:${x}% ${y}%`;
};
const photoOrInitial = (name, photo, item) => photo ? `<img src="${esc(imgOk(photo))}" alt="" style="${pos(item)}">` : `<span class="ini">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
const medal = (name, photo, item) => `<span class="med-in">${newDaisy()}<span class="ph">${photoOrInitial(name, photo, item)}</span></span>`;
const secHead = (title, intro) => `<header class="sec-head">${newDaisy('h-daisy')}<div><h2>${esc(title)}</h2><p>${esc(intro)}</p></div></header>`;
const draftChip = (x, c) => (ui.preview && notLive(x, c)) ? `<span class="chip warn">${x.status === 'draft' ? 'Draft' : 'Scheduled'}</span> ` : '';
const sampleChip = x => x.sample ? `<span class="chip warn">Sample</span> ` : '';

function tagInner(k) {
  return `${draftChip(k, 'kids')}${sampleChip(k)}<h2>${esc(k.name)}</h2>
    ${k.since ? `<p class="since">With OttoTHON since ${esc(k.since)}</p>` : ''}
    ${k.tagline ? `<p class="line">${esc(k.tagline)}</p>` : ''}
    <div class="story">${paras(k.story)}</div>`;
}
function renderHero() {
  const T = S.text, kids = live('kids'), n = kids.length;
  const decor = S.design.daisies ? `<span class="decor d1">${daisy()}</span><span class="decor d2">${daisy()}</span><span class="decor d3">${daisy()}</span>` : '';
  let wheel = `<div class="hero-wheel"><div class="empty">Our miracle kids will appear here soon.</div></div>`, tag = '';
  if (n) {
    const step = 360 / n, sel = mod(ui.turn, n), k = kids[sel];
    wheel = `<div class="hero-wheel"><div class="wheel" id="wheel" style="--n:${n}" role="group" aria-label="Miracle kids. Use the arrow keys to turn the wheel.">
      <div class="ring" style="--r:${ui.turn * step}">
        ${kids.map((x, i) => `<button class="med${i === sel ? ' active' : ''}" style="--a:${i * step}" data-act="pick" data-i="${i}" aria-label="Show ${esc(x.name)}" aria-current="${i === sel}">${medal(x.name, x.photo, x)}</button>`).join('')}
      </div>
      <div class="hub"><div class="hub-in"><div class="hub-daisy" id="hub-pic">${daisy()}<span class="ph">${photoOrInitial(k.name, k.photo, k)}</span></div><div class="hub-name" id="hub-name">${esc(k.name)}</div></div></div>
    </div></div>`;
    tag = `<div class="hero-tag"><div class="tag-wrap">
      <svg class="tag-string" viewBox="0 0 120 80" aria-hidden="true"><path d="M82 73 C82 46,40 34,16 0" fill="none" stroke="var(--ink2)" stroke-width="2"/><path d="M82 73 C82 50,104 34,116 8" fill="none" stroke="var(--ink2)" stroke-width="2"/></svg>
      <div class="tag-shape"><div class="tag" id="tag" aria-live="polite">${tagInner(k)}</div></div>
      <div class="wheel-ctl"><button class="btn sm" data-act="prev" aria-label="Previous miracle kid">Previous</button><button class="btn sm primary" data-act="next" aria-label="Next miracle kid">Next</button><span id="cnt" class="hint">${sel + 1} of ${n}</span></div>
    </div></div>`;
  }
  return `<section class="hero" id="top"><div class="hero-grid">
    <div class="hero-title"><h1>${esc(T.heroTitle)}</h1><p class="lede">${rich(T.heroSub)}</p></div>${wheel}${tag}</div>${decor}</section>`;
}
function updateWheel() {
  const kids = live('kids'), n = kids.length; if (!n || !$('#wheel')) return;
  const sel = mod(ui.turn, n), k = kids[sel];
  $('.ring').style.setProperty('--r', ui.turn * (360 / n));
  $$('.med').forEach((b, i) => { b.classList.toggle('active', i === sel); b.setAttribute('aria-current', i === sel); });
  $('#hub-name').textContent = k.name;
  $('#hub-pic').innerHTML = `${daisy()}<span class="ph">${photoOrInitial(k.name, k.photo, k)}</span>`;
  const t = $('#tag'); t.innerHTML = tagInner(k); t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap');
  $('#cnt').textContent = `${sel + 1} of ${n}`;
}
function turnTo(i) {
  const n = live('kids').length, sel = mod(ui.turn, n); let d = i - sel;
  if (d > n / 2) d -= n; if (d < -n / 2) d += n;
  ui.turn += d; updateWheel();
}
function storiesHTML() {
  const T = S.text, list = live('stories').sort(byDate), cats = [...new Set(list.map(s => s.category))];
  if (ui.cat !== 'All' && !cats.includes(ui.cat)) ui.cat = 'All';
  const shown = ui.cat === 'All' ? list : list.filter(s => s.category === ui.cat);
  const card = s => `<button class="scard" data-act="story" data-id="${s.id}">
      <span class="sc-img">${(c => c ? `<img src="${esc(c.photo)}" alt="" style="${pos({focus: c.focus}, 50)}">` : daisy())(galleryOf(s)[0])}</span>
      <span class="sc-body"><span>${draftChip(s, 'stories')}${sampleChip(s)}<span class="chip">${esc(s.category)}</span>${(articlesOf(s).length || videoEmbed(s.video)) ? '<span class="chip news-chip">In the news</span>' : ''}</span><span class="sc-title">${esc(s.title)}</span><span class="sc-sum">${esc(s.summary)}</span><span class="sc-date">${fmt(s.date)}</span></span></button>`;
  return `<section class="sec" id="stories"><div class="sec-in">${secHead(T.nav.stories, T.storiesIntro)}
    ${cats.length > 1 ? `<div class="filters" role="group" aria-label="Filter stories">${['All', ...cats].map(c => `<button data-act="cat" data-c="${esc(c)}" aria-pressed="${c === ui.cat}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${shown.length ? `<div class="${S.design.storyLayout === 'grid' ? 'grid' : 'rail'}">${shown.map(card).join('')}</div>` : `<div class="empty">Stories will appear here soon.</div>`}
  </div></section>`;
}
function wedHTML() {
  const T = S.text, list = live('wed').sort(byDate);
  if (!list.length) return `<section class="sec" id="wed"><div class="sec-in">${secHead(T.nav.wed, T.wedIntro)}<div class="empty">The first Why Wednesday is on its way.</div></div></section>`;
  ui.wedI = Math.min(ui.wedI, list.length - 1);
  const p = list[ui.wedI], m = S.board.find(b => b.name === p.author), why = (T.whyList || '').split('\n').map(x => x.trim()).filter(Boolean);
  return `<section class="sec" id="wed"><div class="sec-in">${secHead(T.nav.wed, T.wedIntro)}
    <div class="wed"><article class="post"><div class="who">${daisy()}<span class="ph">${photoOrInitial(p.author, m && m.photo, m)}</span></div>
      <div>${draftChip(p, 'wed')}${sampleChip(p)}<h3>${esc(p.title)}</h3><p class="by">${esc(p.author)}${m && m.role ? `, ${esc(m.role)}` : ''} on ${fmtLong(p.date)}</p>${paras(p.body)}</div></article>
      <div><ul class="earlier" aria-label="Other Why Wednesdays">${list.map((x, i) => `<li><button data-act="wedpick" data-i="${i}" aria-pressed="${i === ui.wedI}"><b>${esc(x.title)}</b><small>${esc(x.author)}, ${fmt(x.date)}</small></button></li>`).join('')}</ul>
      ${why.length ? `<div class="why-box"><h3>Why they do it</h3><ul class="why-list">${why.map(w => `<li>${daisy()}${esc(w)}</li>`).join('')}</ul></div>` : ''}</div>
    </div></div></section>`;
}
// Meet the team: Executive Director full width, Directors in two columns,
// everyone else grouped by team in three columns.
const tierOf = b => ['executive', 'director', 'team'].includes(b.tier) ? b.tier
  : /executive director/i.test(b.role || '') ? 'executive' : /director/i.test(b.role || '') ? 'director' : 'team';
const BOUQUET = 'assets/img/daisy-bouquet.png';
const bouquet = cls => S.design.daisies ? `<img class="bq ${cls}" src="${BOUQUET}" alt="" aria-hidden="true">` : '';
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const TAPE_TILT = [-5, 3, -3, 6, -6, 2], FRAME_TILT = [-1.2, 1, -.6, 1.4, -1, .7];
// A taped-down photo: white frame, washi tape on top, a daisy placeholder until a photo is added.
function tapedPhoto(b, i, extra = '') {
  const img = imgOk(b.photo), n = i % 6, wide = extra.includes('corners');
  const tape = wide
    ? `<span class="washi w${n % 4} left" style="--tr:-38deg"></span><span class="washi w${(n + 1) % 4} right" style="--tr:36deg"></span>`
    : `<span class="washi w${n % 4}" style="--tr:${TAPE_TILT[n]}deg;--tx:${[0, -18, 14, 0, 18, -12][n]}px"></span>`;
  const inner = img ? `<img src="${esc(img)}" alt="" style="${pos(b)}">` : `<span class="polo-ph">${newDaisy()}<span class="ini">${esc((b.name || '?').trim().charAt(0).toUpperCase())}</span></span>`;
  return `<figure class="polo ${extra}" style="--pr:${FRAME_TILT[n]}deg">${tape}<div class="polo-img">${inner}</div>${extra.includes('cap') ? '__CAP__' : ''}</figure>`;
}
function personText(b) {
  const link = safeUrl(b.link), bio = String(b.bio || '').trim(), name = String(b.name || '').trim();
  // an email typed into "intro" still works: it becomes the email button instead of showing as text
  const mail = [String(b.email || '').trim(), bio].find(x => EMAIL.test(x)) || '';
  const intro = EMAIL.test(bio) ? '' : bio;
  // The button says "Email <first name>". It follows the name automatically unless a custom label is set.
  const label = String(b.emailLabel || '').trim() || `Email ${name.split(/\s+/)[0] || ''}`.trim();
  const buttons = [
    mail ? `<a class="btn sm" href="mailto:${esc(mail)}" title="${esc(mail)}" aria-label="${esc(label)}: ${esc(mail)}">${esc(label)}</a>` : '',
    link ? `<a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Donate to ${esc(name.split(/\s+/)[0] || '')}</a>` : ''
  ].join('');
  return `<h3>${draftChip(b, 'board')}${esc(name)}</h3><p class="role">${esc(b.role)}</p>${intro ? `<p class="bio">${esc(intro)}</p>` : ''}${buttons ? `<div class="p-btns">${buttons}</div>` : ''}`;
}
// exec / director: tinted card with the taped photo beside the text
function personCard(b, cls, i) {
  return `<article class="person ${cls}">${tapedPhoto(b, i, cls === 'exec' ? 'corners' : '')}<div class="who-text">${personText(b)}</div>${cls === 'exec' ? bouquet('in-card') : ''}</article>`;
}
// team member: the name sits on the photo's white border, like a real polaroid
function memberCard(b, i) {
  return tapedPhoto(b, i, 'member cap').replace('__CAP__', `<figcaption>${personText(b)}</figcaption>`);
}
function boardHTML() {
  const T = S.text, list = live('board');
  const execs = list.filter(b => tierOf(b) === 'executive'), dirs = list.filter(b => tierOf(b) === 'director'), rest = list.filter(b => tierOf(b) === 'team');
  // team groups: a director's team comes first (in director order), then any other teams as they appear
  const key = t => String(t || '').trim().toLowerCase(), groups = {}, order = [];
  const group = (name, lead) => { const k = key(name) || 'more'; if (!groups[k]) { groups[k] = {name: String(name || '').trim() || 'More of the team', lead: '', members: []}; order.push(k); } if (lead && !groups[k].lead) groups[k].lead = lead; return groups[k]; };
  dirs.forEach(d => { if (key(d.team)) group(d.team, d.name); });
  rest.forEach(m => group(m.team).members.push(m));
  const teams = order.map(k => groups[k]).filter(g => g.members.length);
  return `<section class="sec" id="board"><div class="sec-in">${secHead(T.nav.board, T.boardIntro)}
    ${execs.length ? `<div class="exec-wrap">${execs.map((b, i) => personCard(b, 'exec', i)).join('')}</div>` : ''}
    ${dirs.length ? `<div class="dir-grid">${dirs.map((b, i) => personCard(b, 'dir', i + 1)).join('')}</div>` : ''}
    ${teams.map((g, gi) => `<div class="team-block"><h3 class="team-h">${esc(g.name)}</h3>${g.lead ? `<p class="team-lead">Led by ${esc(g.lead)}</p>` : ''}<div class="team-grid">${g.members.map((b, i) => memberCard(b, i + gi)).join('')}</div></div>`).join('')}
    <div class="flourish">${bouquet('flip')}<a class="btn" href="wall-of-miracles.html#wed">Read their Why Wednesdays</a>${bouquet('')}</div></div></section>`;
}
function impactHTML() {
  const T = S.text, st = (T.impact || []).filter(x => x.n && x.l);
  return `<section class="sec" id="impact"><div class="sec-in">${secHead(T.impactTitle, T.impactIntro)}
    ${st.length ? `<div class="stats-pub">${st.map(x => `<div class="sp"><b>${esc(x.n)}</b><span>${esc(x.l)}</span></div>`).join('')}</div>` : ''}
    ${T.revealNote ? `<p class="note">${esc(T.revealNote)}</p>` : ''}</div></section>`;
}
// ---------- Events page: a scrapbook of tickets and calendar pages ----------
const EV_TEXT = {eventsTitle: 'Upcoming Events', eventsTagline: 'Good things are always on the schedule.', eventsNote: 'same mission. bigger impact.',
  nextLabel: 'Next up', upcomingLabel: 'Upcoming events', pastTitle: 'Where we’ve been', pastIntro: 'Past events that made a difference',
  pastThanks: 'Thank you to everyone who showed up, gave back, and made these moments possible.'};
const CATS = {fundraiser: 'Fundraiser', meeting: 'Meeting', social: 'Social', community: 'Community', other: 'Event'};
function catOf(e) {
  if (CATS[e.category]) return e.category;
  const t = `${e.title || ''} ${e.feedCategory || ''}`;
  if (/meeting|general body|captains|committee/i.test(t)) return 'meeting';
  if (/fundrais|sale|bake|raffle|donat|pie |marathon|walk|dance/i.test(t)) return 'fundraiser';
  if (/volunt|communit|service|hospital|golisano|visit/i.test(t)) return 'community';
  if (/social|party|mixer|reveal|night|game|bonding|trivia|paint/i.test(t)) return 'social';
  return 'other';
}
const svg = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  fundraiser: svg('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
  meeting: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 2 4 5"/>'),
  social: svg('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
  community: svg('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
  other: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pin: svg('<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')
};
const parts = e => { const d = dt(e.date); return {wk: d.toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase(), mo: d.toLocaleDateString('en-US', {month: 'short'}).toUpperCase(), day: d.getDate()}; };
const daysUntil = e => Math.round((dt(e.date) - dt(today())) / 864e5);
const inDays = n => n <= 0 ? 'TODAY!' : n === 1 ? 'TOMORROW!' : `IN ${n} DAYS!`;
const chip = c => `<span class="catchip">${ICON[c]}${CATS[c]}</span>`;
const rows = e => `${e.time ? `<p class="ev-row">${ICON.clock}<span>${esc(e.time)}</span></p>` : ''}${e.place ? `<p class="ev-row">${ICON.pin}<span>${esc(e.place)}</span></p>` : ''}`;
function evPhoto(e, i) {
  const img = imgOk(e.photo), n = i % 6;
  return `<figure class="polo ev-polo" style="--pr:${FRAME_TILT[n]}deg"><span class="washi w${n % 4}" style="--tr:${TAPE_TILT[n]}deg"></span><div class="polo-img">${img ? `<img src="${esc(img)}" alt="" style="${pos(e, 50)}">` : `<span class="polo-ph">${daisy()}</span>`}</div></figure>`;
}
// ---------- past events <-> success stories, and reflections ----------
const norm = t => String(t || '').trim().toLowerCase();
const evId = e => 'ev-' + (e.date || '') + '-' + norm(e.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const storiesFor = e => { const want = (Array.isArray(e.stories) ? e.stories : []).map(norm); return live('stories').filter(s => s.fromEvent === e || want.includes(norm(s.title))); };
const eventsForStory = s => live('events').filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') && Array.isArray(e.stories) && e.stories.some(x => norm(x) === norm(s.title))).sort(byDate);
// ---------- photos, and events that also appear as success stories ----------
// A photo list is [{photo, caption}]. Each photo path may end in #focus=x,y (written by the editor's focus box).
const normPhotos = list => (Array.isArray(list) ? list : []).map(p => { const q = splitPhoto({photo: p && p.photo}); return {photo: imgOk(q.photo), focus: q.focus || (p && p.focus) || '', caption: String((p && p.caption) || '').trim()}; }).filter(p => p.photo);
const galleryOf = s => [s.photo ? {photo: imgOk(s.photo), focus: s.focus, caption: ''} : null, ...normPhotos(s.photos)].filter(p => p && p.photo);
const galleryHTML = items => !items.length ? '' : `<div class="gallery">${items.map((p, i) => `<figure class="g-item" style="--pr:${FRAME_TILT[i % 6]}deg"><span class="washi w${i % 4}" style="--tr:${TAPE_TILT[i % 6]}deg"></span><div class="g-img"><img src="${esc(p.photo)}" alt="${esc(p.caption)}" loading="lazy" decoding="async" style="${pos({focus: p.focus}, 50)}"></div>${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`;
// The "A reflection" part of a story: a short note in the writer's own words.
const reflectionHTML = (text, by) => { const t = String(text || '').trim(); return !t ? '' : `<blockquote class="reflect"><span class="reflect-label">A reflection</span>${paras(t)}${by ? `<footer>— ${esc(by)}</footer>` : ''}</blockquote>`; };
// An event switched on as "Also show as a success story" becomes a story card on the Wall of Miracles:
// its name, what happened, its photos, and the reflection. (Older entries kept these in a list called "reflections".)
function eventStories(events) {
  const td = today(), out = [];
  events.forEach(e => {
    if (e.status !== 'published' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '') || !(e.archive || e.date < td)) return;
    const old = (Array.isArray(e.reflections) ? e.reflections : []).filter(r => r && (r.text || (r.photos || []).length)), first = old.find(r => r.text) || {};
    if (!(e.asStory === true || old.some(r => r.asStory === true))) return;
    const refl = String(e.reflection || first.text || '').trim(), by = String(e.reflectionBy || first.by || '').trim();
    const pics = [e.photo ? {photo: imgOk(e.photo), focus: e.focus, caption: ''} : null, ...normPhotos(e.photos), ...old.flatMap(r => normPhotos(r.photos))].filter(p => p && p.photo);
    const text = String(e.desc || '').trim(), lead = text || refl;
    if (!lead && !pics.length && !articlesOf(e).length) return;
    const sentence = ((lead.match(/^[^.!?]*[.!?]/) || [lead])[0] || '').trim();
    out.push({id: `ev-story-${e.id}`, status: 'published', approved: true, fromEvent: e, title: e.title, category: catOf(e) === 'fundraiser' ? 'Fundraiser' : 'Community', date: e.date,
      articles: Array.isArray(e.articles) ? e.articles : [], story: text || ' ', reflection: refl, by, summary: sentence.length > 140 ? sentence.slice(0, 137).replace(/\s+\S*$/, '') + '…' : sentence,
      photo: pics[0] ? pics[0].photo : '', focus: pics[0] ? pics[0].focus : '', photos: pics.slice(1)});
  });
  return out;
}
function fromEventHTML(s) {
  const evs = s.fromEvent ? [s.fromEvent] : eventsForStory(s); if (!evs.length) return '';
  return `<div class="from-event"><h4>From the event</h4>${evs.map(e => `<div class="fe"><a class="fe-link" href="events.html#${evId(e)}"><span class="fe-date">${fmt(e.date)}</span><strong>${esc(e.title)}</strong>${e.place ? `<span class="fe-place">${esc(e.place)}</span>` : ''}<span class="n-foot">See the event <span aria-hidden="true">→</span></span></a></div>`).join('')}</div>`;
}
function eventsHTML() {
  const T = S.text, td = today(), list = live('events').filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
  const up = list.filter(e => !e.archive && e.date >= td).sort((a, b) => a.date.localeCompare(b.date)), past = list.filter(e => e.archive || e.date < td).sort(byDate);
  const next = up.find(e => e.featured === true) || up[0], rest = up.filter(e => e !== next);
  const stars = `<svg class="evp-doodle" viewBox="0 0 200 60" aria-hidden="true"><g fill="none" stroke="var(--blue-ink)" stroke-width="3" stroke-linecap="round"><path d="M10 12l16 6M6 30l18 1M12 48l15-8"/><path d="M178 12l-14 8M184 30l-16 1M176 46l-14-8"/></g><path d="M100 4l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="var(--yolk)"/></svg>`;
  const ticket = !next ? '' : (() => {
    const c = catOf(next), q = parts(next), link = safeUrl(next.link);
    return `<article class="ticket cat-${c}"><span class="tape-label">${esc(T.nextLabel)}</span>
      <div class="tk-main">${evPhoto(next, 0)}<div class="tk-text">${chip(c)}<h2>${draftChip(next, 'events')}${sampleChip(next)}${esc(next.title)}</h2>${rows(next)}${next.desc ? `<p class="ev-desc">${esc(next.desc)}</p>` : ''}
        ${link ? `<div class="ev-actions"><a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Details</a></div>` : ''}<p class="admit">♡ ADMIT ONE ♡</p></div></div>
      <div class="tk-stub"><div class="wk">${q.wk}</div><div class="mo">${q.mo}</div><div class="dy">${q.day}</div><div class="in">${inDays(daysUntil(next))}</div>
        <button class="btn cal-btn" data-act="ics" data-id="${next.id}">${ICON.cal}Add to Calendar</button></div></article>`;
  })();
  const card = (e, i) => { const c = catOf(e), q = parts(e), link = safeUrl(e.link), img = imgOk(e.photo);
    return `<article class="evc cat-${c}${img ? ' has-img' : ''}" id="${evId(e)}">${img ? evPhoto(e, i + 1) : ''}
      <div class="evc-body">${chip(c)}<h3>${draftChip(e, 'events')}${sampleChip(e)}${esc(e.title)}</h3>${rows(e)}${e.desc ? `<p class="ev-desc">${esc(e.desc)}</p>` : ''}
        <div class="ev-actions"><button class="btn sm" data-act="ics" data-id="${e.id}">Add to calendar</button>${link ? `<a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Details</a>` : ''}</div></div>
      <div class="cal"><span class="washi w${(i + 2) % 4}" style="--tr:${TAPE_TILT[(i + 3) % 6]}deg"></span><b>${q.mo}</b><strong>${q.day}</strong>${daisy('cal-daisy')}</div></article>`; };
  const recap = t => {
    const x = String(t || '').trim(); if (!x) return '';
    if (x.length <= 200) return `<p class="recap">${esc(x)}</p>`;
    const teaser = x.slice(0, 180).replace(/\s+\S*$/, '');
    return `<details class="recap"><summary><span class="teaser">${esc(teaser)}… </span><b>Read more</b></summary><p>${esc(x)}</p></details>`;
  };
  // news links on an event: compact links (outlet and headline), filled in by the previews job
  const eventNews = e => {
    const arts = articlesOf(e); if (!arts.length) return '';
    return `<div class="ev-news"><span class="ev-news-label">In the news</span>${arts.map(a => {
      const info = (S.previews && S.previews[a.url]) || {}, ok = info.ok === true, host = hostOf(a.url);
      const title = String(a.title || '').trim() || (ok && info.title) || host, outlet = String(a.outlet || '').trim() || (ok && info.outlet) || host;
      return `<a class="ev-news-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(outlet)}</b><span>${esc(title)}</span><i aria-hidden="true">↗</i></a>`; }).join('')}</div>`;
  };
  const pastCard = (e, i) => { const c = catOf(e), q = parts(e), link = safeUrl(e.link), img = imgOk(e.photo);
    const ss = storiesFor(e);
    return `<article class="pastc cat-${c}${img ? ' has-img' : ''}" id="${evId(e)}">${img ? evPhoto(e, i) : ''}<div class="pastc-top"><span class="pdate">${q.mo} ${q.day}</span>${chip(c)}</div>
      <h3>${draftChip(e, 'events')}${sampleChip(e)}${esc(e.title)}</h3>${e.place ? `<p class="ev-row">${ICON.pin}<span>${esc(e.place)}</span></p>` : ''}${recap(e.desc)}${eventNews(e)}
      ${ss.length ? `<div class="ev-stories"><span>Read the ${ss.length > 1 ? 'stories' : 'story'}:</span>${ss.map(x => `<button type="button" class="story-link" data-act="story" data-id="${x.id}">${esc(x.title)}</button>`).join('')}</div>` : ''}
      ${link ? `<div class="ev-actions"><a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">See more</a></div>` : ''}</article>`; };
  const PAST_FIRST = 6, shownPast = ui.pastAll ? past : past.slice(0, PAST_FIRST);
  const pastHTML = [...new Set(past.map(e => e.date.slice(0, 4)))].map(y => {
    const items = shownPast.filter(e => e.date.slice(0, 4) === y);
    return items.length ? `<h3 class="year">${y}</h3><div class="pastc-grid">${items.map(e => pastCard(e, past.indexOf(e))).join('')}</div>` : '';
  }).join('');
  return `<section class="evp"><div class="sec-in">
    <header class="evp-hero">${stars}<h1 class="evp-title">${esc(T.eventsTitle)}</h1><p class="evp-tag">${esc(T.eventsTagline)} ♡</p><p class="evp-intro">${esc(T.eventsIntro)}</p>
      <div class="evp-flower" aria-hidden="true">${daisy()}</div><p class="evp-note">${esc(T.eventsNote)} ♡</p></header>
    ${ticket}
    <h2 class="tape-label big">${esc(T.upcomingLabel)} ♡</h2>
    ${rest.length ? `<div class="evc-grid">${rest.map(card).join('')}</div>` : `<div class="empty">${next ? 'More events are on the way.' : 'No upcoming events yet. Check back soon.'}</div>`}
    ${past.length ? `<div class="past"><div class="past-head"><h2 class="tape-label big">${esc(T.pastTitle)} ♡</h2><p class="past-intro">${esc(T.pastIntro)} ♡</p></div>
      ${pastHTML}${!ui.pastAll && past.length > PAST_FIRST ? `<p class="past-more"><button class="btn" data-act="pastall">Show all ${past.length} past events</button></p>` : ''}
      <p class="past-thanks">${esc(T.pastThanks)} ♡</p></div>` : ''}
  </div></section>`;
}
// "Add to calendar": builds a calendar file in the browser (opens in Apple Calendar, Outlook, Google Calendar)
function icsText(e) {
  const f = x => x.replace(/[-:]/g, '').replace(/\.\d+/, ''), ics = t => String(t || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ymdc = e.date.replace(/-/g, '');
  let when;
  if (e.start) when = `DTSTART:${f(e.start)}\r\n${e.end ? `DTEND:${f(e.end)}` : ''}`;
  else {
    const t = [...String(e.time || '').matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi)].map(m => { let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return String(h).padStart(2, '0') + (m[2] || '00') + '00'; });
    if (t.length) when = `DTSTART:${ymdc}T${t[0]}\r\nDTEND:${ymdc}T${t[1] || String((+t[0].slice(0, 2) + 1) % 24).padStart(2, '0') + t[0].slice(2)}`;
    else { const n = dt(e.date); n.setDate(n.getDate() + 1); when = `DTSTART;VALUE=DATE:${ymdc}\r\nDTEND;VALUE=DATE:${ymd(n).replace(/-/g, '')}`; }
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OttoTHON//Events//EN', 'BEGIN:VEVENT', `UID:${ymdc}-${(e.title || 'event').replace(/\W+/g, '-').toLowerCase()}@ottothon`,
    `DTSTAMP:${f(new Date().toISOString())}`, when.replace(/\r\n$/, ''), `SUMMARY:${ics(e.title)}`, `LOCATION:${ics(e.place)}`, `DESCRIPTION:${ics(e.desc)}`, 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n') + '\r\n';
}
function addToCalendar(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  const url = URL.createObjectURL(new Blob([icsText(e)], {type: 'text/calendar;charset=utf-8'})), a = document.createElement('a');
  a.href = url; a.download = `${(e.title || 'event').replace(/\W+/g, '-').toLowerCase()}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function involveHTML() {
  const T = S.text, ways = live('ways'), faq = live('faq').filter(f => f.answer || ui.preview), reg = safeUrl(T.registerUrl);
  const inc = (T.included || '').split('\n').map(x => x.trim()).filter(Boolean);
  return `<section class="sec" id="involve"><div class="sec-in">${secHead(T.nav.involve, T.involveIntro)}
    <div class="ways">${ways.map(w => { const l = safeUrl(w.link); return `<article class="way">${draftChip(w, 'ways')}<h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p>${l ? `<a class="btn" href="${esc(l)}" target="_blank" rel="noopener">${esc(w.label || 'Learn more')}</a>` : ''}</article>`; }).join('')}</div>
    <div class="dance"><div><h3>${esc(T.danceTitle)}</h3><p>${esc(T.danceDesc)}</p>${reg ? `<a class="btn primary" href="${esc(reg)}" target="_blank" rel="noopener">Register for marathon day</a>` : ''}</div>
      <div class="why-box" style="margin:0"><h3>What’s included</h3><ul class="why-list">${inc.map(i => `<li>${daisy()}${esc(i)}</li>`).join('')}</ul></div></div>
    ${faq.length ? `<div class="faq"><h3 class="ev-h">FAQ</h3>${faq.map(f => `<details><summary>${draftChip(f, 'faq')}${esc(f.question)}</summary><p>${esc(f.answer) || 'No answer yet.'}</p></details>`).join('')}</div>` : ''}
    ${T.email ? `<p style="margin-top:18px">Still have questions? Reach out at <a href="mailto:${esc(T.email)}">${esc(T.email)}</a>.</p>` : ''}</div></section>`;
}
function aboutHTML() {
  const T = S.text;
  return `<section class="sec" id="about"><div class="sec-in">${secHead(T.nav.about, T.aboutIntro)}
    <div class="about-grid"><div>${paras(T.aboutBody)}<h3>${esc(T.whoTitle)}</h3>${paras(T.whoBody)}<h3>${esc(T.cmnTitle)}</h3>${paras(T.cmnBody)}</div>
      <div><div class="plate">${HOSP ? `<a class="plate-logo" href="${esc(HOSP)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${IMG.golisano}" alt=""></a>` : `<img src="${IMG.golisano}" alt="Upstate Golisano Children’s Hospital">`}<h3>${esc(T.partnerTitle)}</h3><p>${esc(T.partnerBody)}</p>${HOSP ? `<a class="btn sm" href="${esc(HOSP)}" target="_blank" rel="noopener noreferrer">Visit Upstate Golisano Children’s Hospital</a>` : ''}</div></div></div></div></section>`;
}
const SECS = {stories: storiesHTML, wed: wedHTML, impact: impactHTML, board: boardHTML, events: eventsHTML, involve: involveHTML, about: aboutHTML};
const SLUG = {home: 'index.html', events: 'events.html', wall: 'wall-of-miracles.html', involve: 'get-involved.html', about: 'about.html', board: 'meet-the-team.html'};
const polaroid = (photo, caption) => `<figure class="polaroid"><span class="tape" aria-hidden="true"></span><div class="pol-img">${photo ? `<img src="${esc(imgOk(photo))}" alt="">` : daisy()}</div><figcaption>${esc(caption)}</figcaption></figure>`;
function homeHTML() {
  const T = S.text, st = (T.stats || []).filter(x => x.n && x.l), kid = live('kids').find(k => k.photo);
  const td = today(), up = live('events').filter(e => e.date >= td).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  return `<section class="home-hero"><div class="hh-in"><div><h1>${esc(T.homeTitle)}</h1><p class="kick">${esc(T.homeKicker)}</p><p>${rich(T.homeIntro)}</p><a class="btn primary" href="about.html">Learn more</a></div>
      ${polaroid(T.heroPhoto, T.homeCaption)}</div>
      <svg class="wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C240 70 480 0 720 22 S1200 60 1440 14 L1440 60 L0 60Z" fill="var(--bg)"/></svg></section>
    <div class="flowers" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<span style="transform:rotate(${i * 19}deg)">${daisy()}</span>`).join('')}</div>
    <section class="mission"><div class="sec-in"><h2>${esc(T.missionTitle)}</h2><p>${rich(T.missionBody)}</p>
      ${st.length ? `<div class="big-stats">${st.map(x => `<div><b>${esc(x.n)}</b><span>${esc(x.l)}</span></div>`).join('')}</div>` : ''}
      ${T.revealNote ? `<p class="note">${esc(T.revealNote)}</p>` : ''}</div></section>
    <section class="sec-in" style="padding-bottom:20px"><div class="wall-banner"><div><p class="quote-card">${esc(T.wallQuote)}</p><h2>${esc(T.wallTitle)}</h2><p>${esc(T.wallBody)}</p><a class="btn" href="wall-of-miracles.html">Visit the Wall of Miracles</a></div>
      ${polaroid(T.wallPhoto || (kid && kid.photo), 'miracle kid')}</div></section>
    <section class="up"><div class="sec-in">${secHead(T.upcomingTitle, T.upcomingIntro)}
      ${up.length ? `<div class="up-grid">${up.map(e => { const d = dt(e.date); return `<article class="up-card"><div class="d">${d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div><h3>${draftChip(e, 'events')}${sampleChip(e)}${esc(e.title)}</h3>${[e.time, e.place].filter(Boolean).length ? `<div class="where">${esc([e.time, e.place].filter(Boolean).join(' · '))}</div>` : ''}${e.desc ? `<p>${esc(e.desc)}</p>` : ''}</article>`; }).join('')}</div>` : `<div class="empty" style="margin-bottom:26px">New events are on the way.</div>`}
      <a class="btn" href="events.html">See all events</a></div></section>`;
}
function pageHTML(page) {
  if (page === 'home') return homeHTML();
  if (page === 'events') return eventsHTML();
  if (page === 'involve') return involveHTML();
  if (page === 'about') return aboutHTML();
  if (page === 'board') return boardHTML();
  const secs = S.design.sections.filter(x => x.show && SECS[x.key]);
  return renderHero() + secs.map(x => SECS[x.key]()).join('');
}
const TITLES = {home: 'OttoTHON', events: 'Events', wall: 'Wall of Miracles', involve: 'Get involved', about: 'About', board: 'Meet the team'};
function renderPublic() {
  const T = S.text, y = window.scrollY, page = ui.page || 'home';
  const links = ['home', 'events', 'wall', 'involve', 'about', 'board'].map(k => `<a href="${SLUG[k]}" ${k === page ? 'aria-current="page"' : ''}>${esc(T.nav[k])}</a>`).join('');
  const donateUrl = safeUrl(T.donateUrl), donate = donateUrl ? `<a class="cta" href="${esc(donateUrl)}" target="_blank" rel="noopener">Donate</a>` : '';
  document.title = `${TITLES[page]} · OttoTHON`;
  $('#app').innerHTML = `
    <header class="nav"><div class="nav-in"><a class="brand" href="index.html" aria-label="OttoTHON home"><img src="${IMG.logo}" alt="OttoTHON"></a>
      <nav class="links" aria-label="Main">${links}${donate}</nav></div></header>
    <main>${pageHTML(page)}</main>
    <footer class="foot"><div class="foot-in"><p class="cta-line">${esc(T.ctaLine)}</p>
      <div class="logos"><img class="logo-tile" src="${IMG.logo}" alt="OttoTHON">${HOSP ? `<a class="gplate" href="${esc(HOSP)}" target="_blank" rel="noopener noreferrer" aria-label="Upstate Golisano Children’s Hospital website (opens in a new tab)"><img src="${IMG.golisano}" alt="Upstate Golisano Children’s Hospital"></a>` : `<span class="gplate"><img src="${IMG.golisano}" alt="Upstate Golisano Children’s Hospital"></span>`}</div>
      <div class="fbtns">${donateUrl ? `<a class="btn light" href="${esc(donateUrl)}" target="_blank" rel="noopener">Donate</a>` : ''}<a class="btn" href="get-involved.html">Get involved</a></div>
      <p>${rich(T.about)}</p>${T.email ? `<p>Questions? <a href="mailto:${esc(T.email)}">${esc(T.email)}</a></p>` : ''}
      <div class="flinks">${links}</div><small>${esc(T.footer)} <a href="admin/">Team sign-in</a></small></div></footer>`;
  window.scrollTo(0, y);
}
// ---------- news coverage on a story ----------
// Most news sites refuse to be shown inside another page, so articles appear as link cards
// (headline, outlet, date, short summary) that open the article. YouTube and Vimeo clips can play on the page.
const httpsUrl = u => /^https:\/\/\S+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const articlesOf = s => (Array.isArray(s.articles) ? s.articles : []).map(a => ({...(a || {}), url: httpsUrl(a && a.url)})).filter(a => a.url);
function videoEmbed(u) {
  const t = String(u || '').trim(); let m;
  if ((m = t.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,15})/i)) || (m = t.match(/^https:\/\/youtu\.be\/([\w-]{6,15})/i)) || (m = t.match(/^https:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts|live)\/([\w-]{6,15})/i)))
    return {src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`, site: 'YouTube'};
  if ((m = t.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d{5,12})(?:\/([\da-f]{6,}))?/i)) || (m = t.match(/^https:\/\/player\.vimeo\.com\/video\/(\d{5,12})(?:\?h=([\da-f]{6,}))?/i)))
    return {src: `https://player.vimeo.com/video/${m[1]}${m[2] ? '?h=' + m[2] : ''}`, site: 'Vimeo'};
  return null;
}
function newsHTML(s) {
  const arts = articlesOf(s), v = videoEmbed(s.video);
  if (!arts.length && !v) return '';
  const card = a => {
    const info = (S.previews && S.previews[a.url]) || {}, ok = info.ok === true, host = hostOf(a.url);
    const title = String(a.title || '').trim() || (ok && info.title) || host, outlet = String(a.outlet || '').trim() || (ok && info.outlet) || host;
    const date = String(a.date || (ok && info.date) || '').slice(0, 10), desc = ok ? (info.description || '') : '';
    return `<a class="news-card" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer"><span class="n-outlet">${esc(outlet)}</span><strong class="n-title">${esc(title)}</strong>${desc ? `<span class="n-desc">${esc(desc)}</span>` : ''}<span class="n-foot">${/^\d{4}-\d{2}-\d{2}$/.test(date) ? esc(fmt(date)) + ' · ' : ''}Read the article <span aria-hidden="true">↗</span></span></a>`;
  };
  return `<div class="news"><h4>In the news</h4>${v ? `<div class="vid"><button type="button" class="vid-play" data-act="playvideo" data-src="${esc(v.src)}"><span>▶ Watch the video</span><small>Plays from ${v.site} when you press it</small></button></div>` : ''}${arts.map(card).join('')}</div>`;
}
function openStory(id) {
  const s = S.stories.find(x => x.id === id); if (!s) return;
  const gal = galleryOf(s);
  $('#dlg-body').innerHTML = `<div class="sc-img">${gal[0] ? `<img src="${esc(gal[0].photo)}" alt="" style="${pos({focus: gal[0].focus}, 50)}">` : daisy()}</div>
    <span class="chip">${esc(s.category)}</span> ${sampleChip(s)}<h3 id="dlg-title">${esc(s.title)}</h3><p class="hint" style="margin-top:0">${fmt(s.date)}</p>${paras(s.story)}${reflectionHTML(s.reflection, s.by)}${galleryHTML(gal.slice(1))}${fromEventHTML(s)}${newsHTML(s)}
    <div class="dlg-btns"><button class="btn primary" data-act="closedlg">Close</button></div>`;
  $('#dlg').showModal();
}


/* ---------- wiring ---------- */
const ACT = {
  pick: a => turnTo(+a.dataset.i),
  prev: () => { ui.turn--; updateWheel(); },
  next: () => { ui.turn++; updateWheel(); },
  cat: a => { ui.cat = a.dataset.c; renderPublic(); },
  story: a => openStory(a.dataset.id),
  wedpick: a => { ui.wedI = +a.dataset.i; renderPublic(); },
  ics: a => addToCalendar(a.dataset.id),
  playvideo: a => {
    const src = a.dataset.src || '';
    if (!/^https:\/\/(www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)[\w?=&-]+$/.test(src)) return;
    a.parentElement.innerHTML = `<iframe src="${src}${src.includes('?') ? '&' : '?'}autoplay=1" title="Video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>`;
  },
  pastall: () => { ui.pastAll = true; renderPublic(); },
  closedlg: () => document.getElementById('dlg').close()
};
document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a && ACT[a.dataset.act]) ACT[a.dataset.act](a); });
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('#wheel')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ACT.next(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ACT.prev(); }
  }
});

/* ---------- load content, then draw ---------- */
const load = async name => {
  const r = await fetch(`content/${name}.json`, {cache: 'no-cache'});
  if (!r.ok) throw new Error(`content/${name}.json (${r.status})`);
  return r.json();
};
// Events you add by hand win over synced ones with the same title and date.
// To hide a synced event, add the same title and date by hand and turn "Show on the site" off.
const evKey = (t, d) => String(t || '').trim().toLowerCase() + '|' + d;
function mergeEvents(manual, feed) {
  const seen = new Set(manual.map(e => evKey(e.title, e.date)));
  const synced = feed.filter(f => f && f.title && /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') && !seen.has(evKey(f.title, f.date)))
    .map((f, i) => ({id: 'y' + i, status: 'published', fromFeed: true, title: f.title, date: f.date,
      time: f.timeLabel || '', place: f.place || '', start: f.start || '', end: f.end || '', category: f.category || '', feedCategory: f.feedCategory || '',
      desc: f.desc || '', link: /^https:\/\//.test(f.link || '') ? f.link : ''}));
  return [...manual, ...synced];
}
// A photo path may end in "#focus=45,25" (written by the editor's focus box). Split it into the path and a focus value.
function splitPhoto(x) {
  if (typeof x.photo !== 'string' || !x.photo.includes('#')) return x;
  const [src, frag] = x.photo.split('#'), m = /(?:^|&)focus=(\d{1,3}(?:\.\d+)?),(\d{1,3}(?:\.\d+)?)/.exec(frag || '');
  return {...x, photo: src, ...(m ? {focus: `${m[1]},${m[2]}`} : {})};
}
const toItems = (o, prefix) => ((o && o.items) || []).map((x, i) => ({...splitPhoto(x), id: prefix + i, status: x.published === true ? 'published' : 'draft'}));
async function init() {
  const app = document.getElementById('app');
  try {
    const [st, kids, stories, wed, board, events, ways, faq] = await Promise.all(['settings', 'kids', 'stories', 'wednesdays', 'board', 'events', 'ways', 'faq'].map(load));
    // Events synced from the campus feed (optional file; the site works without it).
    let feed = [];
    try { const r = await fetch('content/events-feed.json', {cache: 'no-cache'}); if (r.ok) { const f = await r.json(); feed = Array.isArray(f.items) ? f.items : []; } } catch (e) { /* keep going without it */ }
    // Past events added by hand (optional file). They always show under "Where we've been".
    let archive = [];
    try { const r = await fetch('content/past-events.json', {cache: 'no-cache'}); if (r.ok) archive = toItems(await r.json(), 'p').map(x => ({...x, archive: true})); } catch (e) { /* keep going without it */ }
    // Headline, outlet and summary for news links, fetched by a background job (optional file).
    let previews = {};
    try { const r = await fetch('content/article-previews.json', {cache: 'no-cache'}); if (r.ok) { const j = await r.json(); previews = (j && j.items) || {}; } } catch (e) { /* keep going without it */ }
    const g = k => st[k] || {};
    { const v = String(g('links').hospitalUrl || '').trim(); HOSP = v.toLowerCase() === 'none' ? '' : (httpsUrl(v) || HOSP_DEFAULT); }
    S = {
      kids: toItems(kids, 'k'), stories: toItems(stories, 's'), wed: toItems(wed, 'w'), board: toItems(board, 'b'),
      events: mergeEvents(toItems(events, 'e').concat(archive), feed), previews, ways: toItems(ways, 'a'), faq: toItems(faq, 'f'),
      design: {photoFrame: g('theme').photoFrame, palette: g('theme').palette, font: g('theme').font, daisies: g('theme').daisies !== false, storyLayout: g('theme').storyLayout || 'rail',
        sections: (g('theme').wallSections || []).filter(x => ['stories', 'wed', 'impact'].includes(x.key))},
      text: Object.assign({}, EV_TEXT, g('home'), g('wall'), g('team'), g('events'), g('involve'), g('about'), g('footer'), {
        donateUrl: g('links').donateUrl || '', registerUrl: g('links').registerUrl || '', email: g('links').email || '',
        heroPhoto: imgOk(g('photos').heroPhoto), wallPhoto: imgOk(g('photos').wallPhoto),
        stats: st.stats || [], impact: st.impact || [], nav: g('nav')})
    };
    S.stories = S.stories.concat(eventStories(S.events));
    ['stories', 'wed', 'impact'].forEach(k => { if (!S.design.sections.some(x => x.key === k)) S.design.sections.push({key: k, show: true}); });
    document.body.insertAdjacentHTML('beforeend', '<dialog id="dlg" aria-labelledby="dlg-title"><div class="dlg-in" id="dlg-body"></div></dialog>');
    document.getElementById('dlg').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.fe-link')) document.getElementById('dlg').close(); });
    window.addEventListener('hashchange', () => { if (/^#ev-/.test(location.hash)) { ui.pastAll = true; renderPublic(); const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView(); } });
    applyTheme();
    if (/^#ev-/.test(location.hash)) ui.pastAll = true;
    renderPublic();
    if (location.hash.length > 1) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView(); }
  } catch (err) {
    console.error(err);
    app.innerHTML = '<div style="max-width:40rem;margin:15vh auto;padding:0 20px;font-family:system-ui,sans-serif"><h1>We couldn’t load this page.</h1><p>Please refresh. If you opened the file straight from your computer, start a local server instead (see the README).</p></div>';
  }
}
init();

/* =====================================================================
   OttoTHON site runtime. No libraries, no build step.
   Every page loads the JSON files in /content, then draws itself.
   Content is edited through /admin (Decap CMS) or directly on GitHub.
   ===================================================================== */
'use strict';
const IMG = {logo: 'assets/img/ottothon-logo.jpg', golisano: 'assets/img/golisano-logo.svg'};
const imgOk = u => /^(assets\/[\w\-. \/]+|https:\/\/)/i.test(u || '') && !/\.\./.test(u) ? u : '';
document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs id="defs"></defs></svg>');
let S;
const ui = {turn: 0, cat: 'All', wedI: 0, preview: false, page: document.body.dataset.page || 'home'};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paras = t => String(t || '').split(/\n\s*\n/).filter(x => x.trim()).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
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

const photoOrInitial = (name, photo) => photo ? `<img src="${esc(imgOk(photo))}" alt="">` : `<span class="ini">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
const medal = (name, photo) => `<span class="med-in">${daisy()}<span class="ph">${photoOrInitial(name, photo)}</span></span>`;
const secHead = (title, intro) => `<header class="sec-head">${daisy('h-daisy')}<div><h2>${esc(title)}</h2><p>${esc(intro)}</p></div></header>`;
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
        ${kids.map((x, i) => `<button class="med${i === sel ? ' active' : ''}" style="--a:${i * step}" data-act="pick" data-i="${i}" aria-label="Show ${esc(x.name)}" aria-current="${i === sel}">${medal(x.name, x.photo)}</button>`).join('')}
      </div>
      <div class="hub"><div class="hub-in"><div class="hub-daisy" id="hub-pic">${daisy()}<span class="ph">${photoOrInitial(k.name, k.photo)}</span></div><div class="hub-name" id="hub-name">${esc(k.name)}</div></div></div>
    </div></div>`;
    tag = `<div class="hero-tag"><div class="tag-wrap">
      <svg class="tag-string" viewBox="0 0 120 80" aria-hidden="true"><path d="M82 73 C82 46,40 34,16 0" fill="none" stroke="var(--ink2)" stroke-width="2"/><path d="M82 73 C82 50,104 34,116 8" fill="none" stroke="var(--ink2)" stroke-width="2"/></svg>
      <div class="tag-shape"><div class="tag" id="tag" aria-live="polite">${tagInner(k)}</div></div>
      <div class="wheel-ctl"><button class="btn sm" data-act="prev" aria-label="Previous miracle kid">Previous</button><button class="btn sm primary" data-act="next" aria-label="Next miracle kid">Next</button><span id="cnt" class="hint">${sel + 1} of ${n}</span></div>
    </div></div>`;
  }
  return `<section class="hero" id="top"><div class="hero-grid">
    <div class="hero-title"><h1>${esc(T.heroTitle)}</h1><p class="lede">${esc(T.heroSub)}</p></div>${wheel}${tag}</div>${decor}</section>`;
}
function updateWheel() {
  const kids = live('kids'), n = kids.length; if (!n || !$('#wheel')) return;
  const sel = mod(ui.turn, n), k = kids[sel];
  $('.ring').style.setProperty('--r', ui.turn * (360 / n));
  $$('.med').forEach((b, i) => { b.classList.toggle('active', i === sel); b.setAttribute('aria-current', i === sel); });
  $('#hub-name').textContent = k.name;
  $('#hub-pic').innerHTML = `${daisy()}<span class="ph">${photoOrInitial(k.name, k.photo)}</span>`;
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
      <span class="sc-img">${s.photo ? `<img src="${esc(imgOk(s.photo))}" alt="">` : daisy()}</span>
      <span class="sc-body"><span>${draftChip(s, 'stories')}${sampleChip(s)}<span class="chip">${esc(s.category)}</span></span><span class="sc-title">${esc(s.title)}</span><span class="sc-sum">${esc(s.summary)}</span><span class="sc-date">${fmt(s.date)}</span></span></button>`;
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
    <div class="wed"><article class="post"><div class="who">${daisy()}<span class="ph">${photoOrInitial(p.author, m && m.photo)}</span></div>
      <div>${draftChip(p, 'wed')}${sampleChip(p)}<h3>${esc(p.title)}</h3><p class="by">${esc(p.author)}${m && m.role ? `, ${esc(m.role)}` : ''} on ${fmtLong(p.date)}</p>${paras(p.body)}</div></article>
      <div><ul class="earlier" aria-label="Other Why Wednesdays">${list.map((x, i) => `<li><button data-act="wedpick" data-i="${i}" aria-pressed="${i === ui.wedI}"><b>${esc(x.title)}</b><small>${esc(x.author)}, ${fmt(x.date)}</small></button></li>`).join('')}</ul>
      ${why.length ? `<div class="why-box"><h3>Why they do it</h3><ul class="why-list">${why.map(w => `<li>${daisy()}${esc(w)}</li>`).join('')}</ul></div>` : ''}</div>
    </div></div></section>`;
}
function boardHTML() {
  const T = S.text, list = live('board');
  return `<section class="sec" id="board"><div class="sec-in">${secHead(T.nav.board, T.boardIntro)}
    <div class="labels">${list.map(b => `<article class="label"><div class="who">${daisy()}<span class="ph">${photoOrInitial(b.name, b.photo)}</span></div>
      <h3>${draftChip(b, 'board')}${esc(b.name)}</h3><p class="role">${esc(b.role)}</p>${b.bio ? `<p>${esc(b.bio)}</p>` : ''}${safeUrl(b.link) ? `<a class="btn sm" style="margin-top:12px" href="${esc(safeUrl(b.link))}" target="_blank" rel="noopener">Donate to ${esc(b.name.split(' ')[0])}</a>` : ''}</article>`).join('')}</div>
    <p class="team-link"><a class="btn" href="wall-of-miracles.html#wed">Read their Why Wednesdays</a></p></div></section>`;
}
function impactHTML() {
  const T = S.text, st = (T.impact || []).filter(x => x.n && x.l);
  return `<section class="sec" id="impact"><div class="sec-in">${secHead(T.impactTitle, T.impactIntro)}
    ${st.length ? `<div class="stats-pub">${st.map(x => `<div class="sp"><b>${esc(x.n)}</b><span>${esc(x.l)}</span></div>`).join('')}</div>` : ''}
    ${T.revealNote ? `<p class="note">${esc(T.revealNote)}</p>` : ''}</div></section>`;
}
function eventsHTML() {
  const T = S.text, list = live('events'), td = today(), reg = safeUrl(T.registerUrl);
  const up = list.filter(e => e.date >= td).sort((a, b) => a.date.localeCompare(b.date)), past = list.filter(e => e.date < td).sort(byDate);
  const row = (e, isPast) => { const d = dt(e.date), l = safeUrl(e.link);
    return `<li class="ev"><div class="ev-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-US', {month: 'short'})}${isPast ? ' ' + d.getFullYear() : ''}</span></div>
      <div>${draftChip(e, 'events')}${sampleChip(e)}<h4>${esc(e.title)}</h4>${e.place ? `<div class="where">${esc(e.place)}</div>` : ''}${e.desc ? `<p>${esc(e.desc)}</p>` : ''}${l ? `<a class="btn sm" href="${esc(l)}" target="_blank" rel="noopener">Details</a>` : ''}</div></li>`; };
  return `<section class="sec" id="events"><div class="sec-in">${secHead(T.nav.events, T.eventsIntro)}
    <div class="ev-main"><div><h3>${esc(T.mainTitle)}</h3><p>${esc(T.mainPlace)}</p></div><p>${esc(T.mainDesc)}</p>${reg ? `<a class="btn" href="${esc(reg)}" target="_blank" rel="noopener">Register</a>` : ''}</div>
    <h3 class="ev-h">Mark your calendar</h3>
    ${up.length ? `<ul class="ev-list">${up.map(e => row(e, false)).join('')}</ul>` : `<div class="empty" style="margin-bottom:34px">No upcoming events yet.</div>`}
    ${past.length ? `<h3 class="ev-h">Where we’ve been</h3><ul class="ev-list">${past.map(e => row(e, true)).join('')}</ul>` : ''}</div></section>`;
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
      <div><div class="plate"><img src="${IMG.golisano}" alt="Upstate Golisano Children’s Hospital"><h3>${esc(T.partnerTitle)}</h3><p>${esc(T.partnerBody)}</p></div></div></div></div></section>`;
}
const SECS = {stories: storiesHTML, wed: wedHTML, impact: impactHTML, board: boardHTML, events: eventsHTML, involve: involveHTML, about: aboutHTML};
const SLUG = {home: 'index.html', events: 'events.html', wall: 'wall-of-miracles.html', involve: 'get-involved.html', about: 'about.html', board: 'meet-the-team.html'};
const polaroid = (photo, caption) => `<figure class="polaroid"><span class="tape" aria-hidden="true"></span><div class="pol-img">${photo ? `<img src="${esc(imgOk(photo))}" alt="">` : daisy()}</div><figcaption>${esc(caption)}</figcaption></figure>`;
function homeHTML() {
  const T = S.text, st = (T.stats || []).filter(x => x.n && x.l), kid = live('kids').find(k => k.photo);
  const td = today(), up = live('events').filter(e => e.date >= td).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  return `<section class="home-hero"><div class="hh-in"><div><h1>${esc(T.homeTitle)}</h1><p class="kick">${esc(T.homeKicker)}</p><p>${esc(T.homeIntro)}</p><a class="btn primary" href="about.html">Learn more</a></div>
      ${polaroid(T.heroPhoto, T.homeCaption)}</div>
      <svg class="wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C240 70 480 0 720 22 S1200 60 1440 14 L1440 60 L0 60Z" fill="var(--bg)"/></svg></section>
    <div class="flowers" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<span style="transform:rotate(${i * 19}deg)">${daisy()}</span>`).join('')}</div>
    <section class="mission"><div class="sec-in"><h2>${esc(T.missionTitle)}</h2><p>${esc(T.missionBody)}</p>
      ${st.length ? `<div class="big-stats">${st.map(x => `<div><b>${esc(x.n)}</b><span>${esc(x.l)}</span></div>`).join('')}</div>` : ''}
      ${T.revealNote ? `<p class="note">${esc(T.revealNote)}</p>` : ''}</div></section>
    <section class="sec-in" style="padding-bottom:20px"><div class="wall-banner"><div><p class="quote-card">${esc(T.wallQuote)}</p><h2>${esc(T.wallTitle)}</h2><p>${esc(T.wallBody)}</p><a class="btn" href="wall-of-miracles.html">Visit the Wall of Miracles</a></div>
      ${polaroid(T.wallPhoto || (kid && kid.photo), 'miracle kid')}</div></section>
    <section class="up"><div class="sec-in">${secHead(T.upcomingTitle, T.upcomingIntro)}
      ${up.length ? `<div class="up-grid">${up.map(e => { const d = dt(e.date); return `<article class="up-card"><div class="d">${d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div><h3>${draftChip(e, 'events')}${sampleChip(e)}${esc(e.title)}</h3>${e.place ? `<div class="where">${esc(e.place)}</div>` : ''}${e.desc ? `<p>${esc(e.desc)}</p>` : ''}</article>`; }).join('')}</div>` : `<div class="empty" style="margin-bottom:26px">New events are on the way.</div>`}
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
      <div class="logos"><img class="logo-tile" src="${IMG.logo}" alt="OttoTHON"><span class="gplate"><img src="${IMG.golisano}" alt="Upstate Golisano Children’s Hospital"></span></div>
      <div class="fbtns">${donateUrl ? `<a class="btn light" href="${esc(donateUrl)}" target="_blank" rel="noopener">Donate</a>` : ''}<a class="btn" href="get-involved.html">Get involved</a></div>
      <p>${esc(T.about)}</p>${T.email ? `<p>Questions? <a href="mailto:${esc(T.email)}">${esc(T.email)}</a></p>` : ''}
      <div class="flinks">${links}</div><small>${esc(T.footer)} <a href="admin/">Team sign-in</a></small></div></footer>`;
  window.scrollTo(0, y);
}
function openStory(id) {
  const s = S.stories.find(x => x.id === id); if (!s) return;
  $('#dlg-body').innerHTML = `<div class="sc-img">${s.photo ? `<img src="${esc(imgOk(s.photo))}" alt="">` : daisy()}</div>
    <span class="chip">${esc(s.category)}</span> ${sampleChip(s)}<h3 id="dlg-title">${esc(s.title)}</h3><p class="hint" style="margin-top:0">${fmt(s.date)}</p>${paras(s.story)}
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
      place: [f.timeLabel, f.place].filter(Boolean).join(' · '), desc: f.desc || '', link: /^https:\/\//.test(f.link || '') ? f.link : ''}));
  return [...manual, ...synced];
}
const toItems = (o, prefix) => ((o && o.items) || []).map((x, i) => ({...x, id: prefix + i, status: x.published === true ? 'published' : 'draft'}));
async function init() {
  const app = document.getElementById('app');
  try {
    const [st, kids, stories, wed, board, events, ways, faq] = await Promise.all(['settings', 'kids', 'stories', 'wednesdays', 'board', 'events', 'ways', 'faq'].map(load));
    // Events synced from the campus feed (optional file; the site works without it).
    let feed = [];
    try { const r = await fetch('content/events-feed.json', {cache: 'no-cache'}); if (r.ok) { const f = await r.json(); feed = Array.isArray(f.items) ? f.items : []; } } catch (e) { /* keep going without it */ }
    const g = k => st[k] || {};
    S = {
      kids: toItems(kids, 'k'), stories: toItems(stories, 's'), wed: toItems(wed, 'w'), board: toItems(board, 'b'),
      events: mergeEvents(toItems(events, 'e'), feed), ways: toItems(ways, 'a'), faq: toItems(faq, 'f'),
      design: {palette: g('theme').palette, font: g('theme').font, daisies: g('theme').daisies !== false, storyLayout: g('theme').storyLayout || 'rail',
        sections: (g('theme').wallSections || []).filter(x => ['stories', 'wed', 'impact'].includes(x.key))},
      text: Object.assign({}, g('home'), g('wall'), g('team'), g('events'), g('involve'), g('about'), g('footer'), {
        donateUrl: g('links').donateUrl || '', registerUrl: g('links').registerUrl || '', email: g('links').email || '',
        heroPhoto: imgOk(g('photos').heroPhoto), wallPhoto: imgOk(g('photos').wallPhoto),
        stats: st.stats || [], impact: st.impact || [], nav: g('nav')})
    };
    ['stories', 'wed', 'impact'].forEach(k => { if (!S.design.sections.some(x => x.key === k)) S.design.sections.push({key: k, show: true}); });
    document.body.insertAdjacentHTML('beforeend', '<dialog id="dlg" aria-labelledby="dlg-title"><div class="dlg-in" id="dlg-body"></div></dialog>');
    document.getElementById('dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    applyTheme();
    renderPublic();
    if (location.hash.length > 1) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView(); }
  } catch (err) {
    console.error(err);
    app.innerHTML = '<div style="max-width:40rem;margin:15vh auto;padding:0 20px;font-family:system-ui,sans-serif"><h1>We couldn’t load this page.</h1><p>Please refresh. If you opened the file straight from your computer, start a local server instead (see the README).</p></div>';
  }
}
init();

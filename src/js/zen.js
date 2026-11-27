/* Trenta e Lode: full-screen focus mode ("zen").
   Offline music → one of the animated 120 s scenes (downloaded once into DataFolder/Media).
   YouTube live radio → the live stream itself fills the screen (the same warm player, so it is instant). */
'use strict';
let zen = false, zenIdle = null;
const ZBG = {
  sakura: { t: 'Sakura garden · night', f: 'lofi-sakura-night.mp4', img: 'sakura-night.jpg' },
  tempio: { t: 'Spring temple · castle in the clouds', f: 'lofi-temple-castle.mp4', img: 'temple-castle.jpg' },
  collina: { t: 'Sunset hill', f: 'lofi-sunset-hill.mp4', img: 'sunset-hill.jpg' },
  fiume: { t: 'Village by the river', f: 'lofi-village-river.mp4', img: 'village-river.jpg' },
  aurora: { t: 'Winter village · aurora', f: 'lofi-winter-aurora.mp4', img: 'winter-aurora.jpg' },
  foresta: { t: 'Sunken forest', f: 'lofi-sunken-forest.mp4', img: 'sunken-forest.jpg' },
};
const BGSTATE = {}, BGPROG = {};
async function refreshBgState() {
  try { Object.assign(BGSTATE, await window.api.bgStatus(Object.values(ZBG).map(b => b.f))); } catch (e) { console.warn(e); }
}
async function bgDownload(file) {
  if (BGPROG[file] != null) return;
  BGPROG[file] = 0;
  const r = await window.api.bgDownload(file);
  delete BGPROG[file];
  if (r && r.ok) { BGSTATE[file] = true; toast('🎞 Background downloaded'); if (zen && (ZBG[S.settings.zenBg] || {}).f === file) zenBuild(); }
  else toast('🎞 Could not download the background (' + ((r && r.error) || 'offline?') + ')');
  if (view === 'pomodoro' && !zen) render();
}
window.api.on('bg:progress', p => {
  if (p.total) BGPROG[p.file] = Math.round(p.got / p.total * 100);
  const el = $('#z-dl'); if (el && (ZBG[S.settings.zenBg] || {}).f === p.file) el.textContent = `Downloading the animated scene… ${BGPROG[p.file] || 0}%`;
});
function zenOn() {
  zen = true; document.body.classList.add('zen');
  window.api.fullscreen(true);
  if (lofiOnline()) { if (!lofiOn) lofiPlay(); }      // online source: its own video becomes the background, instantly
  else if (S.settings.lofi.auto && !lofiOn) lofiPlay();
  zenBuild();
}
function zenBuild() {
  const z = $('#zen'), yt = lofiOnline(), bg = ZBG[S.settings.zenBg] || ZBG.collina, have = BGSTATE[bg.f] === true;
  document.body.classList.toggle('zen-yt', yt); z.classList.remove('novideo');
  const media = yt ? '' : have ? `<video id="zv" src="${OFFL.hubUrl}/Media/${bg.f}" poster="../assets/backgrounds/${bg.img}" autoplay loop muted playsinline></video>`
    : `<img class="zposter" src="../assets/backgrounds/${bg.img}" alt=""><div class="z-dl" id="z-dl">Downloading the animated scene… ${BGPROG[bg.f] || 0}%</div>`;
  z.innerHTML = `${media}<div class="z-shade"></div>
    <div id="z-ring" class="glass"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3.2"/><circle id="z-prog" cx="100" cy="100" r="94" fill="none" stroke-width="3.2" stroke-linecap="round" transform="rotate(-90 100 100)"/></svg>
      <div class="z-in"><div id="z-mode"></div><div id="z-time"></div><div id="z-task" class="ell"></div></div></div>
    <div class="z-side z-left" id="z-left"></div><div class="z-side z-right" id="z-right"></div>
    <div class="z-bar"><button class="zb" data-a="pomo-toggle" id="z-toggle"></button><button class="zb sm" data-a="pomo-skip" title="Skip">${ic('skip', 18)}</button><button class="zb sm" data-a="lofi-toggle-z" title="Music">${ic('music', 18)}</button>${yt ? '' : `<button class="zb sm" data-a="zen-bg" title="Change scene: ${esc(bg.t)}">${ic('image', 18)}</button>`}<button class="zb sm" data-a="zen-off" title="Exit (Esc)">${ic('x', 18)}</button></div>
    <div class="z-brand"><span class="logo-s"></span>Trenta e Lode · Focus${yt ? ' · ' + esc(lofiName()) : ' · ' + esc(bg.t)}</div>`;
  const v = $('#zv'); if (v) v.addEventListener('error', () => z.classList.add('novideo'));
  if (!yt && !have) bgDownload(bg.f);
  zenPanels(); zenLayout(); tick(); zenWake();
}
function zenOff() { if (!zen) return; zen = false; document.body.classList.remove('zen', 'zen-yt'); $('#zen').innerHTML = ''; radioCover(); window.api.fullscreen(false); render(); }
function zenWake() { const z = $('#zen'); if (!z) return; z.classList.remove('idle'); clearTimeout(zenIdle); zenIdle = setTimeout(() => z.classList.add('idle'), 4500); }
window.addEventListener('mousemove', () => zen && zenWake());
// Size the live player like object-fit: cover (16:9), so the stream fills the screen without bars.
function radioCover() {
  const box = $('#radio .rframe'); if (!box) return;
  if (!zen || !lofiOnline()) { box.removeAttribute('style'); return; }
  const w = innerWidth, h = innerHeight, k = Math.max(w / 16, h / 9);
  Object.assign(box.style, { width: 16 * k + 'px', height: 9 * k + 'px', left: (w - 16 * k) / 2 + 'px', top: (h - 9 * k) / 2 + 'px' });
}
function zenLayout() {
  radioCover();
  const ring = $('#z-ring'); if (!ring) return;
  const w = innerWidth, h = innerHeight;
  let cx, cy, R;
  if (lofiOnline()) { R = Math.min(h * 0.13, 150); cx = w - R - 40; cy = R + 40; } // compact, top-right: the stream stays visible
  else { R = Math.min(h * 0.24, 300); cx = w / 2; cy = h * 0.47; }
  Object.assign(ring.style, { left: cx - R + 'px', top: cy - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px' });
  ring.style.setProperty('--fs', (R / 4.2) + 'px');
}
window.addEventListener('resize', () => zen && zenLayout());
function zenTick(txt, frac, col) {
  const p = $('#z-prog'); if (!p) return;
  const C = 2 * Math.PI * 94; p.setAttribute('stroke-dasharray', `${C * frac} ${C}`); p.setAttribute('stroke', P.mode === 'focus' ? '#efcdb7' : '#8cc0a0');
  $('#z-time').textContent = txt; $('#z-mode').textContent = MODE_LABEL[P.mode] + (P.running ? '' : ' · paused');
  $('#z-task').textContent = P.task?.title?.replace(/\*\*/g, '') || 'Free session';
  $('#z-toggle').innerHTML = P.running ? `${ic('pause', 20)}` : `${ic('play', 20)}`;
  const np = nextPrayer(), zp = $('#z-pr'); if (zp) zp.innerHTML = np ? `<b>${esc(np.name)}</b> at ${np.hhmm}<br><span>in ${fmtIn(np.at - Date.now())}</span>` : '';
}
function zenPanels() {
  if (!zen || !$('#z-left')) return;
  const n = pomodoriOn(today()), goal = S.settings.dailyGoal, L = S.settings.lofi;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)).map(d => minutesOn(d)); const wm = Math.max(30, ...week);
  const v = islamicOn() && OFFL.verses.length ? OFFL.verses[(new Date().getDate() * 7 + new Date().getHours()) % OFFL.verses.length] : null;
  $('#z-left').innerHTML = `
    <div class="zp"><small>TODAY</small><div class="row">${donut(n / goal, '#efcdb7', 76, n + '/' + goal)}<div><b style="font-size:20px">${fmtMin(minutesOn(today()))}</b><div class="zs">of focus</div></div></div></div>
    ${islamicOn() && OFFL.prayer ? '<div class="zp"><small>NEXT PRAYER</small><div id="z-pr" class="zbig"></div></div>' : ''}
    <div class="zp"><small>LAST 7 DAYS</small><div class="zbars">${week.map((m, i) => `<i style="height:${8 + m / wm * 52}px" class="${i === 6 ? 'on' : ''}"></i>`).join('')}</div></div>`;
  $('#z-right').innerHTML = `
    <div class="zp"><small>MUSIC</small><div class="row"><span class="eq ${lofiOn ? '' : 'off'}"><i></i><i></i><i></i><i></i></span><div style="min-width:0"><b class="ell" style="display:block">${esc(lofiOn ? lofiName() : 'Music paused')}</b><div class="zs">${esc((LOFI_SRC.find(x => x[0] === L.src) || [])[1] || '')}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="zb sm" data-a="lofi-toggle-z">${lofiOn ? ic('pause', 16) : ic('play', 16)}</button><button class="zb sm" data-a="lofi-next">${ic('skip', 16)}</button><input type="range" min="0" max="1" step="0.05" value="${L.vol}" data-a="lofi-vol" style="flex:1"></div>
      <select data-a="lofi-src-sel" class="zsel">${LOFI_SRC.map(([id, l]) => `<option value="${id}" ${L.src === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
    ${v ? `<div class="zp verse"><small>A VERSE</small><div class="ar">${esc(v.ar.join(' '))}</div><div class="zs" style="margin-top:6px;font-style:italic">${esc(v.en.join(' '))}</div><div class="zs" style="margin-top:4px">${esc(v.surah.tr)} ${esc(v.ref)}</div></div>` : ''}`;
  tick();
}

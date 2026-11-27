/* Trenta e Lode: first-run setup wizard and the interactive tutorial (coach marks). */
'use strict';

// ─── Setup wizard ────────────────────────────────────────────────────────
const ONB = { step: 0, geo: [], pick: null, dl: '' };
function onbOpen(step = 0) { ONB.step = step; $('#onb').classList.remove('hidden'); onbRender(); }
function onbClose() { $('#onb').classList.add('hidden'); }
function onbRender() {
  const s = S.settings, steps = ['Welcome', 'Subjects', 'Prayer times', 'Ready'];
  const dots = `<div class="onb-steps">${steps.map((t, i) => `<span class="${i === ONB.step ? 'on' : i < ONB.step ? 'done' : ''}"><i>${i < ONB.step ? '✓' : i + 1}</i>${t}</span>`).join('')}</div>`;
  let body = '';
  if (ONB.step === 0) body = `
    <div class="onb-hero"><img src="../build/icon.png" alt=""><div><h1>Welcome to Trenta e Lode</h1><p class="muted">A free study planner: your subjects, a plan built from your own files, Pomodoro with lofi focus, flashcards and mock exams${''} — plus prayer times for your city if you want them.</p></div></div>
    <label class="f">What should we call you? (optional)<input type="text" id="onb-name" value="${esc(s.name)}" placeholder="Your first name"></label>
    <div class="f">Theme<div class="seg big"><button class="${s.theme === 'light' ? 'on' : ''}" data-a="onb-theme" data-t="light">${ic('sun', 16)} Light</button><button class="${s.theme === 'dark' ? 'on' : ''}" data-a="onb-theme" data-t="dark">${ic('moon', 16)} Dark</button></div></div>
    <div class="f">Data folder (your files, AI requests, offline data)<div class="row"><code class="ell" style="flex:1">${esc(OFFL.hub)}</code><button class="btn sm" data-a="hub-change">Change…</button></div></div>`;
  if (ONB.step === 1) body = `
    <h2>Which subjects are you studying?</h2><p class="muted">Add one or more now (you can add, rename or remove them later). The exam date lets the app plan backwards from it.</p>
    <form class="onb-add" data-form="onb-subj"><input type="text" name="name" placeholder="Subject name, e.g. Linear Algebra" required><input type="date" name="exam" title="Exam date (optional)"><button class="btn pri">Add</button></form>
    <div class="onb-list">${subjects().map(x => `<div class="row"><span class="dot" style="background:${x.color};width:12px;height:12px"></span><b style="flex:1">${esc(x.name)}</b><span class="small muted">${x.exam ? 'exam ' + fmtDay(x.exam, { day: 'numeric', month: 'short', year: 'numeric' }) : 'no exam date'}</span><button class="btn sm ghost" data-a="subj-edit" data-id="${x.id}">Edit</button></div>`).join('') || '<div class="small faint">No subjects yet.</div>'}</div>`;
  if (ONB.step === 2) body = `
    <h2>Prayer times and Islamic reminders</h2><p class="muted">Prayer times for your city (computed offline), the Hijri calendar, Ramaḍān and ʿĪd styling, and gentle adhkar / Qur’an reminders while you study.</p>
    <div class="seg big"><button class="${islamicOn() ? 'on' : ''}" data-a="onb-islamic" data-v="1">Yes, turn them on</button><button class="${!islamicOn() ? 'on' : ''}" data-a="onb-islamic" data-v="0">No thanks</button></div>
    ${islamicOn() ? `<form class="row" data-form="onb-geo" style="margin-top:14px"><input type="text" name="q" placeholder="Search your city…" style="flex:1" required><button class="btn sm pri">Search</button></form>
      <div class="onb-geo">${ONB.geo.map((g, i) => `<button class="geo-row ${ONB.pick === g ? 'on' : ''}" data-a="onb-geo-pick" data-i="${i}">📍 <b>${esc(g.name)}</b> <span class="muted">${esc(g.region)}</span></button>`).join('')}</div>
      ${s.location ? `<div class="small" style="margin-top:8px">✓ <b>${esc(s.location.name)}</b> · ${esc(METHODS[s.location.method] || s.location.method)} (you can change the method in Prayers)</div>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn sm" data-a="content-dl">Download adhkar & Qur’an passages (≈ 5 MB)</button><span id="dl-prog" class="small muted">${esc(ONB.dl)}</span></div>` : ''}`;
  if (ONB.step === 3) body = `
    <h2>You are ready${s.name ? ', ' + esc(s.name) : ''}!</h2>
    <ol class="onb-how"><li><b>Materials</b>: upload your files, one folder per topic.</li><li>Press <b>Reload</b>: the app builds your plan, tasks and calendar until the exam.</li><li>Optional: <b>Ask an AI</b> (Claude, ChatGPT or Gemini) for topics, YouTube videos and flashcards.</li><li>Study with the <b>Pomodoro</b>, tick tasks off, and see them in <b>Completed</b>.</li></ol>
    <p class="muted">A short guided tour shows you where everything is. You can replay it any time from the <b>?</b> button.</p>`;
  $('#onb .onb-box').innerHTML = `${dots}<div class="onb-body">${body}</div>
    <div class="row onb-foot">${ONB.step ? '<button class="btn ghost" data-a="onb-back">← Back</button>' : ''}<span class="sp"></span>
      ${ONB.step < 3 ? `<button class="btn pri" data-a="onb-next">${ONB.step === 1 && !hasSubjects() ? 'Skip for now' : 'Next'} →</button>` : '<button class="btn ghost" data-a="onb-finish">Skip the tour</button><button class="btn cta" data-a="onb-finish" data-tour="1">Start the tour</button>'}</div>`;
}
async function onbAction(a, d, el) {
  if (a === 'onb-next') { if (ONB.step === 0) { S.settings.name = ($('#onb-name')?.value || '').trim(); save(); } ONB.step++; onbRender(); }
  if (a === 'onb-back') { ONB.step--; onbRender(); }
  if (a === 'onb-theme') { S.settings.theme = d.t; document.body.classList.toggle('light', d.t === 'light'); save(); sendPrefs(); onbRender(); }
  if (a === 'onb-islamic') { S.settings.islamic = d.v === '1'; save(); sendPrefs(); onbRender(); }
  if (a === 'onb-geo-pick') { const g = ONB.geo[+d.i]; ONB.pick = g; await setLocation(g); onbRender(); }
  if (a === 'onb-finish') { S.onboarded = true; save(); onbClose(); topbar(); go('today'); if (d.tour) setTimeout(() => tourStart(), 300); }
}
async function setLocation(g, method, madhab) {
  const loc = { name: g.name, region: g.region, lat: g.lat, lon: g.lon, tz: g.tz, cc: g.cc, method: method || g.method, madhab: madhab || g.madhab };
  S.settings.location = loc; save();
  await window.api.prayerSet(loc);
  sendPrefs();
  OFFL = { ...OFFL, ...(await window.api.offline()) };
  applyHoliday();
  toast('📍 Prayer times for ' + g.name + ' ready');
}

// ─── Guided tour ─────────────────────────────────────────────────────────
const TOUR = [
  { sel: '#subj', title: 'Your subjects', text: 'Switch between your subjects here, or add a new one. Each subject has its own plan, topics, flashcards and exams.' },
  { view: 'today', sel: '[data-nav=today]', title: 'Today', text: 'Your dashboard: today’s tasks, the countdown to the exam, your readiness, the week and the next prayer.' },
  { view: 'materials', sel: '#dz', title: '1 · Upload your files', text: 'Write a topic (it becomes a folder), then drop lecture notes, slides or exercises here. Repeat for every topic.' },
  { view: 'materials', sel: '.reload-card', title: '2 · Build the plan', text: 'Press Reload: every file becomes a study or practice task, every topic gets a review, and everything is spread until your exam date.' },
  { view: 'materials', sel: '.ai-card', title: '3 · Ask an AI (optional)', text: 'Claude, ChatGPT or Gemini can read your files and add real topics, objectives, YouTube lectures and flashcards. Paste their answer back here.' },
  { view: 'plan', sel: '.weeks', title: 'Study plan', text: 'The calendar of your plan. Click a day to see its tasks; late tasks can be moved to the lightest day with ⇥.' },
  { view: 'pomodoro', sel: '.pomo', title: 'Pomodoro', text: 'Focus for 25 minutes, then a break. Link a task so the time is counted on its subject and topic.' },
  { view: 'pomodoro', sel: '.zen-card', title: 'Full-screen focus', text: 'Choose an animated scene and go full screen. With a YouTube lofi radio selected, the live stream itself becomes the background.' },
  { view: 'pomodoro', sel: '.lofi-card', title: 'Lofi music', text: 'Offline generated lofi, or Lofi Girl / Chillhop live radios: the app always finds the stream that is live now.' },
  { view: 'done', sel: '[data-nav=done]', title: 'Completed', text: 'Everything you tick off ends up here, grouped by day — including the tasks you caught up on late.' },
  { view: 'prayers', sel: '[data-nav=prayers]', title: 'Prayers', text: 'Prayer times for your city, the Hijri calendar, Ramaḍān and ʿĪd, and the adhkar / Qur’an reminders.', if: () => islamicOn() },
  { sel: '.search', title: 'Search and commands', text: 'Press Ctrl K to jump to any page, topic, to-do or flashcard.' },
  { sel: '[data-a=tour]', title: 'That’s it!', text: 'Replay this tour any time from here. Good luck with your exams!' },
];
let TI = 0;
function tourStart() { TI = 0; tourShow(); }
function tourEnd() { $('#tour').classList.add('hidden'); S.toured = true; save(); }
function tourShow() {
  while (TI < TOUR.length && TOUR[TI].if && !TOUR[TI].if()) TI++;
  if (TI >= TOUR.length) return tourEnd();
  const st = TOUR[TI];
  if (st.view && view !== st.view) go(st.view);
  requestAnimationFrame(() => setTimeout(() => {
    const el = document.querySelector(st.sel), t = $('#tour');
    t.classList.remove('hidden');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2 - 100, top: innerHeight / 2 - 40, width: 200, height: 80 };
    const m = 8, hole = t.querySelector('.hole'), bub = t.querySelector('.bubble');
    Object.assign(hole.style, { left: r.left - m + 'px', top: r.top - m + 'px', width: r.width + 2 * m + 'px', height: r.height + 2 * m + 'px' });
    bub.innerHTML = `<small>${TI + 1} / ${TOUR.length}</small><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>
      <div class="row">${TI ? '<button class="btn sm ghost" data-a="tour-prev">Back</button>' : ''}<span class="sp"></span><button class="btn sm ghost" data-a="tour-end">Skip</button><button class="btn sm pri" data-a="tour-next">${TI === TOUR.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    const bw = 340, bh = bub.offsetHeight || 170;
    let x = r.left + r.width + 18, y = r.top;
    if (x + bw > innerWidth - 12) x = r.left - bw - 18;
    if (x < 12) { x = Math.min(Math.max(12, r.left), innerWidth - bw - 12); y = r.top + r.height + 18; if (y + bh > innerHeight - 12) y = r.top - bh - 18; }
    y = Math.min(Math.max(12, y), innerHeight - bh - 12);
    Object.assign(bub.style, { left: x + 'px', top: y + 'px' });
  }, 120));
}
window.addEventListener('resize', () => { if (!$('#tour').classList.contains('hidden')) tourShow(); });

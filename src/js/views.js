/* Trenta e Lode: navigation and every page of the app. */
'use strict';

// ─── Navigation ──────────────────────────────────────────────────────────
const VIEWS = () => [
  ['Study', [['today', 'Today'], ['plan', 'Study plan'], ['todo', 'To-do'], ['done', 'Completed'], ['pomodoro', 'Pomodoro']]],
  ['Subject', [['topics', 'Topics'], ['videos', 'Videos'], ['review', 'Flashcards'], ['mocks', 'Mock exams'], ['mistakes', 'Mistakes log'], ['formulas', 'Formula sheet']]],
  ['You', [['stats', 'Statistics'], ...(islamicOn() ? [['prayers', 'Prayers']] : []), ['materials', 'Materials']]],
];
const VIEW_TITLE = () => Object.fromEntries([...VIEWS().flatMap(g => g[1]), ['settings', 'Settings']]);
let view = 'today', sub = {};
function go(v, extra = {}) { view = v; sub = extra; closeDrops(); render(); $('#view').scrollTop = 0; }
let sub_menu = false;
function menu() {
  const od = overdue().length, due = dueCards().length, d = SUBJ.def;
  const b = id => id === 'today' && od ? `<span class="badge">${od}</span>` : id === 'review' && due ? `<span class="badge acc">${due}</span>` : id === 'prayers' && HOL ? `<span class="badge gold">☪</span>` : '';
  $('#subj').innerHTML = hasSubjects() ? `<button class="subj-btn" data-a="subj-menu"><span class="sw" style="background:${d.color}">${esc(d.name.slice(0, 2))}</span><span class="nm"><b>${esc(short(d))}</b><small>${esc(d.code ? d.code + ' · ' : '')}${d.exam ? (d.exam >= today() ? 'exam ' + fmtDay(d.exam, { day: 'numeric', month: 'short' }) : 'exam done') : 'no exam date'}</small></span>${ic('chevron', 16)}</button>
    <div class="subj-list ${sub_menu ? 'on' : ''}">${subjects().map(s => `<button class="${s.id === CUR ? 'on' : ''}" data-a="subj-pick" data-id="${s.id}"><span class="dot" style="background:${s.color}"></span><span><b>${esc(s.name)}</b><small>${esc(s.code || '')}${s.exam ? (s.code ? ' · ' : '') + 'exam ' + fmtDay(s.exam, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></span></button>`).join('')}
      <button data-a="subj-add" class="add"><span class="dot" style="background:transparent;border:1.5px dashed currentColor"></span><span><b>+ Add a subject</b></span></button></div>`
    : `<button class="subj-btn" data-a="subj-add"><span class="sw" style="background:var(--accent)">+</span><span class="nm"><b>Add a subject</b><small>to start planning</small></span></button>`;
  $('#menu').innerHTML = VIEWS().map(([g, items]) => `<div class="grp">${g}</div>` + items.map(([id, t]) => `<button class="${view === id ? 'on' : ''}" data-go="${id}" data-nav="${id}"><span class="ic">${ic(id, 19)}</span><span class="lb">${t}</span>${b(id)}</button>`).join('')).join('')
    + `<button class="${view === 'settings' ? 'on' : ''}" data-go="settings" data-nav="settings" style="margin-top:6px"><span class="ic">${ic('settings', 19)}</span><span class="lb">Settings</span></button>`;
}
function topbar() {
  const th = S.settings.theme;
  $('#top').innerHTML = `
    <div class="search">${ic('search', 17)}<input id="q" type="text" placeholder="Search or type a command…" autocomplete="off"><kbd>Ctrl K</kbd><div id="q-res" class="drop"></div></div>
    <span class="sp"></span>
    <button class="chip-btn" id="tp-prayer" data-go="prayers" title="Next prayer" style="display:none"></button>
    <div class="seg" title="Theme"><button class="${th === 'light' ? 'on' : ''}" data-a="theme" data-t="light">${ic('sun', 15)} Light</button><button class="${th === 'dark' ? 'on' : ''}" data-a="theme" data-t="dark">${ic('moon', 15)} Dark</button></div>
    ${islamicOn() ? `<div class="bell-wrap"><button class="icon-btn" data-a="bell" title="Reminders">${ic('bell', 19)}${S.unseen ? '<i class="ping"></i>' : ''}</button><div id="bell" class="drop right"></div></div>` : ''}
    <button class="icon-btn" data-a="zen" title="Full-screen focus with lofi">${ic('lofi', 19)}</button>
    <button class="icon-btn" data-a="tour" title="Tutorial">?</button>
    <button class="btn cta" data-a="quick-add">${ic('plus', 16)} New task</button>
    <div class="wctl"><button data-w="min" title="Minimise"><svg viewBox="0 0 12 12"><path d="M2 6.5h8"/></svg></button><button data-w="max" title="Maximise / restore"><svg viewBox="0 0 12 12"><rect x="2.2" y="2.2" width="7.6" height="7.6" rx="1.6"/></svg></button><button data-w="close" class="x" title="Close"><svg viewBox="0 0 12 12"><path d="m2.5 2.5 7 7m0-7-7 7"/></svg></button></div>`;
}
function render() {
  menu();
  const el = $('#view');
  el.innerHTML = holidayBanner() + (V[view] || V.today)();
  math(el);
  tick();
  (AFTER[view] || (() => {}))();
}
const AFTER = {};
function closeDrops() { sub_menu = false; document.querySelectorAll('.drop.on').forEach(d => d.classList.remove('on')); }

// ─── Shared pieces ───────────────────────────────────────────────────────
function resChips(res) {
  return (res || []).map(r => {
    const [key, pages] = r.split(':');
    const R = RES[key]; if (!R) return '';
    return `<span class="pill res" data-pdf="${key}" ${pages ? `data-page="${pages.split('-')[0]}"` : ''}>${ic('file', 13)} ${esc(R.t)}${pages ? ' p. ' + esc(pages.replace('-', '–')) : ''}</span>`;
  }).join('');
}
function taskRow(t, { showDate = false } = {}) {
  const top = topicById[t.topic];
  const vid = t.video ? VIDEOS.find(v => v.id === t.video) : null;
  return `<div class="task ${t.done ? 'done' : ''}">
    <button class="chk" data-a="plan-toggle" data-k="${esc(t.key)}" title="Done"></button>
    <div class="body">
      <div class="ttl">${md(t.title)}</div>
      <div class="meta">
        <span class="kind k-${t.kind}">${KIND[t.kind] || esc(t.kind)}</span>
        ${top ? `<span class="pill"><span class="dot" style="background:${top.color}"></span>${esc(top.t)}</span>` : ''}
        ${t.p ? `<span class="pill">🍅 ${t.p} · ${fmtMin(t.p * S.settings.focus)}</span>` : ''}
        ${showDate ? `<span class="pill">📅 ${fmtDay(t.date)}</span>` : ''}
        ${t.from ? `<span class="pill">↪ from ${fmtDay(t.from)}</span>` : ''}
        ${vid ? `<span class="pill res" data-go="videos" data-vid="${vid.id}">▶ ${esc(vid.t)}</span>` : ''}
        ${resChips(t.res)}
      </div>
    </div>
    <div class="acts">
      ${t.p && !t.done ? `<button class="btn sm" data-a="focus-task" data-k="${esc(t.key)}" data-date="${t.date}" title="Start a Pomodoro on this task">🍅</button>` : ''}
      ${!t.done && t.p ? `<button class="btn sm ghost" data-a="plan-move" data-k="${esc(t.key)}" title="Move to the lightest day">⇥</button>` : ''}
    </div>
  </div>`;
}
// Tick / untick a plan task, with a sound that grows as you get closer to a goal.
function planToggle(k) {
  const cur = S.plan[k]?.done, t = today();
  const ph0 = PHASES.map(p => phaseProgress(p).pct), od0 = overdue().length;
  S.plan[k] = { done: !cur, at: Date.now() }; save();
  if (cur) { SFX.untick(); return render(); }
  const tt = planTasks(t), inToday = tt.some(x => x.key === k);
  const phaseDone = PHASES.find((p, i) => ph0[i] < 1 && phaseProgress(p).pct >= 1);
  if (phaseDone) { SFX.milestone(); toast('Phase complete: ' + phaseDone.t + '! 🏆'); }
  else if (inToday && tt.every(x => x.done) && GEN.allDone(t)) { SFX.dayDone(); toast('Today’s plan is complete! 🎉 Great work'); }
  else if (od0 && !overdue().length) { SFX.goal(); toast('All caught up! ✓'); }
  else {
    const w = x => x.p || 1, tot = tt.reduce((a, x) => a + w(x), 0), dn = tt.filter(x => x.done).reduce((a, x) => a + w(x), 0);
    SFX.tick(inToday && tot ? dn / tot : 0.3); toast('Done! ✓ You will find it in Completed');
  }
  render();
}
// A day crossed out with an X in the study plan (double right-click on the day).
let crossFresh = null;
function crossMark(d) {
  return `<svg class="xmark ${d === crossFresh ? 'fresh' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M14 14 L86 86"/><path pathLength="1" d="M86 14 L14 86"/></svg>`;
}
function toggleCross(d) {
  if (S.crossed[d]) delete S.crossed[d]; else { S.crossed[d] = Date.now(); crossFresh = d; }
  SFX.cross(!!S.crossed[d]); save();
  const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; crossFresh = null;
}
function findPlanTask(key, date) { return planTasks(date).find(t => t.key === key); }
function nextExam() { return S.exams.find(e => e.date >= today() && S.outcome[e.id] !== 'skip') || S.exams[S.exams.length - 1]; }
function donut(p, col, size = 66, label = null) {
  const r = size / 2 - 6, C = 2 * Math.PI * r;
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--panel3)" stroke-width="6"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * Math.min(1, p)} ${C}"/></svg><b>${label ?? Math.round(p * 100) + '%'}</b></div>`;
}
function gauge(p) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, p))), cx = 70, cy = 66, r = 52;
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a), nx = cx + (r - 16) * Math.cos(a), ny = cy - (r - 16) * Math.sin(a);
  return `<svg width="140" height="84" viewBox="0 0 140 84"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#f6b766"/><stop offset="1" stop-color="#ef8f4e"/></linearGradient></defs>
    <path d="M18 66 A52 52 0 0 1 122 66" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="12" stroke-linecap="round"/>
    <path d="M18 66 A52 52 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#3b2519" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="#fff" stroke="#3b2519" stroke-width="3"/></svg>`;
}
const subjDot = s => `<span class="pill"><span class="dot" style="background:${s.color}"></span>${esc(short(s))}</span>`;

// ─── Views ───────────────────────────────────────────────────────────────
const V = {};

V.today = () => {
  const t = today(), tasks = planTasks(t), od = overdue(), d = SUBJ.def;
  const ph = phaseOf(t), pp = ph ? phaseProgress(ph) : planProgress(t);
  const tot = tasks.reduce((a, x) => a + x.p, 0), dn = tasks.filter(x => x.done).reduce((a, x) => a + x.p, 0);
  const pomos = pomodoriOn(t), goal = Math.max(S.settings.dailyGoal, tot);
  const todos = S.todos.filter(x => !x.done && x.due && x.due <= addDays(t, 3)).sort((a, b) => a.due.localeCompare(b.due));
  const due = dueCards().length, ne = nextExam(), it = islToday();
  const hour = new Date().getHours(), nm = S.settings.name ? ', ' + esc(S.settings.name) : '';
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const nextTask = tasks.find(x => !x.done && x.p) || od[0];
  const rd = readiness(), deltaToday = pomodoriOn(t);
  const heroNum = ne ? daysBetween(t, ne.date) : null;
  const heroLbl = !ne ? (hasSubjects() ? 'No exam date yet · add one in Settings' : 'Add a subject to start') : heroNum < 0 ? `Exam session over · the last one was on ${fmtDay(ne.date, { day: 'numeric', month: 'long' })}` : heroNum === 0 ? 'Today is the day: good luck!' : `Days to the ${esc(ne.t.toLowerCase())}`;
  const ws = addDays(t, -((parse(t).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const agenda = [];
  for (const s of subjects()) if (s.exam && s.exam >= t && daysBetween(t, s.exam) <= 90) agenda.push([s.exam, 'Exam · ' + s.name, 'exam', s.color]);
  for (const e of S.exams) if (e.id !== 'main') { if (e.date >= t && daysBetween(t, e.date) <= 60) agenda.push([e.date, e.t, 'exam', 'var(--bad)']); if (e.oral && e.oral >= t && daysBetween(t, e.oral) <= 60) agenda.push([e.oral, 'Oral exam', 'oral', 'var(--plum)']); }
  if (islamicOn() && OFFL.prayer) for (const h of ISL.upcoming(OFFL.prayer, t, S.settings.hijriOffset, 3)) if (daysBetween(t, h.start) <= 120) agenda.push([h.start, h.name, 'holiday', 'var(--gold)']);
  for (const x of S.todos.filter(y => !y.done && y.due && y.due >= t && daysBetween(t, y.due) <= 14)) agenda.push([x.due, x.title, 'deadline', 'var(--warn)']);
  agenda.sort((a, b) => a[0].localeCompare(b[0]));
  const pr = islamicOn() && OFFL.prayer && ISL.times(OFFL.prayer, t), np = nextPrayer(), cur = pr && ISL.current(OFFL.prayer);
  const cardsLearned = Object.values(S.cards).filter(c => c.int >= 4).length;
  return `
  <section class="hello">
    <div class="greet">
      <div class="eyebrow">${hasSubjects() ? `<span class="chip"><span class="dot" style="background:${d.color}"></span>${esc(short(d))}</span>` : ''}<span>${fmtDay(t, { weekday: 'long', day: 'numeric', month: 'long' })}</span>${it.text ? `<span class="faint">· ${esc(it.text)}</span>` : ''}</div>
      <h1 class="hi">${hello}${nm}!<br>What are we studying today?</h1>
      <p class="muted">${tasks.length ? `Planned: <b>${plural(tasks.length, 'task')}</b>, ${tot} 🍅 (${fmtMin(tot * S.settings.focus)}).` : 'Nothing planned for today.'}${PLAN[t]?.note ? ' · <b>' + esc(PLAN[t].note) + '</b>' : ''}</p>
    </div>
    <div class="actions">
      <button class="act add" data-a="quick-add" title="New task">${ic('plus', 22)}</button>
      <button class="act" data-a="start-next">${ILL.timer}<b>Start a Pomodoro</b><small>${esc(nextTask ? nextTask.title.replace(/\*\*/g, '') : 'Free session')}</small></button>
      <button class="act" data-go="review">${ILL.cards}<b>Flashcards</b><small>${due ? due + ' cards for today' : CARDS.length ? 'All reviewed 🎉' : 'None yet'}</small></button>
      <button class="act" data-a="zen">${ILL.lofi}<b>Lofi focus</b><small>Full screen + music</small></button>
    </div>
  </section>
  ${hasSubjects() ? '' : welcomeCard()}
  <section class="hero-row">
    <div class="hero">
      <div class="h-l">
        <div class="lbl">${heroLbl}</div>
        <div class="num">${heroNum === null ? '—' : heroNum < 0 ? '✓' : heroNum}</div>
        <div class="hstats">
          <div><span class="hi-ic">☆</span><div><small>${ph ? 'Current phase' : 'Plan so far'}</small><b>${pp.tot ? Math.round(pp.pct * 100) + '%' : '—'}</b></div></div>
          <div><span class="hi-ic">↗</span><div><small>Today</small><b>${pomos}/${goal} 🍅</b></div></div>
          <div><span class="hi-ic">🔥</span><div><small>Streak</small><b>${streak()} d</b></div></div>
        </div>
      </div>
      <div class="h-ill">${ILL.desk}</div>
      <button class="hero-tab" data-go="plan">SEE THE PLAN ${ic('arrow', 16)}</button>
    </div>
    <div class="peach">
      <div class="lbl">Exam readiness</div>
      <div class="row" style="align-items:flex-start"><div class="num">${Math.round(rd * 100)}${deltaToday ? '<sup>+' + deltaToday + '</sup>' : ''}</div><span class="sp"></span>${gauge(rd)}</div>
      <p>Combines checklists, consolidated flashcards, plan progress and your self-assessment. ${rd < 0.5 ? '<b>Keep going</b>: every Pomodoro counts.' : '<b>Great pace</b>: aim for top marks.'}</p>
      <div class="learn" data-a="start-next"><span class="plane">➤</span><span>Next step:<br><b>${esc(nextTask ? nextTask.title.replace(/\*\*/g, '') : 'Review flashcards')}</b></span><span class="sp"></span><span class="play">${ic('play', 16)}</span></div>
    </div>
  </section>
  <section class="dash">
    <div class="card today-tasks">
      <div class="row"><h2>Today’s plan</h2><span class="sp"></span><span class="pill">${dn}/${tot} 🍅</span><button class="btn sm ghost" data-go="plan">Calendar</button></div>
      ${tasks.length ? tasks.map(x => taskRow(x)).join('') : isEmptySubject() ? noData('No plan for this subject yet.') : '<div class="empty">Nothing planned for today. Use the time for flashcards or your Mistakes log.</div>'}
      ${GEN.section(t)}
      ${od.length ? `<div style="margin-top:18px" class="row"><h3 style="color:var(--bad);margin:0">To catch up (${od.length})</h3><span class="sp"></span><button class="btn sm ghost" data-go="done">✓ Completed</button><button class="btn sm" data-a="resched-all">Reschedule all</button></div>
        ${od.slice(0, 6).map(x => taskRow(x, { showDate: true })).join('')}${od.length > 6 ? `<div class="muted small">…and ${od.length - 6} more</div>` : ''}` : ''}
    </div>
    <div class="card cal">
      <div class="row"><h2 style="margin:0">${parse(t).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</h2><span class="sp"></span><button class="icon-btn sm" data-go="plan">${ic('arrow', 16)}</button></div>
      <div class="wstrip">${week.map(x => `<div class="${x === t ? 'on' : ''} ${agenda.some(a => a[0] === x) ? 'has' : ''}"><small>${fmtDay(x, { weekday: 'short' }).slice(0, 3)}</small><b>${parse(x).getDate()}</b></div>`).join('')}</div>
      <div class="agenda">${agenda.slice(0, 6).map(([dd, tt, k, c]) => `<div class="ev"><div class="when">${dd === t ? 'Today' : fmtDay(dd, { day: 'numeric', month: 'short' })}<i></i></div><div class="row"><span class="ev-ic" style="background:${c}"></span><div style="min-width:0"><b class="ell">${esc(tt)}</b><small>${k} · in ${daysBetween(t, dd)} d</small></div></div></div>`).join('') || '<div class="muted small">Nothing on the agenda.</div>'}</div>
    </div>
    ${islamicOn() ? `<div class="card prayers-card">
      <div class="row"><h2 style="margin:0">Prayers</h2><span class="sp"></span><button class="btn sm ghost" data-go="prayers">All</button></div>
      ${pr && np ? `<div class="np"><div><small>Next</small><b>${esc(np.name)}</b><span class="ar">${np.ar}</span></div><div class="np-t"><b>${np.hhmm}</b><small>in ${fmtIn(np.at - Date.now())}</small></div></div>
        <div class="plist">${ISL.PRAYERS.map(p => `<div class="${cur && cur.k === p.k ? 'cur' : ''} ${np && np.k === p.k && np.date === t ? 'nx' : ''}"><span>${p.name}</span><b>${pr[p.k]}</b></div>`).join('')}</div>` : `<div class="muted small" style="margin:8px 0">Choose your city to see the prayer times.</div><button class="btn sm pri" data-go="prayers">Set location</button>`}
    </div>` : ''}
    <div class="card mini-stat"><div class="row">${donut(pp.pct, ph ? ph.color : 'var(--accent)')}<div style="min-width:0"><small class="cap" style="color:${ph ? ph.color : 'var(--accent)'}">${ph ? 'Phase' : 'Plan'}</small><b class="ell">${esc(ph ? ph.t : hasSubjects() ? short(d) : '—')}</b><div class="small muted">${ph ? `${fmtDay(ph.from, { day: 'numeric', month: 'short' })} → ${fmtDay(ph.to, { day: 'numeric', month: 'short' })}` : `${pp.done}/${pp.tot} 🍅 done so far`}</div></div></div>
      ${ph ? `<ul class="small goals">${ph.goals.slice(0, 3).map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}</div>
    <div class="card mini-stat"><div class="row">${donut(CARDS.length ? cardsLearned / CARDS.length : 0, 'var(--terra)')}<div><small class="cap" style="color:var(--terra)">Flashcards</small><b>${cardsLearned}/${CARDS.length} consolidated</b><div class="small muted">${due} to review today</div></div></div>
      <div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn sm pri" data-go="review">Review</button></div></div>
    <div class="card deadlines"><div class="row"><h2 style="margin:0">Deadlines</h2><span class="sp"></span><button class="btn sm ghost" data-go="todo">To-do</button></div>
      ${todos.length ? todos.map(x => { const sd = subjDef(x.subj); return `<div class="row small" style="padding:5px 0"><span class="dot" style="background:${x.due < t ? 'var(--bad)' : x.due === t ? 'var(--warn)' : 'var(--ok)'}"></span><span class="ell" style="flex:1">${esc(x.title)}</span><span class="sw-mini" style="background:${sd.color}" title="${esc(sd.name)}"></span><span class="faint">${x.due === t ? 'today' : fmtDay(x.due)}</span></div>`; }).join('') : '<div class="small muted">No deadlines in the next 3 days.</div>'}
      <form class="row" data-form="quick-todo" style="margin-top:10px"><input type="text" name="q" placeholder="Add… e.g. “redo exercise 12 fri !”" style="flex:1"></form></div>
  </section>`;
};

V.plan = () => {
  if (isEmptySubject()) return `<h1>Study plan</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('The plan is built from the files you upload.');
  const t = today(), dates = allPlanDates();
  const from = PHASES[0]?.from || (dates[0] < t ? dates[0] : t);
  const sel = sub.day || (PLAN[t] ? t : dates.find(x => x >= t) || from);
  const start = parse(from); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = [...S.exams.map(e => e.oral || e.date), dates[dates.length - 1]].filter(Boolean).sort().pop() || addDays(t, 30);
  const ex = Object.fromEntries(S.exams.flatMap(e => [[e.date, e.t], ...(e.oral ? [[e.oral, 'Oral exam']] : [])]));
  const hols = islamicOn() && OFFL.prayer ? Object.fromEntries(ISL.upcoming(OFFL.prayer, iso(start), S.settings.hijriOffset, 20).flatMap(h => { const o = []; for (let x = h.start; x <= h.end; x = addDays(x, 1)) o.push([x, h]); return o; })) : {};
  const cells = ['<div></div>', ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="hd">${x}</div>`)];
  for (let d = iso(start); d <= end; d = addDays(d, 1)) {
    const dt = parse(d);
    if ((dt.getDay() + 6) % 7 === 0) cells.push(`<div class="wk">${dt.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}</div>`);
    const tasks = planTasks(d), tot = tasks.reduce((a, x) => a + x.p, 0), dn = tasks.filter(x => x.done).reduce((a, x) => a + x.p, 0);
    const ph = phaseOf(d), h = hols[d];
    cells.push(`<div class="day ${d === t ? 'today' : ''} ${d === sel ? 'sel' : ''} ${d < t ? 'past' : ''} ${ex[d] ? 'exam' : ''} ${h ? 'hol-' + h.kind : ''} ${S.crossed[d] ? 'crossed' : ''}" data-a="sel-day" data-d="${d}">
      <div class="n">${dt.getDate()}${dt.getDate() === 1 ? ' ' + dt.toLocaleDateString(LOCALE, { month: 'short' }) : ''}${h ? ' <span class="hmark" title="' + esc(h.name) + '">☾</span>' : ''}</div>
      ${ph ? `<span class="ph" style="background:${ph.color}"></span>` : ''}
      <div class="note">${esc(ex[d] || PLAN[d]?.note || (tasks.length ? plural(tasks.length, 'task') : ''))}</div>
      ${tot ? `<div class="small faint">${tot} 🍅</div><div class="fill" style="width:${dn / tot * 100}%"></div>` : ''}
      ${S.crossed[d] ? crossMark(d) : ''}
    </div>`);
  }
  const tasks = planTasks(sel), ne = nextExam();
  return `
  <div class="row"><div><h1>Study plan</h1><p class="sub">${ne && ne.date >= t ? `From ${fmtDay(from, { day: 'numeric', month: 'long' })} to the exam on ${fmtDay(ne.date, { day: 'numeric', month: 'long' })}.` : esc(SUBJ.def.name) + '.'} Click a day for details; double right-click it to cross it out.${SUBJ.auto ? ` Built from your files on ${fmtDay(SUBJ.auto.gen, { day: 'numeric', month: 'short' })}: press <b>Reload</b> in Materials after adding files.` : ''}</p></div>
    <span class="sp"></span>${S.exams.some(e => e.date > t) ? '<button class="btn" data-a="recovery">Catch-up plan for the next exam…</button>' : ''}</div>
  ${PHASES.length ? `<div class="grid g3" style="margin-bottom:16px">${PHASES.map(p => { const q = phaseProgress(p); return `<div class="card tight phase" data-a="sel-day" data-d="${p.from}" style="--c:${p.color}">
    <div class="row">${donut(q.pct, p.color, 46)}<div style="min-width:0;flex:1"><b class="ell">${esc(p.t)}</b><div class="small muted">${fmtDay(p.from)} → ${fmtDay(p.to)} · ${q.tot} 🍅</div></div></div></div>`; }).join('')}</div>` : ''}
  <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
    <div class="card"><div class="weeks">${cells.join('')}</div></div>
    <div class="card" style="position:sticky;top:0">
      <h2>${fmtDay(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      ${hols[sel] ? `<p class="small" style="color:var(--gold);margin-top:-6px">☾ ${esc(hols[sel].name)}</p>` : ''}
      ${PLAN[sel]?.note ? `<p class="muted" style="margin-top:-6px">${esc(PLAN[sel].note)}</p>` : ''}
      ${tasks.length ? tasks.map(x => taskRow(x)).join('') : '<div class="empty">No tasks.</div>'}
      ${GEN.section(sel)}
      ${(() => { const ph = phaseOf(sel); return ph ? `<h3 style="margin-top:16px">Phase goals</h3><ul class="small" style="padding-left:18px;margin:0">${ph.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''; })()}
    </div>
  </div>`;
};

// ─── Completed: everything ticked off (plan tasks + to-dos), newest first ───
function doneItems() {
  const out = [];
  for (const d of allPlanDates()) for (const t of planTasks(d)) if (t.done) out.push({ type: 'plan', at: S.plan[t.key]?.at || parse(t.date).getTime(), t });
  for (const x of S.todos) if (x.done) out.push({ type: 'todo', at: x.doneAt || x.created || 0, x });
  return out.sort((a, b) => b.at - a.at);
}
V.done = () => {
  const f = sub.f || 'all', per = sub.per || 'ever', t = today();
  const all = doneItems();
  const since = per === 'today' ? parse(t).getTime() : per === 'week' ? parse(addDays(t, -6)).getTime() : 0;
  const list = all.filter(i => (f === 'all' || i.type === f) && i.at >= since);
  const dayOf = ms => iso(new Date(ms));
  const nToday = all.filter(i => dayOf(i.at) === t).length, nWeek = all.filter(i => i.at >= parse(addDays(t, -6)).getTime()).length;
  const pomo = all.filter(i => i.type === 'plan').reduce((a, i) => a + (i.t.p || 0), 0);
  const late = all.filter(i => i.type === 'plan' && dayOf(i.at) > (i.t.from || i.t.date)).length;
  const groups = {};
  for (const i of list) (groups[dayOf(i.at)] ||= []).push(i);
  const chip = (k, v, l, def) => `<button class="chip ${(sub[k] || def) === v ? 'on' : ''}" data-a="done-filter" data-k="${k}" data-v="${v}">${l}</button>`;
  const time = ms => new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const row = i => {
    if (i.type === 'todo') { const x = i.x;
      return `<div class="task done"><button class="chk" data-a="todo-toggle" data-id="${x.id}" title="Mark as not done"></button><div class="body"><div class="ttl">${esc(x.title)}</div>
        <div class="meta"><span class="kind">To-do</span>${subjDot(subjDef(x.subj))}${x.due ? `<span class="pill">📅 due ${fmtDay(x.due)}</span>` : ''}</div></div>
        <div class="acts"><span class="faint small">${time(i.at)}</span></div></div>`; }
    const x = i.t, top = topicById[x.topic], orig = x.from || x.date, late = dayOf(i.at) > orig;
    return `<div class="task done"><button class="chk" data-a="plan-toggle" data-k="${esc(x.key)}" title="Mark as not done"></button><div class="body"><div class="ttl">${md(x.title)}</div>
      <div class="meta"><span class="kind k-${x.kind}">${KIND[x.kind] || esc(x.kind)}</span>${top ? `<span class="pill"><span class="dot" style="background:${top.color}"></span>${esc(top.t)}</span>` : ''}${x.p ? `<span class="pill">🍅 ${x.p}</span>` : ''}
        <span class="pill ${late ? 'warn' : ''}">📅 ${late ? 'caught up · planned for ' : 'planned for '}${fmtDay(orig)}</span></div></div>
      <div class="acts"><span class="faint small">${S.plan[x.key]?.at ? time(i.at) : ''}</span></div></div>`;
  };
  return `<h1>Completed</h1><p class="sub">Everything you ticked off in ${esc(SUBJ.def.name)}: plan tasks (including the ones you caught up on) and to-dos. Click the tick to undo.</p>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><small class="muted">Today</small><b style="font-size:28px">${nToday}</b></div>
    <div class="card stat"><small class="muted">Last 7 days</small><b style="font-size:28px">${nWeek}</b></div>
    <div class="card stat"><small class="muted">Plan Pomodoros completed</small><b style="font-size:28px">${pomo}</b></div>
    <div class="card stat"><small class="muted">Caught up late</small><b style="font-size:28px">${late}</b></div>
  </div>
  <div class="row wrap" style="margin-bottom:12px">${chip('f', 'all', 'All', 'all')}${chip('f', 'plan', 'Plan', 'all')}${chip('f', 'todo', 'To-do', 'all')}<span class="sp"></span>${chip('per', 'today', 'Today', 'ever')}${chip('per', 'week', '7 days', 'ever')}${chip('per', 'ever', 'All time', 'ever')}</div>
  ${list.length ? Object.entries(groups).map(([d, items]) => `<div class="card" style="margin-bottom:12px"><div class="row"><h2 style="margin:0">${d === t ? 'Today' : d === addDays(t, -1) ? 'Yesterday' : fmtDay(d)}</h2><span class="faint small">${items.length} completed</span></div>${items.map(row).join('')}</div>`).join('')
    : '<div class="card"><div class="empty">Nothing completed in this period yet.</div></div>'}`;
};

V.todo = () => {
  const f = sub.f || 'open', t = today(), sf = sub.sf || 'all';
  let list = S.todos.slice();
  if (sf !== 'all') list = list.filter(x => x.subj === sf);
  if (f === 'open') list = list.filter(x => !x.done);
  if (f === 'today') list = list.filter(x => !x.done && x.due && x.due <= t);
  if (f === 'week') list = list.filter(x => !x.done && x.due && x.due <= addDays(t, 7));
  if (f === 'done') list = list.filter(x => x.done);
  list.sort((a, b) => (a.done - b.done) || ((a.due || '9999').localeCompare(b.due || '9999')) || (b.prio - a.prio));
  const dueLbl = d => { const n = daysBetween(t, d); return n < 0 ? `<span class="pill" style="color:var(--bad)">${n === -1 ? '1 day' : -n + ' days'} late</span>` : n === 0 ? '<span class="pill" style="color:var(--warn)">today</span>' : n === 1 ? '<span class="pill">tomorrow</span>' : `<span class="pill">📅 ${fmtDay(d)} · in ${n} d</span>`; };
  return `
  <h1>To-do</h1><p class="sub">Your personal tasks for all subjects, with deadlines and priorities. Type naturally: <i>“redo exercise 7 tomorrow !! #limits 2🍅”</i></p>
  <div class="card" style="margin-bottom:16px">${todoForm()}</div>
  <div class="tabs">${[['open', 'Open'], ['today', 'Today & overdue'], ['week', 'Next 7 days'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="todo-filter" data-f="${k}">${l}</button>`).join('')}
    <span class="sp"></span>${[['all', 'All subjects', 'var(--faint)'], ...subjects().map(s => [s.id, short(s), s.color]), [GEN.KEY, '✦ General', 'var(--accent)']].map(([k, l, c]) => `<button class="${sf === k ? 'on' : ''}" data-a="todo-sf" data-f="${k}"><span class="dot" style="background:${c}"></span> ${esc(l)}</button>`).join('')}</div>
  <div class="card" ${sf === GEN.KEY ? 'hidden' : ''}>${list.length ? list.map(x => {
    const xs = subjDef(x.subj), top = x.subj === CUR ? topicById[x.topic] : null;
    const spent = S.sessions.filter(s => s.task === 'todo:' + x.id).length;
    return `<div class="task prio-${x.prio} ${x.done ? 'done' : ''}">
      <button class="chk" data-a="todo-toggle" data-id="${x.id}"></button>
      <div class="body"><div class="ttl">${esc(x.title)}</div>
        <div class="meta">${xs.id ? subjDot(xs) : ''}${x.due ? dueLbl(x.due) : ''}${x.prio === 3 ? '<span class="pill" style="color:var(--bad)">urgent</span>' : x.prio === 2 ? '<span class="pill" style="color:var(--warn)">high</span>' : ''}
          ${top ? `<span class="pill"><span class="dot" style="background:${top.color}"></span>${esc(top.t)}</span>` : ''}
          ${x.est ? `<span class="pill">🍅 ${spent}/${x.est}</span>` : ''}</div>
        ${(x.subs || []).length ? `<div style="margin-top:6px">${x.subs.map((s, i) => `<label class="know small ${s.done ? 'on' : ''}" style="padding:2px 0"><input type="checkbox" data-a="sub-toggle" data-id="${x.id}" data-i="${i}" ${s.done ? 'checked' : ''}><span>${esc(s.t)}</span></label>`).join('')}</div>` : ''}
        ${x.notes ? `<div class="small muted" style="margin-top:4px">${esc(x.notes)}</div>` : ''}
      </div>
      <div class="acts">${!x.done ? `<button class="btn sm" data-a="focus-todo" data-id="${x.id}" title="Pomodoro">🍅</button>` : ''}<button class="btn sm ghost" data-a="todo-edit" data-id="${x.id}">✎</button><button class="btn sm ghost danger" data-a="todo-del" data-id="${x.id}">✕</button></div>
    </div>`;
  }).join('') : '<div class="empty">Nothing here. Add a task above.</div>'}</div>
  ${sf === 'all' || sf === GEN.KEY ? GEN.todoCard() : ''}`;
};
function todoForm() {
  return `<form data-form="todo-add" class="grid todo-form">
      <label class="f">Task<input type="text" name="title" placeholder="What do you need to do?" required></label>
      <label class="f">Subject<select name="subj"><option value="">—</option>${subjects().map(s => `<option value="${s.id}" ${s.id === CUR ? 'selected' : ''}>${esc(short(s))}</option>`).join('')}${GEN.opt()}</select></label>${GEN.repField()}
      <label class="f">Due<input type="date" name="due"></label>
      <label class="f">Priority<select name="prio"><option value="1">Normal</option><option value="2">High</option><option value="3">Urgent</option></select></label>
      <label class="f">Topic<select name="topic"><option value="">—</option>${TOPICS.map(x => `<option value="${x.id}">${esc(x.t)}</option>`).join('')}</select></label>
      <label class="f">Estimate 🍅<input type="number" name="est" min="0" max="20" value="1"></label>
      <button class="btn pri">Add</button>
    </form>`;
}

function zenGallery() {
  return `<div class="card zen-card"><div class="row"><h2 style="margin:0">Full-screen background</h2><span class="sp"></span><button class="btn sm" data-a="zen">${ic('expand', 14)} Full screen</button></div>
    <div class="small muted" style="margin:4px 0 10px">${lofiOnline() ? 'With a YouTube live radio selected, the background is the live stream itself. Choose the offline lofi to use these animated scenes.' : 'Pick the 120-second animated scene before going full screen. Each one is downloaded once (about 60–120 MB) the first time you use it.'}</div>
    <div class="zgal ${lofiOnline() ? 'dim' : ''}">${Object.entries(ZBG).map(([k, b]) => `<button class="zth ${S.settings.zenBg === k ? 'on' : ''}" data-a="zen-pick" data-k="${k}" title="${esc(b.t)}"><img src="../assets/backgrounds/${b.img}" alt=""><span>${esc(b.t)}${BGSTATE[b.f] === true ? '' : BGPROG[b.f] != null ? ` · ${BGPROG[b.f]}%` : ' · ⤓'}</span></button>`).join('')}</div>
  </div>`;
}
V.pomodoro = () => {
  const t = today(), n = pomodoriOn(t), goal = S.settings.dailyGoal;
  const tasks = planTasks(t).filter(x => !x.done && x.p);
  const todos = S.todos.filter(x => !x.done);
  const recent = focusSessions(true).slice(-8).reverse();
  const L = S.settings.lofi;
  return `
  <h1>Pomodoro</h1><p class="sub">${S.settings.focus} minutes of focus, ${S.settings.short} of break, a long break of ${S.settings.long} every ${S.settings.longEvery}. Phone in another room.</p>
  <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
    <div class="grid"><div class="card pomo">
      <div class="modes">${['focus', 'short', 'long'].map(m => `<button class="${P.mode === m ? 'on' : ''}" data-a="pomo-mode" data-m="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>
      <div class="ring" style="margin:22px 0">
        <svg width="320" height="320"><circle cx="160" cy="160" r="145" fill="none" stroke="var(--panel3)" stroke-width="14"/><circle id="ring-prog" cx="160" cy="160" r="145" fill="none" stroke-width="14" stroke-linecap="round"/></svg>
        <div class="in"><div class="mode" id="ring-mode"></div><div class="time" id="ring-time"></div><div class="small muted ell" style="max-width:220px">${esc(P.task?.title || 'No task linked')}</div></div>
      </div>
      <div class="row"><button class="btn pri big-btn" id="pomo-toggle" data-a="pomo-toggle">Start</button><button class="btn" data-a="pomo-reset">↺ Reset</button><button class="btn" data-a="pomo-skip">⏭ Skip</button></div>
      <div class="row wrap" style="margin-top:12px;justify-content:center"><button class="btn sm ${lofiOn ? 'on' : ''}" data-a="lofi-toggle"></button><button class="btn sm" data-a="zen">${ic('expand', 14)} Full screen</button><button class="btn sm" data-a="noise">${noise ? '🔇 Stop noise' : '🌊 Brown noise'}</button><button class="btn sm" data-a="compact-on">🗗 Mini timer</button></div>
      <div style="margin-top:18px"><div class="small muted" style="margin-bottom:6px">Today: ${n} / ${goal}</div><div class="tomatoes">${Array.from({ length: Math.max(goal, n) }, (_, i) => `<span class="tomato ${i < n ? 'on' : ''}"></span>`).join('')}</div></div>
    </div>${zenGallery()}</div>
    <div class="grid">
      <div class="card"><h2>What are you working on?</h2>
        <select data-a="pomo-task" style="width:100%"><option value="">— No task —</option>
          ${tasks.length ? `<optgroup label="Today’s plan">${tasks.map(x => `<option value="plan|${esc(x.key)}|${x.date}" ${P.task?.key === x.key ? 'selected' : ''}>${esc(x.title.replace(/\*\*/g, ''))}</option>`).join('')}</optgroup>` : ''}
          ${todos.length ? `<optgroup label="To-do">${todos.map(x => `<option value="todo|${x.id}" ${P.task?.key === 'todo:' + x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</optgroup>` : ''}
        </select>
        <p class="small muted">The time is recorded on the task’s subject and topic (see Statistics).</p>
      </div>
      <div class="card lofi-card"><div class="row"><h2 style="margin:0">Lofi music</h2><span class="sp"></span>${lofiOn ? '<span class="eq"><i></i><i></i><i></i><i></i></span>' : ''}</div>
        <div class="small muted" style="margin:4px 0 10px">${lofiOn ? '♫ ' + esc(lofiName()) : 'Paused'}</div>
        <div class="lsrc">${LOFI_SRC.map(([id, l, d]) => `<label class="${L.src === id ? 'on' : ''}"><input type="radio" name="lsrc" data-a="lofi-src" value="${id}" ${L.src === id ? 'checked' : ''}><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join('')}</div>
        ${L.src !== 'gen' ? `<div class="small muted" style="margin-top:8px">${RADIO.busy ? 'Looking for the live stream on YouTube…' : RADIO.id ? `📡 On air: <b>${esc(RADIO.title || RADIO.id)}</b>` : 'The live stream is looked up on YouTube by name when you press play.'}</div>` : ''}
        <div class="row" style="margin-top:10px"><span class="small muted">Volume</span><input type="range" min="0" max="1" step="0.05" value="${L.vol}" data-a="lofi-vol" style="flex:1"><button class="btn sm" data-a="lofi-next" title="Next">⏭</button></div>
        <label class="row small" style="margin-top:8px"><input type="checkbox" data-a="lofi-auto" ${L.auto ? 'checked' : ''}> Starts by itself during focus and stops on breaks</label>
      </div>
      <div class="card"><h2>Recent sessions</h2>${recent.length ? recent.map(s => { const sd = subjDef(s.subj); return `<div class="row small" style="padding:4px 0"><span class="dot" style="background:${sd.color}"></span><span class="ell" style="flex:1">${esc(s.title || 'Free session')}</span><span class="faint">${s.full ? '🍅' : fmtMin(s.min)} · ${fmtDay(s.date, { day: 'numeric', month: 'short' })}</span></div>`; }).join('') : '<div class="muted small">No sessions yet.</div>'}</div>
    </div>
  </div>`;
};
AFTER.pomodoro = () => { syncLofiUI(); refreshBgState(); };

V.topics = () => {
  if (sub.topic && topicById[sub.topic]) return topicDetail(topicById[sub.topic]);
  if (!TOPICS.length) return `<h1>Topics</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('Topics come from the folders you upload in Materials.');
  return `<h1>Topics</h1><p class="sub">The whole syllabus of ${esc(SUBJ.def.name)}. Stars are your self-assessment; the bar combines checklist, flashcards and plan progress.</p>
  <div class="grid g3">${TOPICS.map(t => { const p = topicProgress(t.id); const m = S.mastery[t.id] || 0; return `<div class="card topic" style="--c:${t.color}" data-a="open-topic" data-id="${t.id}">
    <div class="row"><span class="tn" style="background:${t.color}">${esc(String(t.n || '•'))}</span><b>${esc(t.t)}</b><span class="sp"></span>${t.auto ? '<span class="pill" title="Built from your files: ask an AI in Materials for objectives, videos and flashcards">from files</span>' : ''}</div>
    <div class="small muted" style="margin:8px 0 12px;min-height:38px">${esc(t.exam || `${plural((t.lez || []).length + (t.es || []).length, 'file')}`)}</div>
    <div class="row"><div class="bar" style="flex:1"><i style="width:${p.all * 100}%;background:${t.color}"></i></div><span class="small muted">${Math.round(p.all * 100)}%</span><span class="stars">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= m ? 'on' : ''}" tabindex="-1">★</button>`).join('')}</span></div>
  </div>`; }).join('')}</div>`;
};
function topicDetail(t) {
  const m = S.mastery[t.id] || 0, p = topicProgress(t.id);
  const vids = VIDEOS.filter(v => v.topic === t.id);
  const errs = S.errors.filter(e => e.topic === t.id);
  const cards = CARDS.filter(c => c[0] === t.id).length;
  const esItem = e => { const R = RES[e.r]; if (!R) return ''; const pg = e.p ? (e.p[0] === e.p[1] ? ' · p. ' + e.p[0] : ` · pp. ${e.p[0]}–${e.p[1]}`) : ''; return `<div class="row small" style="padding:5px 0"><span class="pill res" data-pdf="${e.r}" ${e.p ? `data-page="${e.p[0]}"` : ''}>${ic('file', 13)} ${esc(R.t)}${pg}</span></div>`; };
  return `<button class="btn sm ghost" data-go="topics">← Topics</button>
  <div class="row" style="margin-top:10px"><span class="dot" style="background:${t.color};width:14px;height:14px"></span><h1>${esc(t.t)}</h1></div>
  <p class="sub">${esc(t.exam || '')}</p>
  <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
    <div class="grid">
      <div class="card"><div class="row"><h2 style="margin:0">I need to know…</h2><span class="sp"></span><span class="small muted">${Math.round(p.know * 100)}%</span></div>
        ${t.know.map((k, i) => { const on = !!S.know[t.id + '#' + i]; return `<label class="know ${on ? 'on' : ''}"><input type="checkbox" data-a="know" data-k="${t.id}#${i}" ${on ? 'checked' : ''}><span>${esc(k)}</span></label>`; }).join('') || '<div class="muted small">No checklist yet: ask an AI in Materials to write one from your files.</div>'}
      </div>
      <div class="card"><h2>Mistakes on this topic</h2>${errs.length ? errs.map(e => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(e.what)}</b><br><span class="muted">Rule: ${esc(e.rule || '—')}</span></div>`).join('') : '<div class="muted small">No mistakes logged. Great, or you are not writing them down 😉</div>'}
        <button class="btn sm" style="margin-top:8px" data-a="err-new" data-topic="${t.id}">+ Log a mistake</button></div>
    </div>
    <div class="grid">
      <div class="card"><h2>Self-assessment</h2><div class="stars">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= m ? 'on' : ''}" data-a="mastery" data-id="${t.id}" data-v="${i}" style="font-size:26px">★</button>`).join('')}</div>
        <div class="small muted" style="margin-top:6px">1 = never seen it · 3 = I can do the basic exercises · 5 = ready for top marks</div>
        <div class="small" style="margin-top:10px">Checklist ${Math.round(p.know * 100)}% · Flashcards ${p.cards === null ? '—' : Math.round(p.cards * 100) + '%'} (${cards}) · Plan ${p.plan === null ? '—' : Math.round(p.plan * 100) + '%'}</div></div>
      ${t.lez.length ? `<div class="card"><h2>Lecture material</h2>${t.lez.map(k => RES[k] ? `<div class="row small" style="padding:4px 0"><span class="pill res" data-pdf="${k}">📘 ${esc(RES[k].t)}</span></div>` : '').join('')}</div>` : ''}
      ${t.es.length ? `<div class="card"><h2>Exercises</h2>${t.es.map(esItem).join('')}</div>` : ''}
      ${vids.length ? `<div class="card"><h2>Videos</h2>${vids.map(v => `<div class="vid" data-go="videos" data-vid="${v.id}"><div class="th" style="background-image:url(https://i.ytimg.com/vi/${v.yt[0][0]}/mqdefault.jpg)">${S.videos[v.id]?.watched ? '<span>✓</span>' : ''}</div><div class="small"><b>${esc(v.t)}</b><br><span class="muted">${esc(v.yt[0][2] || '')}</span></div></div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

V.videos = () => {
  if (!VIDEOS.length) return `<h1>Videos</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('Ask an AI in Materials to pick YouTube lectures for each topic: every video ID is verified before it is added.');
  const cur = sub.vid && VIDEOS.some(v => v.id === sub.vid) ? sub.vid : (VIDEOS.find(v => !S.videos[v.id]?.watched) || VIDEOS[0]).id;
  const v = VIDEOS.find(x => x.id === cur), st = S.videos[cur] || {};
  const yi = Math.min(sub.yi || 0, v.yt.length - 1), [yid, ytitle, ych, ylen] = v.yt[yi];
  const notes = (st.notes || []).filter(n => !n.y || n.y === yid);
  const watchedN = VIDEOS.filter(x => S.videos[x.id]?.watched).length;
  const alts = v.yt.length > 1 ? `<h3 style="margin-top:16px">Alternatives on the same topic</h3><div class="alts">${v.yt.map((y, i) => `<div class="alt ${i === yi ? 'on' : ''}" data-a="yt-pick" data-i="${i}"><img src="https://i.ytimg.com/vi/${y[0]}/mqdefault.jpg" alt=""><div class="small"><b>${esc(y[1])}</b><br><span class="muted">${esc(y[2] || '')}${y[3] ? ' · ' + esc(y[3]) : ''}</span></div></div>`).join('')}</div>` : '';
  const list = TOPICS.filter(t => VIDEOS.some(x => x.topic === t.id)).map(t => `<div class="small faint" style="margin:8px 0 2px">${esc(t.t)}</div>` + VIDEOS.filter(x => x.topic === t.id).map(x => `<div class="vid ${x.id === cur ? 'on' : ''}" data-go="videos" data-vid="${x.id}"><div class="th" style="background-image:url(https://i.ytimg.com/vi/${x.yt[0][0]}/mqdefault.jpg)">${S.videos[x.id]?.watched ? '<span>✓</span>' : ''}</div><div class="small"><b>${esc(x.t)}</b><br><span class="muted">${esc(x.yt[0][2] || '')} · ${plural(x.yt.length, 'video')}</span></div></div>`).join('')).join('');
  return `<h1>Videos</h1><p class="sub">YouTube lectures for each step of the plan (${watchedN}/${VIDEOS.length} topics watched). For each one: a main video and a few alternatives.</p>
  <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(280px,1fr);align-items:start">
    <div class="card">
      <div class="yt"><iframe id="ytp" src="https://www.youtube-nocookie.com/embed/${yid}?rel=0&modestbranding=1&enablejsapi=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <div class="row" style="margin-top:12px"><div style="min-width:0"><h2 style="margin:0">${esc(ytitle)}</h2><div class="small muted">${esc(ych || '')}${ylen ? ' · ' + esc(ylen) : ''} · for: <b>${esc(v.t)}</b> (${esc(topicById[v.topic]?.t || '')})</div></div><span class="sp"></span>
        <button class="btn sm ghost" data-a="yt-ext" data-y="${yid}" title="Open on YouTube in the browser">↗ YouTube</button>
        <button class="btn sm ${st.watched ? '' : 'pri'}" data-a="vid-watched" data-id="${v.id}">${st.watched ? '✓ Watched' : 'Mark as watched'}</button></div>
      ${alts}
      <h3 style="margin-top:16px">Your notes</h3>
      <form class="row" data-form="vid-note" data-id="${v.id}" data-y="${yid}"><input type="text" name="text" placeholder="Write a note (the video minute is saved too)" style="flex:1"><button class="btn sm">Save</button></form>
      ${notes.map(n => `<div class="row small" style="padding:5px 0"><span class="pill res" data-a="seek" data-t="${n.t}">${clock(n.t * 1000)}</span><span style="flex:1">${esc(n.text)}</span><button class="btn sm ghost danger" data-a="vid-note-del" data-id="${v.id}" data-at="${n.at}">✕</button></div>`).join('')}
    </div>
    <div class="card" style="max-height:80vh;overflow:auto">${list}</div>
  </div>`;
};
// YouTube player time / seek through the iframe postMessage API (no external script needed).
let ytTime = 0;
window.addEventListener('message', e => {
  if (!/youtube/.test(e.origin)) return;
  const f = $('#ytp'); if (!f || e.source !== f.contentWindow) return;
  try { const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d && d.info && d.info.currentTime != null) ytTime = d.info.currentTime; } catch (err) { /* not a player message */ }
});
function ytCmd(func, args = []) { const f = $('#ytp'); if (f) f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); }
AFTER.videos = () => {
  ytTime = 0;
  const f = $('#ytp'); if (!f) return;
  f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'ytp' }), '*'));
};

V.review = () => {
  if (!CARDS.length) return `<h1>Flashcards</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('Flashcards are written by an AI from your files (Materials → Ask an AI).');
  const due = dueCards();
  if (!due.length) return `<h1>Flashcards</h1><p class="sub">Spaced repetition: cards come back just before you forget them.</p><div class="card empty" style="padding:60px">🎉 You finished today’s flashcards.<br><span class="small">Come back tomorrow, or open the <a href="#" data-go="formulas">Formula sheet</a>.</span></div>`;
  const i = due[0], [tp, front, back] = CARDS[i], shown = sub.show;
  const top = topicById[tp] || { t: tp, color: 'var(--accent)' };
  const learned = Object.values(S.cards).filter(c => c.int >= 4).length;
  return `<h1>Flashcards</h1><p class="sub">${plural(due.length, 'card')} today · ${learned}/${CARDS.length} consolidated. Try to answer out loud (or on paper) <b>before</b> flipping.</p>
  <div style="max-width:780px;margin:0 auto">
    <div class="row" style="margin-bottom:8px"><span class="pill"><span class="dot" style="background:${top.color}"></span>${esc(top.t)}</span>${S.cards[i] ? '' : '<span class="pill">new</span>'}</div>
    <div class="card flash" data-a="flip">${md(front)}${shown ? `<div class="back">${md(back)}</div>` : '<div class="small faint" style="margin-top:20px">click or press Space to flip</div>'}</div>
    ${shown ? `<div class="grades" style="margin-top:12px">${[['Again', 0, 'var(--bad)'], ['Hard', 1, 'var(--warn)'], ['Good', 2, 'var(--ok)'], ['Easy', 3, 'var(--accent)']].map(([l, q, c]) => `<button class="btn" data-a="grade" data-i="${i}" data-q="${q}" style="border-color:${c}">${l}<br><span class="small faint">${q + 1}</span></button>`).join('')}</div>` : ''}
  </div>`;
};

V.mocks = () => {
  if (sub.run) return simRun();
  if (!SIMS.length) return `<h1>Mock exams</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('Mock exams come from past papers: upload them in Materials and ask an AI to turn them into timed mocks.');
  const hist = S.sims.slice().reverse();
  return `<h1>Mock exams</h1><p class="sub">Exam conditions: timed, no notes, then honest self-grading with the solutions. During a mock exam the adhkar and verse reminders are paused (prayers are not).</p>
  <div class="grid g4">${SIMS.map(s => { const best = Math.max(-1, ...S.sims.filter(h => h.sim === s.id).map(h => h.total)); const max = s.parts.reduce((a, p) => a + p[1], 0); return `<div class="card sim-card"><b>${esc(s.t)}</b><div class="small muted">${s.minutes} min · ${plural(s.parts.length, 'exercise')} · ${max} points</div>
    <div style="margin:10px 0" class="small">${best >= 0 ? `Best: <b>${best}/${max}</b>` : '<span class="faint">Not taken yet</span>'}</div>
    <button class="btn pri sm" data-a="sim-start" data-id="${s.id}">Start</button></div>`; }).join('')}</div>
  <div class="card" style="margin-top:16px"><h2>History</h2>${hist.length ? `<table style="width:100%;border-collapse:collapse" class="small">${hist.map(h => { const s = SIMS.find(x => x.id === h.sim); return `<tr style="border-bottom:1px solid var(--line)"><td style="padding:6px 0">${fmtDay(h.date)}</td><td>${esc(s?.t)}</td><td>${h.scores.map((v, i) => `Ex${i + 1}: ${v}`).join(' · ')}</td><td><b>${h.total}/${h.max}</b></td><td class="muted">${h.minutes} min</td></tr>`; }).join('')}</table>` : '<div class="muted small">No mock exams yet.</div>'}</div>`;
};
let simT = null;
function simRun() {
  const r = sub.run, s = SIMS.find(x => x.id === r.id);
  const left = Math.max(0, r.end - Date.now());
  if (r.phase === 'grade') {
    return `<h1>${esc(s.t)} · grading</h1><p class="sub">Time used: ${Math.round(r.used)} min. Compare with the solutions and give yourself points honestly: an unjustified step is worth less.</p>
    ${s.sol ? `<button class="btn" data-pdf="${s.sol}">📄 Open the solutions</button>` : ''}
    <form data-form="sim-grade" class="grid" style="margin-top:14px">${s.parts.map((p, i) => `<div class="card"><div class="row"><b>${esc(p[0])}</b><span class="sp"></span><label class="row small">Points <input type="number" name="s${i}" min="0" max="${p[1]}" step="0.5" value="0" style="width:80px"> / ${p[1]}</label></div>
      ${p[2] ? `<div class="statement">${md(p[2])}</div>${p[3] ? `<details><summary class="small" style="cursor:pointer">Show the solution</summary><div class="sol">${md(p[3])}</div></details>` : ''}` : ''}</div>`).join('')}
      <div class="row"><button class="btn pri">Save the result</button><button type="button" class="btn ghost" data-a="sim-cancel">Cancel</button></div></form>`;
  }
  return `<div class="row"><h1>${esc(s.t)}</h1><span class="sp"></span><div class="big" id="sim-clock" style="color:${left < 600000 ? 'var(--bad)' : 'inherit'}">${clock(left)}</div></div>
  <p class="sub">Write full solutions and justify every step. No notes, no calculator.</p>
  ${s.pdf ? `<button class="btn pri" data-pdf="${s.pdf}">📄 Open the exam paper</button>` : s.parts.map(p => `<div class="card" style="margin-bottom:12px"><b>${esc(p[0])}</b> <span class="muted">[${p[1]} points]</span><div class="statement">${md(p[2] || '')}</div></div>`).join('')}
  <div class="row" style="margin-top:16px"><button class="btn pri" data-a="sim-end">Hand in</button><button class="btn ghost" data-a="sim-cancel">Cancel the mock</button></div>`;
}
AFTER.mocks = () => {
  clearInterval(simT);
  if (sub.run && sub.run.phase !== 'grade') simT = setInterval(() => {
    const el = $('#sim-clock'); if (!el || view !== 'mocks') return clearInterval(simT);
    const left = Math.max(0, sub.run.end - Date.now()); el.textContent = clock(left); if (left < 600000) el.style.color = 'var(--bad)';
    if (left === 0 && !sub.run.warned) { sub.run.warned = true; window.api.notify('Time is up', 'Hand in the mock exam.'); chime(true); }
  }, 1000);
};

const CAUSES = ['Calculation', 'Theory', 'Method', 'Distraction', 'Time'];
V.mistakes = () => {
  const f = sub.f || 'open';
  const mine = S.errors.filter(e => e.subj === CUR);
  const list = mine.filter(e => f === 'all' || (f === 'open' ? !e.resolved : e.resolved)).slice().reverse();
  const byCause = CAUSES.map(c => [c, mine.filter(e => e.cause === c).length]);
  return `<h1>Mistakes log</h1><p class="sub">Every mistake costs points in the exam until it becomes a <b>rule</b>. Write down what went wrong, why, and the rule that prevents it next time.</p>
  <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start">
    <div><div class="tabs">${[['open', 'To redo'], ['solved', 'Solved'], ['all', 'All']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="err-filter" data-f="${k}">${l}</button>`).join('')}<span class="sp"></span><button class="btn sm pri" data-a="err-new">+ New mistake</button></div>
    <div class="card">${list.length ? list.map(e => { const t = topicById[e.topic]; return `<div class="task ${e.resolved ? 'done' : ''}"><button class="chk" data-a="err-toggle" data-id="${e.id}" title="Solved: I redid it correctly"></button>
      <div class="body"><div class="ttl">${esc(e.what)}</div><div class="meta"><span class="pill">${fmtDay(e.date)}</span>${t ? `<span class="pill"><span class="dot" style="background:${t.color}"></span>${esc(t.t)}</span>` : ''}<span class="pill">${esc(e.cause)}</span>${e.src ? `<span class="pill">${esc(e.src)}</span>` : ''}</div>
      ${e.rule ? `<div class="sol small">Rule: ${esc(e.rule)}</div>` : ''}</div><div class="acts"><button class="btn sm ghost danger" data-a="err-del" data-id="${e.id}">✕</button></div></div>`; }).join('') : '<div class="empty">No mistakes in this view.</div>'}</div></div>
    <div class="card"><h2>Why you make mistakes</h2>${byCause.map(([c, n]) => `<div class="row small" style="padding:4px 0"><span style="width:90px">${c}</span><div class="bar" style="flex:1"><i style="width:${mine.length ? n / mine.length * 100 : 0}%"></i></div><span class="faint">${n}</span></div>`).join('')}
      <p class="small muted" style="margin-top:12px">Many <b>calculation</b> mistakes? Slow down and check every line. <b>Theory</b>? Flashcards and lecture notes. <b>Method</b>? Rewatch the video and the worked examples of that topic.</p></div>
  </div>`;
};
function errModal(topic = '') {
  modal(`<h2>New mistake · ${esc(short(SUBJ.def))}</h2><form data-form="err-add" class="grid">
    <label class="f">What went wrong<input type="text" name="what" required placeholder="e.g. I replaced sin x with x inside a sum"></label>
    <div class="grid g2"><label class="f">Topic<select name="topic"><option value="">—</option>${TOPICS.map(t => `<option value="${t.id}" ${t.id === topic ? 'selected' : ''}>${esc(t.t)}</option>`).join('')}</select></label>
    <label class="f">Cause<select name="cause">${CAUSES.map(c => `<option>${c}</option>`).join('')}</select></label></div>
    <label class="f">Where (exercise, page…)<input type="text" name="src" placeholder="e.g. Past paper 2, ex. 3"></label>
    <label class="f">The rule that prevents it<textarea name="rule" placeholder="e.g. Equivalent infinitesimals only work in products and quotients: in sums use Taylor."></textarea></label>
    <div class="row"><button class="btn pri">Save</button><button type="button" class="btn ghost" data-a="modal-close">Cancel</button></div></form>`);
}

V.formulas = () => {
  if (!CARDS.length) return `<h1>Formula sheet</h1><p class="sub">${esc(SUBJ.def.name)}</p>` + noData('The formula sheet is built from the subject’s flashcards.');
  const q = (sub.q || '').toLowerCase();
  const groups = TOPICS.map(t => [t, CARDS.filter(c => c[0] === t.id && (!q || (c[1] + c[2]).toLowerCase().includes(q)))]).filter(([, c]) => c.length);
  return `<div class="row"><div><h1>Formula sheet</h1><p class="sub">All the definitions, theorems and formulas of the flashcards, by topic.</p></div><span class="sp"></span>
  <input type="text" data-a="formula-q" value="${esc(sub.q || '')}" placeholder="Search… (e.g. Taylor)" style="width:260px"></div>
  ${groups.map(([t, cs]) => `<div class="card" style="margin-bottom:14px"><h2><span class="dot" style="background:${t.color}"></span> ${esc(t.t)}</h2>${cs.map(c => `<div class="formula"><div>${md(c[1])}</div><div>${md(c[2])}</div></div>`).join('')}</div>`).join('')}`;
};
AFTER.formulas = () => { const i = document.querySelector('[data-a=formula-q]'); if (i && sub.focusQ) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };

V.stats = () => {
  const t = today(), days = Array.from({ length: 21 }, (_, i) => addDays(t, i - 20));
  const mins = days.map(d => minutesOn(d, true)), max = Math.max(60, ...mins);
  const W = 700, H = 150, bw = W / days.length;
  const bars = days.map((d, i) => { const h = mins[i] / max * (H - 24); return `<rect x="${i * bw + 4}" y="${H - 16 - h}" width="${bw - 8}" height="${Math.max(h, 2)}" rx="5" fill="${d === t ? 'var(--accent2)' : 'var(--accent)'}" opacity="${d === t ? 1 : .8}"><title>${fmtDay(d)}: ${fmtMin(mins[i])}</title></rect><text x="${i * bw + bw / 2}" y="${H - 3}" text-anchor="middle">${parse(d).getDate()}</text>`; }).join('');
  const byTopic = TOPICS.map(x => [x, focusSessions().filter(s => s.topic === x.id).reduce((a, s) => a + s.min, 0)]).filter(([, m]) => m).sort((a, b) => b[1] - a[1]);
  const tmax = Math.max(1, ...byTopic.map(x => x[1]));
  const bySubj = subjects().map(s => [s, focusSessions(true).filter(x => x.subj === s.id).reduce((a, x) => a + x.min, 0)]);
  const smax = Math.max(1, ...bySubj.map(x => x[1]));
  const total = focusSessions(true).reduce((a, s) => a + s.min, 0);
  const pl = planProgress(t);
  const sims = S.sims.slice(-10);
  return `<h1>Statistics</h1><p class="sub">What gets measured gets better. Topic charts are for ${esc(SUBJ.def.name)}.</p>
  <div class="grid g4">
    <div class="card kpi"><div class="lbl">Total time</div><div class="big">${fmtMin(total)}</div><div class="muted small">${plural(focusSessions(true).filter(s => s.full).length, 'full Pomodoro')}</div></div>
    <div class="card kpi"><div class="lbl">Streak</div><div class="big">${streak()} 🔥</div><div class="muted small">days in a row with at least 25 min</div></div>
    <div class="card kpi"><div class="lbl">Plan up to today</div><div class="big">${pl.tot ? Math.round(pl.pct * 100) : 0}%</div><div class="muted small">${pl.done}/${pl.tot} 🍅 planned</div></div>
    <div class="card kpi"><div class="lbl">Consolidated flashcards</div><div class="big">${Object.values(S.cards).filter(c => c.int >= 4).length}<span class="muted" style="font-size:16px">/${CARDS.length}</span></div><div class="muted small">interval ≥ 4 days</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>Focus, last 21 days</h2><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg></div>
    <div class="card"><h2>Time per subject</h2>${bySubj.length ? bySubj.map(([s, m]) => `<div class="row small" style="padding:4px 0"><span style="width:190px" class="ell"><span class="dot" style="background:${s.color}"></span> ${esc(short(s))}</span><div class="bar" style="flex:1"><i style="width:${m / smax * 100}%;background:${s.color}"></i></div><span class="faint" style="width:60px;text-align:right">${fmtMin(m)}</span></div>`).join('') : '<div class="muted small">No subjects yet.</div>'}</div>
    <div class="card"><h2>Time per topic</h2>${byTopic.length ? byTopic.map(([x, m]) => `<div class="row small" style="padding:3px 0"><span style="width:190px" class="ell">${esc(x.t)}</span><div class="bar" style="flex:1"><i style="width:${m / tmax * 100}%;background:${x.color}"></i></div><span class="faint" style="width:60px;text-align:right">${fmtMin(m)}</span></div>`).join('') : '<div class="muted small">Link your Pomodoros to tasks to see the split.</div>'}</div>
    <div class="card"><h2>Mastery per topic</h2>${TOPICS.map(x => { const p = topicProgress(x.id).all; return `<div class="row small" style="padding:2px 0"><span style="width:190px" class="ell">${esc(x.t)}</span><div class="bar" style="flex:1"><i style="width:${p * 100}%;background:${x.color}"></i></div><span class="faint" style="width:40px;text-align:right">${Math.round(p * 100)}%</span></div>`; }).join('') || '<div class="muted small">—</div>'}</div>
    <div class="card"><h2>Mock exams</h2>${sims.length ? sims.map(h => `<div class="row small" style="padding:3px 0"><span style="width:160px">${esc(SIMS.find(s => s.id === h.sim)?.t)}</span><div class="bar" style="flex:1"><i style="width:${h.total / h.max * 100}%;background:${h.total / h.max >= .85 ? 'var(--ok)' : h.total / h.max >= .6 ? 'var(--warn)' : 'var(--bad)'}"></i></div><b style="width:60px;text-align:right">${h.total}/${h.max}</b></div>`).join('') : '<div class="muted small">No mock exams yet.</div>'}</div>
  </div>`;
};

// ─── Prayers ─────────────────────────────────────────────────────────────
function locationCard(title = 'Your location') {
  const L = S.settings.location;
  return `<div class="card grid loc-card"><h2 style="margin:0">${title}</h2>
    ${L ? `<div class="small">📍 <b>${esc(L.name)}</b>${L.region ? ', ' + esc(L.region) : ''} · ${esc(METHODS[L.method] || L.method)} · ʿAsr ${L.madhab === 'Hanafi' ? 'Hanafi' : 'standard (Shafiʿi, Maliki, Hanbali)'}</div>` : '<div class="small muted">Prayer times are calculated on your computer for your city, for three years ahead, so they also work offline.</div>'}
    <form class="row" data-form="geo"><input type="text" name="q" placeholder="Search your city… e.g. London, Cairo, Jakarta" value="${esc(sub.geoQ || '')}" style="flex:1" required><button class="btn sm pri">Search</button></form>
    <div id="geo-res">${(sub.geo || []).map((g, i) => `<button class="geo-row" data-a="geo-pick" data-i="${i}">📍 <b>${esc(g.name)}</b> <span class="muted">${esc(g.region)}</span></button>`).join('')}</div>
    ${sub.geoPick ? `<div class="grid g2"><label class="f">Calculation method<select name="method" id="geo-method">${Object.entries(METHODS).map(([k, v]) => `<option value="${k}" ${sub.geoPick.method === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="f">ʿAsr time<select id="geo-madhab"><option value="Shafi" ${sub.geoPick.madhab !== 'Hanafi' ? 'selected' : ''}>Standard (Shafiʿi, Maliki, Hanbali)</option><option value="Hanafi" ${sub.geoPick.madhab === 'Hanafi' ? 'selected' : ''}>Hanafi</option></select></label></div>
      <div class="row"><button class="btn pri" data-a="geo-save">Use ${esc(sub.geoPick.name)}</button><span class="small muted">The method is suggested for ${esc(sub.geoPick.region)}: check it matches your mosque’s timetable.</span></div>` : ''}
  </div>`;
}
let METHODS = {}, APPINFO = {}, UPDST = null;
function updLabel() {
  const u = UPDST, v = 'Version ' + (APPINFO.version || '');
  if (!u) return v;
  return v + ' · ' + ({ checking: 'checking…', uptodate: 'up to date', available: `version ${u.latest} is available`, downloading: `downloading ${u.latest}… ${u.progress || 0}%`, ready: `${u.latest} ready: it installs when you close the app`, offline: 'no connection, will retry later', error: 'update failed: ' + (u.error || '') }[u.state] || '');
}
function contentCard() {
  const n = OFFL.adhkar.length, v = OFFL.verses.length;
  return `<div class="card grid"><h2 style="margin:0">Adhkar and Qur’an passages</h2>
    <div class="small muted">${n || v ? `${n} adhkar and ${v} short Qur’an passages saved in your data folder.` : 'Not downloaded yet.'} The adhkar come from <a href="#" data-a="ext" data-u="https://www.duasrevival.com/">duasrevival.com</a>; the Qur’an passages (Uthmani text and Saheeh International translation) from <a href="#" data-a="ext" data-u="https://quran.com/">quran.com</a>. They are downloaded once to your computer.</div>
    <div class="row"><button class="btn sm ${n || v ? '' : 'pri'}" data-a="content-dl">${n || v ? 'Download again' : 'Download now'} (about 5 MB)</button><span id="dl-prog" class="small muted"></span></div></div>`;
}
V.prayers = () => {
  if (!islamicOn()) return `<h1>Prayers</h1><div class="card empty">Islamic features are turned off. <button class="btn sm pri" data-a="islamic-on">Turn them on</button></div>`;
  const D = OFFL.prayer;
  if (!D) return `<h1>Prayers</h1><p class="sub">Prayer times, Hijri calendar, Ramaḍān and ʿĪd, adhkar and Qur’an reminders.</p><div class="grid g2" style="align-items:start">${locationCard('Choose your city')}${contentCard()}</div>`;
  const t = today(), r = ISL.times(D, t), np = nextPrayer(), cur = ISL.current(D), it = islToday(), s = S.settings;
  const ups = ISL.upcoming(D, t, s.hijriOffset, 10);
  const m0 = sub.month || t.slice(0, 7);
  const [yy, mm] = m0.split('-').map(Number), dim = new Date(yy, mm, 0).getDate();
  const rows = Array.from({ length: dim }, (_, i) => `${m0}-${pad(i + 1)}`).filter(d => D.days[d]);
  const tab = sub.atab || 'morning';
  return `<div class="row"><div><h1>Prayers</h1><p class="sub">${esc(D.meta.city)}${D.meta.region ? ', ' + esc(D.meta.region) : ''} · ${esc(D.meta.method)} · computed offline until ${fmtDay(D.meta.to, { day: 'numeric', month: 'short', year: 'numeric' })}.</p></div></div>
  <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start">
    <div class="grid">
      <div class="card pray-hero">
        <div class="ph-mosque">${ILL.mosque}</div>
        <div class="small" style="opacity:.85">${esc(it.text)}${it.hol ? ' · <b>' + esc(it.hol.name) + '</b>' : ''}</div>
        ${np ? `<div class="row" style="align-items:flex-end;gap:16px;margin-top:6px"><div><div class="lbl">Next prayer</div><div class="pn">${esc(np.name)} <span class="ar">${np.ar}</span></div></div><span class="sp"></span><div style="text-align:right"><div class="pt">${np.hhmm}</div><div class="small" style="opacity:.85">in ${fmtIn(np.at - Date.now())}</div></div></div>` : ''}
      </div>
      <div class="ptiles">${ISL.PRAYERS.map(p => { const notif = p.k !== 'fajr' && p.k !== 'sunrise'; const on = notif && s.prayers[p.k]; return `<div class="ptile ${cur && cur.k === p.k ? 'cur' : ''} ${np && np.k === p.k && np.date === t ? 'nx' : ''}">
        <div class="row"><b>${p.name}</b><span class="sp"></span>${notif ? `<button class="icon-btn sm ${on ? 'on' : ''}" data-a="pr-notif" data-k="${p.k}" title="${on ? 'Reminder on' : 'Reminder off'}">${ic('bell', 14)}</button>` : `<span class="faint small" title="${p.k === 'fajr' ? 'No popup for Fajr' : 'Sunrise'}">—</span>`}</div>
        <div class="ar">${p.ar}</div><div class="tt">${r[p.k]}</div></div>`; }).join('')}</div>
      <div class="card"><div class="row"><h2 style="margin:0">${new Date(yy, mm - 1, 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</h2><span class="sp"></span>
        <button class="btn sm ghost" data-a="pm" data-d="-1">‹</button><button class="btn sm ghost" data-a="pm" data-d="0">Today</button><button class="btn sm ghost" data-a="pm" data-d="1">›</button></div>
        <table class="ptable"><tr><th>Day</th><th>Hijri</th>${ISL.PRAYERS.map(p => `<th>${p.name}</th>`).join('')}</tr>
        ${rows.map(d => { const x = D.days[d], h = ISL.hijri(D, d, s.hijriOffset), hol = ISL.holiday(h), dt = parse(d); return `<tr class="${d === t ? 'today' : ''} ${dt.getDay() === 5 ? 'fri' : ''} ${hol ? 'hol-' + hol.kind : ''}"><td>${fmtDay(d, { weekday: 'short', day: 'numeric' })}</td><td class="small">${h ? h[0] + ' ' + ISL.HMONTHS[h[1] - 1].split(' ')[0] : ''}${hol ? ' ☾' : ''}</td>${ISL.PRAYERS.map(p => `<td>${x[p.k]}</td>`).join('')}</tr>`; }).join('')}</table></div>
    </div>
    <div class="grid">
      <div class="card"><h2>Coming up</h2>${ups.map(h => { const n = daysBetween(t, h.start); return `<div class="hol-row k-${h.kind}"><span class="hdot"></span><div style="flex:1;min-width:0"><b>${esc(h.name)}</b><div class="small muted">${fmtDay(h.start, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}${h.end !== h.start ? ' → ' + fmtDay(h.end, { day: 'numeric', month: 'long' }) : ''}</div></div><span class="pill">${n <= 0 ? 'now' : 'in ' + n + ' d'}</span></div>`; }).join('')}
        <p class="small faint" style="margin:10px 0 0">Calculated dates (Umm al-Qura): the real start of the lunar months depends on the moon sighting. If your mosque is a day ahead or behind, correct it below.</p></div>
      <div class="card grid"><h2 style="margin:0">Reminders</h2>
        <label class="row"><input type="checkbox" data-a="pref" data-k="prayerPopups" ${s.prayerPopups ? 'checked' : ''}> A popup at every prayer time (except Fajr)</label>
        <label class="row"><input type="checkbox" data-a="pref" data-k="prayerSound" ${s.prayerSound ? 'checked' : ''}> A soft chime with the prayer popup</label>
        <label class="row"><input type="checkbox" data-a="pref" data-k="adhkar" ${s.adhkar ? 'checked' : ''}> Morning adhkar (Fajr to ʿAsr) and evening adhkar (from ʿAsr)</label>
        <label class="row"><input type="checkbox" data-a="pref" data-k="verses" ${s.verses ? 'checked' : ''}> Short Qur’an passages (one every three popups)</label>
        <label class="row">Every <input type="number" min="1" max="120" value="${s.adhkarEvery}" data-a="pref-num" data-k="adhkarEvery" style="width:70px"> minutes</label>
        <label class="row"><input type="checkbox" data-a="pref" data-k="holidayPopups" ${s.holidayPopups ? 'checked' : ''}> Greetings and reminders for Ramaḍān and the ʿĪds</label>
        <label class="row"><input type="checkbox" data-a="pref" data-k="dndSim" ${s.dndSim ? 'checked' : ''}> No adhkar during mock exams</label>
        <label class="row">Hijri calendar correction <select data-a="pref-num" data-k="hijriOffset">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}" ${s.hijriOffset === v ? 'selected' : ''}>${v > 0 ? '+' + v : v} days</option>`).join('')}</select></label>
        <div class="row wrap"><span class="small muted">Try:</span><button class="btn sm" data-a="pop-test" data-k="prayer">Prayer</button><button class="btn sm" data-a="pop-test" data-k="morning">Morning dhikr</button><button class="btn sm" data-a="pop-test" data-k="evening">Evening dhikr</button><button class="btn sm" data-a="pop-test" data-k="verse">Verse</button><button class="btn sm" data-a="pop-test" data-k="ramadan">Ramaḍān</button></div>
      </div>
      ${OFFL.adhkar.length ? `<div class="card"><div class="row"><h2 style="margin:0">Adhkar</h2><span class="sp"></span><div class="tabs" style="margin:0">${[['morning', 'Morning'], ['evening', 'Evening']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="atab" data-k="${k}">${l}</button>`).join('')}</div></div>
        <div class="small muted" style="margin:6px 0 10px">${OFFL.adhkar.filter(a => a.when === tab).length} adhkar · source duasrevival.com</div>
        <div class="adhkar-grid">${OFFL.adhkar.filter(a => a.when === tab).map(a => `<div class="adk" data-a="dhikr-open" data-id="${a.id}"><img src="${OFFL.hubUrl}/Offline/${a.img}" alt="" loading="lazy"><b>${esc(a.title)}</b></div>`).join('')}</div></div>` : contentCard()}
      ${locationCard('Change location')}
      <div class="card"><h2>Recent popups</h2>${(S.popHist || []).slice(0, 8).map(h => `<div class="row small" style="padding:3px 0"><span>${h.type === 'prayer' ? '🕌' : h.type === 'verse' ? '۞' : h.type === 'dhikr' ? '☾' : '☪'}</span><span class="ell" style="flex:1">${esc(h.title)}</span><span class="faint">${new Date(h.at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('') || '<div class="small muted">None yet.</div>'}</div>
    </div>
  </div>`;
};

// ─── Materials: upload per subject/topic, build the plan, ask an AI ───────
const AIS = [['claude-code', 'Claude Code', 'Works in your data folder: reads the files and updates the subject by itself.'], ['claude', 'Claude', 'claude.ai in your browser'], ['chatgpt', 'ChatGPT', 'chatgpt.com in your browser'], ['gemini', 'Gemini', 'gemini.google.com in your browser']];
let HAS_CLAUDE = null;
V.materials = () => {
  if (!hasSubjects()) return `<h1>Materials</h1><p class="sub">Your files, one folder per topic, for every subject.</p>` + welcomeCard();
  const sel = subjDef(sub.ms || CUR), sd = SDATA[sel.folder] || { files: {} }, proc = new Set((sd.data && sd.data.processed) || []);
  const auto = S.sub[sel.id]?.auto, inPlan = new Set(((auto && auto.tasks) || []).flatMap(x => (x.task[4] || []).map(k => auto.res[k]?.f)).filter(Boolean));
  const fileStatus = rel => proc.has(rel) ? 'ai' : S.files[sel.id + '|' + rel]?.req ? 'sent' : inPlan.has(rel) ? 'planned' : 'new';
  const ST = { ai: 'by AI ✓', sent: 'sent to AI', planned: 'in plan', new: 'new' };
  const all = Object.entries(sd.files || {}).flatMap(([arg, fs]) => fs.map(f => ({ arg, ...f, rel: arg + '/' + f.name })));
  const fresh = all.filter(f => !proc.has(f.rel));
  const notPlanned = all.filter(f => fileStatus(f.rel) === 'new');
  const topics = sel.id === CUR ? TOPICS.map(t => t.t) : ((sd.data && sd.data.topics) || []).map(t => t.t);
  const args = [...new Set([...Object.keys(sd.files || {}), ...topics])];
  const reqs = S.requests.filter(r => r.subj === sel.id).slice(-5).reverse();
  const ai = sub.ai || (HAS_CLAUDE ? 'claude-code' : 'chatgpt');
  return `<h1>Materials</h1><p class="sub">Upload lecture notes, slides and exercises per subject and topic: they are copied to <span class="pill res" data-a="open-folder" data-k="Subjects">${ic('folder', 13)} ${esc(OFFL.hub)}${OFFL.hub.includes('\\') ? '\\' : '/'}Subjects</span>. Then press <b>Reload</b> to build the plan, or ask an AI for a smarter one with videos and flashcards.</p>
  <div class="subj-cards">${subjects().map(s => { const f = SDATA[s.folder]?.files || {}; const n = Object.values(f).reduce((a, x) => a + x.length, 0);
    return `<button class="scard ${s.id === sel.id ? 'on' : ''}" data-a="ms" data-id="${s.id}" style="--c:${s.color}"><span class="band"></span><small>${esc(s.code || ' ')}</small><b>${esc(s.name)}</b><span class="row small"><span>${plural(n, 'file')}</span><span class="sp"></span><span class="faint">${s.exam ? 'exam ' + fmtDay(s.exam, { day: 'numeric', month: 'short' }) : 'no exam date'}</span></span></button>`; }).join('')}
    <button class="scard add" data-a="subj-add"><span class="band"></span><small>&nbsp;</small><b>+ Add a subject</b><span class="row small faint">name, exam date, colour</span></button></div>
  <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;margin-top:16px">
    <div class="grid">
      <div class="card"><h2>1 · Upload files · ${esc(short(sel))}</h2>
        <form data-form="upload" class="grid">
          <label class="f">Topic (becomes a folder)<input type="text" name="arg" list="args" placeholder="e.g. Limits, Binary trees, Balance sheet…" value="${esc(sub.arg || '')}" required><datalist id="args">${args.map(a => `<option value="${esc(a)}">`).join('')}</datalist></label>
          <div class="drop-zone" id="dz"><div>${ic('materials', 28)}</div><b>Drop files here</b><span class="small muted">or</span><button type="button" class="btn sm" data-a="pick">Choose files…</button>
            <div id="picked" class="small">${(sub.picked || []).map(p => `<div class="ell">• ${esc(p.split(/[\\/]/).pop())}</div>`).join('')}</div></div>
          <div class="row"><button class="btn pri" ${sub.picked?.length ? '' : 'disabled'}>${ic('plus', 15)} Add ${sub.picked?.length ? plural(sub.picked.length, 'file') : ''}</button><span class="small muted">Copied to Subjects/${esc(sel.folder)}/&lt;topic&gt;</span></div>
        </form></div>
      <div class="card reload-card"><div class="row"><h2 style="margin:0">2 · Build the plan</h2><span class="sp"></span>${auto ? `<span class="small faint">last built ${fmtDay(auto.gen, { day: 'numeric', month: 'short' })}</span>` : ''}</div>
        <p class="small muted">${notPlanned.length ? `<b>${plural(notPlanned.length, 'file')}</b> not in the plan yet.` : all.length ? 'All files are in the plan ✓' : 'Upload some files first.'} Reload turns every topic folder into tasks (study, practice, review), spreads them until ${sel.exam ? 'the exam on <b>' + fmtDay(sel.exam, { day: 'numeric', month: 'long' }) + '</b>' : 'you finish (add an exam date to plan backwards from it)'}, and keeps everything you already ticked off.</p>
        <div class="row"><button class="btn cta" data-a="reload-plan">${ic('refresh', 15)} Reload & build plan</button><button class="btn sm ghost" data-a="subj-edit" data-id="${sel.id}">Exam date…</button></div></div>
      <div class="card ai-card"><div class="row"><span class="spark">${ic('spark', 22)}</span><h2 style="margin:0">3 · Ask an AI (optional)</h2></div>
        <p class="small muted">${fresh.length ? `An AI can read ${fresh.length === all.length ? 'your' : 'the ' + plural(fresh.length, 'new')} ${fresh.length === 1 ? 'file' : 'files'}` : all.length ? `All ${plural(all.length, 'file')} have been processed by an AI already ✓. You can still ask with a note` : 'Upload files first, or ask with a note'} and write real topics, objectives, YouTube videos (in ${esc(S.settings.videoLang)}), flashcards and a smarter calendar.</p>
        <div class="ai-pick">${AIS.filter(([k]) => k !== 'claude-code' || HAS_CLAUDE).map(([k, l, d]) => `<button class="${ai === k ? 'on' : ''}" data-a="ai-pick" data-k="${k}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
        <form data-form="ai" class="grid"><textarea name="note" placeholder="Notes for the AI (optional): e.g. “the exam is on 18 June”, “focus on exercises”…"></textarea>
          <div class="row"><button class="btn cta">${ic('spark', 15)} Ask ${esc((AIS.find(x => x[0] === ai) || AIS[2])[1])}</button><span class="small muted">${ai === 'claude-code' ? 'Opens Claude Code in your data folder.' : 'Copies the prompt, opens the website and the folder: drag the files into the chat, paste (Ctrl V) and send.'}</span></div></form>
        ${ai !== 'claude-code' ? `<form data-form="ai-import" class="grid" style="margin-top:12px"><label class="f">4 · Paste the AI’s answer here<textarea name="json" placeholder="The JSON the AI wrote (with or without the \`\`\`json fences)"></textarea></label>
          <div class="row"><button class="btn pri">Import</button><span class="small muted">Videos are checked on YouTube; nothing you already have is deleted.</span></div></form>` : `<div class="row" style="margin-top:10px"><button class="btn sm" data-a="reload-plan">${ic('refresh', 15)} Reload when Claude has finished</button></div>`}
        ${reqs.length ? `<div class="small" style="margin-top:10px">${reqs.map(r => `<div class="row" style="padding:3px 0"><span class="faint">${new Date(r.at).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span class="ell" style="flex:1">${esc((AIS.find(x => x[0] === r.ai) || ['', 'AI'])[1])} · ${plural(r.files.length, 'file')}</span><span class="pill">${r.files.length && r.files.every(f => proc.has(f)) ? 'done ✓' : 'waiting'}</span></div>`).join('')}</div>` : ''}
      </div>
    </div>
    <div class="card"><div class="row"><h2 style="margin:0">Files of ${esc(short(sel))}</h2><span class="sp"></span><button class="btn sm ghost" data-a="open-folder" data-k="${esc('Subjects/' + sel.folder)}">${ic('folder', 14)} Open folder</button></div>
      ${Object.keys(sd.files || {}).length ? Object.entries(sd.files).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(([arg, fs]) => `<div class="arg"><div class="row"><span>${ic('folder', 16)}</span><b>${esc(arg)}</b><span class="faint small">${plural(fs.length, 'file')}</span></div>
        ${fs.map(f => { const rel = arg + '/' + f.name, st = fileStatus(rel); return `<div class="frow"><span>${ic('file', 15)}</span><span class="ell" style="flex:1" title="${esc(f.name)}">${esc(f.name)}</span><span class="pill st-${st}">${ST[st]}</span><span class="faint small">${(f.size / 1048576).toFixed(1)} MB</span><button class="btn sm ghost" data-a="fopen" data-rel="${esc(sel.folder + '/' + rel)}">Open</button></div>`; }).join('')}</div>`).join('') : '<div class="empty">No files for this subject yet.</div>'}
    </div>
  </div>`;
};
AFTER.materials = () => {
  if (HAS_CLAUDE === null) window.api.hasClaude().then(h => { HAS_CLAUDE = h; if (view === 'materials') render(); });
  const dz = $('#dz'); if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    const paths = [...e.dataTransfer.files].map(f => window.api.pathOf(f)).filter(Boolean);
    sub.picked = [...(sub.picked || []), ...paths]; sub.arg = document.querySelector('[name=arg]').value; render();
  });
};

// ─── Settings ────────────────────────────────────────────────────────────
V.settings = () => {
  const s = S.settings;
  return `<h1>Settings</h1><p class="sub">Everything is saved automatically on your computer.</p>
  <div class="grid g2" style="align-items:start">
    <div class="card grid"><div class="row"><h2 style="margin:0">Subjects</h2><span class="sp"></span><button class="btn sm pri" data-a="subj-add">+ Add</button></div>
      ${subjects().map(x => `<div class="row subj-row"><span class="dot" style="background:${x.color};width:12px;height:12px"></span><div style="flex:1;min-width:0"><b class="ell" style="display:block">${esc(x.name)}</b><small class="muted">${esc(x.code ? x.code + ' · ' : '')}${x.exam ? 'exam ' + dmy(x.exam) : 'no exam date'}</small></div><button class="btn sm ghost" data-a="subj-edit" data-id="${x.id}">Edit</button></div>`).join('') || '<div class="small muted">No subjects yet.</div>'}</div>
    ${passedCard()}
    <form data-form="settings" class="card grid"><h2 style="margin:0">Pomodoro</h2>
      <div class="grid g4"><label class="f">Focus (min)<input type="number" name="focus" min="5" max="90" value="${s.focus}"></label><label class="f">Short break<input type="number" name="short" min="1" max="30" value="${s.short}"></label><label class="f">Long break<input type="number" name="long" min="5" max="60" value="${s.long}"></label><label class="f">Long every<input type="number" name="longEvery" min="2" max="8" value="${s.longEvery}"></label></div>
      <label class="f">Daily goal (Pomodoros, all subjects together)<input type="number" name="dailyGoal" min="1" max="20" value="${s.dailyGoal}"></label>
      <label class="row"><input type="checkbox" name="autoBreak" ${s.autoBreak ? 'checked' : ''}> Start breaks automatically</label>
      <label class="row"><input type="checkbox" name="autoFocus" ${s.autoFocus ? 'checked' : ''}> Start the next Pomodoro automatically</label>
      <label class="row"><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}> Sound at the end of a session</label>
      <label class="row"><input type="checkbox" name="uiSound" ${s.uiSound !== false ? 'checked' : ''}> Interface sounds (hovering buttons, ticked tasks, goals)</label>
      <h2 style="margin:8px 0 0">Appearance and app</h2>
      <label class="f">Your name (for the greeting)<input type="text" name="name" value="${esc(s.name)}"></label>
      <label class="f">Theme<select name="theme"><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option></select></label>
      <label class="f">Language of the videos an AI should look for<input type="text" name="videoLang" value="${esc(s.videoLang)}"></label>
      <label class="f">New flashcards per day<input type="number" name="newCardsPerDay" min="0" max="50" value="${s.newCardsPerDay}"></label>
      <label class="row"><input type="checkbox" name="notch" ${s.notch ? 'checked' : ''}> When minimised, show the dynamic “notch” at the top of the screen</label>
      ${APPINFO.canAutostart ? `<label class="row"><input type="checkbox" name="autostart" ${s.autostart ? 'checked' : ''}> Start Trenta e Lode when I sign in to the computer</label>` : ''}
      <h2 style="margin:8px 0 0">Updates</h2>
      <label class="row"><input type="checkbox" name="autoUpdate" ${s.autoUpdate !== false ? 'checked' : ''}> Install updates automatically <span class="small muted">— downloaded in the background, installed when you close the app</span></label>
      <label class="row"><input type="checkbox" name="updateNotify" ${s.updateNotify !== false ? 'checked' : ''}> Tell me when a new version is available <span class="small muted">— a popup to update now or later</span></label>
      <div class="row small"><span class="muted" id="upd-status">${updLabel()}</span><span class="sp"></span><button type="button" class="btn sm" data-a="update-check">Check now</button></div>
      <div class="row"><button class="btn pri">Save</button></div></form>
    <div class="card grid"><h2 style="margin:0">Islamic features</h2>
      <label class="row"><input type="checkbox" data-a="islamic" ${islamicOn() ? 'checked' : ''}> Prayer times, Hijri calendar, Ramaḍān and ʿĪd styling, adhkar and Qur’an reminders</label>
      ${islamicOn() ? `<div class="small muted">${s.location ? `📍 ${esc(s.location.name)} · ${esc(METHODS[s.location.method] || s.location.method)}` : 'No location yet.'} <a href="#" data-go="prayers">Change in Prayers →</a></div>` : ''}</div>
    ${islamicOn() ? contentCard() : ''}
    <div class="card grid"><h2 style="margin:0">Data folder</h2>
      <div class="small muted">Your files, the AI requests, the offline prayer table and the focus backgrounds live here.</div>
      <div class="row"><code class="ell" style="flex:1">${esc(OFFL.hub)}</code><button class="btn sm ghost" data-a="open-folder" data-k="">Open</button><button class="btn sm" data-a="hub-change">Change…</button></div></div>
    <div class="card grid"><h2 style="margin:0">Help and backup</h2>
      <div class="row wrap"><button class="btn sm" data-a="tour">${ic('spark', 14)} Replay the tutorial</button><button class="btn sm" data-a="onboarding">Run the setup again</button><button class="btn sm" data-a="backup">💾 Export a backup</button></div>
      <div class="small muted">Trenta e Lode is free and open source (MIT). <a href="#" data-a="ext" data-u="${esc(REPO_URL)}">Source code, updates and issues on GitHub</a>.</div></div>
  </div>`;
};
let REPO_URL = 'https://github.com/';
function subjectModal(s) {
  const x = s || { name: '', code: '', exam: '', start: '', color: SUBJ_COLORS[subjects().length % SUBJ_COLORS.length] };
  modal(`<h2>${s ? 'Edit subject' : 'New subject'}</h2><form data-form="subj-save" data-id="${s ? s.id : ''}" class="grid">
    <label class="f">Name<input type="text" name="name" value="${esc(x.name)}" required placeholder="e.g. Data Structures and Algorithms"></label>
    <div class="grid g2"><label class="f">Code (optional)<input type="text" name="code" value="${esc(x.code)}" placeholder="e.g. CS-201"></label>
      <label class="f">Exam date (optional)<input type="date" name="exam" value="${esc(x.exam)}" ${!x.exam || x.exam >= today() ? `min="${today()}"` : ''}></label></div>
    <label class="f">Start studying from (optional)<input type="date" name="start" value="${esc(x.start)}"></label>
    <div class="f">Colour<div class="swatches">${SUBJ_COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${x.color === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>
    <div class="row"><button class="btn pri">${s ? 'Save' : 'Add subject'}</button><button type="button" class="btn ghost" data-a="modal-close">Cancel</button><span class="sp"></span>${s ? `<button type="button" class="btn ghost danger" data-a="subj-del" data-id="${s.id}">Remove…</button>` : ''}</div></form>`);
}

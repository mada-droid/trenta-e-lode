/* Trenta e Lode: renderer core. Plain JS, no build step, all files share the page's global scope.
   Every view is a function returning HTML; clicks are handled by delegation through data-* attributes (events.js).
   Subjects are created by the student. The data globals (TOPICS, PLAN, PHASES, EXAMS, VIDEOS, CARDS, SIMS, RES)
   are swapped when the subject changes, and the per-subject parts of the state (S.plan, S.cards, …) are aliases
   of S.sub[<id>].… so the views work unchanged for every subject. */
'use strict';

// ─── Utilities ───────────────────────────────────────────────────────────
const LOCALE = 'en-GB';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); // keeps $…$ for KaTeX
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const fmtDay = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parse(s).toLocaleDateString(LOCALE, o);
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)}h ${pad(Math.round(m % 60))}m` : `${Math.round(m)} min`;
const fmtIn = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`; };
const uid = () => Math.random().toString(36).slice(2, 10);
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const KIND = { theory: 'Theory', practice: 'Practice', video: 'Video', mock: 'Mock exam', review: 'Review', cards: 'Flashcards', oral: 'Oral', rest: 'Rest' };
const math = el => { try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { console.warn(e); } };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2800); }
const TOPIC_COLORS = ['#8cc0a0', '#e3bc6a', '#d98b66', '#7ea6d8', '#b392d6', '#6cc3c9', '#e58fa8', '#a3b86c'];
const SUBJ_COLORS = ['#7c8cff', '#e3a23c', '#3fae8c', '#d9534f', '#a45bd1', '#45b5c4', '#e58fa8', '#8bb03a', '#c9744f', '#5b8def'];

// ─── Subjects (created by the student) ───────────────────────────────────
const SUBKEYS = ['plan', 'moved', 'extra', 'cards', 'cardLog', 'mastery', 'know', 'sims', 'videos', 'outcome', 'exams', 'crossed'];
const NOSUBJ = { id: '', name: 'No subject yet', code: '', color: '#8cc0a0', folder: '', exam: '', start: '' };
let CUR = '', SUBJ = null, topicById = {}, SDATA = {}, TASKIDX = {};
let OFFL = { prayer: null, adhkar: [], verses: [], hub: '', hubUrl: '' };
const subjects = () => (S && S.subjects) || [];
const subjDef = id => subjects().find(s => s.id === id) || subjects()[0] || NOSUBJ;
const short = s => (s.name || '').length > 24 ? s.name.slice(0, 23) + '…' : s.name;
const hasSubjects = () => subjects().length > 0;
function buildSubject(id) {
  const def = subjDef(id), sd = SDATA[def.folder] || {}, ext = sd.data || {};
  const auto = def.id && S.sub[def.id] && S.sub[def.id].auto;
  const res = {};
  for (const [k, r] of Object.entries(ext.resources || {})) res[k] = { ...r, root: sd.dir };
  if (auto) for (const [k, r] of Object.entries(auto.res || {})) if (!res[k]) res[k] = { ...r, root: sd.dir };
  const extTopics = (ext.topics || []).map((t, i) => ({ n: i + 1, exam: '', know: [], lez: [], es: [], color: TOPIC_COLORS[i % TOPIC_COLORS.length], ...t }));
  // Topics built from the folders, unless the AI already described a topic with the same name.
  const alias = {}, autoTopics = [];
  for (const t of (auto && auto.topics) || []) {
    const same = extTopics.find(x => x.id === t.id || String(x.t).toLowerCase() === String(t.t).toLowerCase());
    if (same) { alias[t.id] = same.id; same.lez = [...new Set([...(same.lez || []), ...t.lez])]; } else autoTopics.push({ ...t, n: extTopics.length + autoTopics.length + 1 });
  }
  const topics = [...extTopics, ...autoTopics];
  const plan = {};
  const add = (d, task) => (plan[d] ||= { note: '', tasks: [] }).tasks.push(task);
  for (const [d, v] of Object.entries(ext.plan || {})) { (v.tasks || []).forEach(t => add(d, t)); if (v.note) plan[d].note = v.note; }
  if (auto) for (const x of auto.tasks) { const t = x.task.slice(); t[1] = alias[t[1]] || t[1]; t[6] = x.id; add(x.date, t); }
  const exams = [...(ext.exams || [])];
  if (def.exam && !exams.some(e => e.date === def.exam)) exams.unshift({ id: 'main', t: 'Exam', date: def.exam, oral: '' });
  return { def, dir: sd.dir, files: sd.files || {}, processed: ext.processed || [], topics, plan, res, auto,
    phases: ext.phases || [], exams, videos: ext.videos || [], cards: ext.cards || [], sims: ext.sims || [] };
}
function subjState(id, exams) {
  const s = (S.sub[id] ||= {});
  for (const k of SUBKEYS) if (s[k] == null) s[k] = k === 'sims' || k === 'exams' ? [] : {};
  s.exams = s.exams.filter(e => e.id !== 'main' || exams.some(x => x.id === 'main'));
  for (const e of exams) { const cur = s.exams.find(x => x.id === e.id); if (!cur) s.exams.push({ ...e }); else if (e.id === 'main') cur.date = e.date; }
  s.exams.sort((a, b) => a.date.localeCompare(b.date));
  return s;
}
function bindSubject(id) {
  CUR = subjDef(id).id; SUBJ = buildSubject(CUR);
  Object.assign(window, { TOPICS: SUBJ.topics, PLAN: SUBJ.plan, PHASES: SUBJ.phases, EXAMS: SUBJ.exams, VIDEOS: SUBJ.videos, CARDS: SUBJ.cards, SIMS: SUBJ.sims, RES: SUBJ.res });
  topicById = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  TASKIDX = {}; for (const [d, v] of Object.entries(PLAN)) v.tasks.forEach((t, i) => { TASKIDX[t[6] || d + '#' + i] = { date: d, t }; });
  const st = CUR ? subjState(CUR, SUBJ.exams) : Object.fromEntries(SUBKEYS.map(k => [k, k === 'sims' || k === 'exams' ? [] : {}]));
  for (const k of SUBKEYS) S[k] = st[k];
  S.settings.subject = CUR;
  document.documentElement.style.setProperty('--subj', SUBJ.def.color);
}
async function loadSubjects() {
  try { SDATA = await window.api.subjects(subjects().map(s => s.folder)); } catch (e) { console.warn(e); SDATA = {}; }
}
const isEmptySubject = () => !TOPICS.length && !Object.keys(PLAN).length;
function noData(what) {
  if (!hasSubjects()) return welcomeCard();
  const d = SUBJ.def, nFiles = Object.values(SUBJ.files).reduce((a, x) => a + x.length, 0);
  return `<div class="card empty-subj">${ILL.books}<div><span class="chip"><span class="dot" style="background:${d.color}"></span>${esc(d.code || short(d))}</span>
    <h2 style="margin:10px 0 6px">${esc(d.name)}</h2><p class="muted" style="margin:0 0 6px">${what}</p>
    <p class="muted small" style="margin:0 0 14px">${nFiles ? `You have uploaded ${plural(nFiles, 'file')}: press <b>Reload</b> in <b>Materials</b> to turn them into a plan.` : 'Upload lecture notes and exercises in <b>Materials</b> (one folder per topic) and press <b>Reload</b>: topics, tasks and calendar appear here. An AI can add videos and flashcards too.'}</p>
    <button class="btn pri" data-go="materials">${ic('materials', 16)} Go to Materials</button></div></div>`;
}
function welcomeCard() {
  return `<div class="card empty-subj">${ILL.books}<div><h2 style="margin:0 0 6px">Welcome to Trenta e Lode</h2>
    <p class="muted" style="margin:0 0 14px">Start by adding the subjects you are studying. Then upload your files in <b>Materials</b> and press <b>Reload</b>: the app builds your study plan, tasks and calendar.</p>
    <div class="row wrap"><button class="btn pri" data-a="subj-add">${ic('plus', 16)} Add your first subject</button><button class="btn" data-a="tour">${ic('spark', 15)} Take the tour</button></div></div></div>`;
}

// ─── State ───────────────────────────────────────────────────────────────
const DEFAULT = () => ({
  v: 1, created: today(), onboarded: false, toured: false,
  subjects: [],
  settings: {
    name: '', focus: 25, short: 5, long: 15, longEvery: 4, dailyGoal: 8, autoBreak: true, autoFocus: false, sound: true, uiSound: true, autoUpdate: true, updateNotify: true, theme: 'dark', newCardsPerDay: 12,
    subject: '', notch: true, hub: '', videoLang: 'English', lofi: { src: 'gen', vol: 0.6, auto: true }, zenBg: 'collina',
    islamic: true, location: null, prayerPopups: true, prayers: { dhuhr: true, asr: true, maghrib: true, isha: true }, prayerSound: true,
    adhkar: true, adhkarEvery: 10, verses: true, dndSim: true, hijriOffset: 0, holidayPopups: true, autostart: false,
  },
  sub: {}, todos: [], sessions: [], errors: [], files: {}, requests: [],
});
let S;
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { const o = { ...S }; for (const k of [...SUBKEYS, 'popHist', 'unseen']) delete o[k]; window.api.save(o); }, 300);
}
function sendPrefs() {
  const s = S.settings;
  window.api.prefs({ theme: s.theme, notch: s.notch, hub: OFFL.hub, islamic: s.islamic, location: s.location, prayerPopups: s.prayerPopups, prayers: s.prayers, prayerSound: s.prayerSound,
    adhkar: s.adhkar, adhkarEvery: s.adhkarEvery, verses: s.verses, dndSim: s.dndSim, hijriOffset: s.hijriOffset, holidayPopups: s.holidayPopups, autostart: !!s.autostart,
    autoUpdate: s.autoUpdate !== false, updateNotify: s.updateNotify !== false });
}
const islamicOn = () => S.settings.islamic !== false;

// ─── Plan model ──────────────────────────────────────────────────────────
// A task key is its id (auto-generated tasks) or "<original date>#<index>" (tasks written by an AI);
// tasks can be moved (S.moved[key] = new date), and extra tasks (recovery plans) live in S.extra[date] as "x:<id>".
function planTasks(date) {
  const out = [];
  const d = PLAN[date];
  if (d) d.tasks.forEach((t, i) => { const key = t[6] || `${date}#${i}`; if (!S.moved[key] || S.moved[key] === date) out.push(mkTask(key, t, date)); });
  for (const [key, to] of Object.entries(S.moved)) if (to === date && TASKIDX[key] && TASKIDX[key].date !== date) out.push(mkTask(key, TASKIDX[key].t, date, TASKIDX[key].date));
  (S.extra[date] || []).forEach(t => out.push(mkTask('x:' + t.id, t.task, date)));
  return out;
}
function mkTask(key, [kind, topic, p, title, res = [], video], date, from) {
  return { key, kind, topic, p, title, res, video, date, from, done: !!S.plan[key]?.done };
}
function allPlanDates() {
  const set = new Set([...Object.keys(PLAN), ...Object.values(S.moved), ...Object.keys(S.extra)]);
  return [...set].sort();
}
function overdue() {
  const t = today(), out = [];
  for (const d of allPlanDates()) if (d < t) for (const k of planTasks(d)) if (!k.done && k.p > 0 && k.kind !== 'rest') out.push(k);
  return out;
}
function dayLoad(date) { return planTasks(date).reduce((a, t) => a + (t.done ? 0 : t.p), 0); }
function examDates() { return new Set(S.exams.flatMap(e => [e.date, e.oral]).filter(Boolean)); }
function reschedule(key) {
  // Next 6 days from today: the lightest non-exam day.
  const ex = examDates();
  let best = null;
  for (let i = 0; i < 6; i++) {
    const d = addDays(today(), i);
    if (ex.has(d)) continue;
    const l = dayLoad(d) + (i === 0 ? 2 : 0);
    if (!best || l < best.l) best = { d, l };
  }
  if (key.startsWith('x:')) {
    for (const [, list] of Object.entries(S.extra)) { const i = list.findIndex(t => 'x:' + t.id === key); if (i >= 0) { const [t] = list.splice(i, 1); (S.extra[best.d] ||= []).push(t); } }
  } else if (TASKIDX[key] && best.d === TASKIDX[key].date) delete S.moved[key]; else S.moved[key] = best.d;
  save();
  return best.d;
}
function phaseOf(date) { return PHASES.find(p => date >= p.from && date <= p.to); }
function phaseProgress(p) {
  let tot = 0, done = 0;
  for (const d of allPlanDates()) if (d >= p.from && d <= p.to) for (const t of planTasks(d)) { tot += t.p; if (t.done) done += t.p; }
  return { tot, done, pct: tot ? done / tot : 0 };
}
function planProgress(until = null) {
  let tot = 0, done = 0;
  for (const d of allPlanDates()) if (!until || d <= until) for (const t of planTasks(d)) { tot += t.p; if (t.done) done += t.p; }
  return { tot, done, pct: tot ? done / tot : 0 };
}

// ─── Plan generated from the uploaded files ──────────────────────────────
// One folder = one topic. Each file becomes a "study" or "practice" task (estimated from its size),
// each topic gets a review, and the last days before the exam get a mock exam and a final review.
// Tasks are spread from today to the exam date (or at a steady pace), respecting the daily goal
// across all subjects and lighter Sundays. Done tasks keep their day; everything else is re-planned.
const PRACTICE_RE = /exerc|eserc|eserciz|problem|homework|assignment|worksheet|tutorial|practice|quiz|test|exam|esame|prova|past.?paper|solution|soluz|übung|ejercicio|exercice|tarea|devoir|sheet/i;
const THEORY_RE = /lecture|lezion|slide|notes|appunti|chapter|capitolo|handout|dispens/i;
function autoLoad(exceptId, d) {
  let n = 0;
  for (const s of subjects()) {
    if (s.id === exceptId) continue;
    const st = S.sub[s.id]; if (!st) continue;
    for (const x of (st.auto && st.auto.tasks) || []) if (x.date === d && !st.plan[x.id]?.done) n += x.task[2];
  }
  return n;
}
function generatePlan(id) {
  const def = subjDef(id); if (!def.id) return null;
  const sd = SDATA[def.folder] || { files: {} }, ext = sd.data || {}, proc = new Set(ext.processed || []);
  const st = subjState(id, []);
  const doneAt = k => st.plan[k]?.done ? iso(new Date(st.plan[k].at || Date.now())) : null;
  const folders = Object.keys(sd.files || {}).filter(f => sd.files[f].length).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const topics = [], res = {}, queue = [];
  folders.forEach((f, i) => {
    const tid = 'f-' + slug(f), files = sd.files[f].slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const lez = [], es = [];
    let open = 0;
    for (const x of files) {
      const rel = f + '/' + x.name, key = 'r' + hash(rel), name = x.name.replace(/\.[^.]+$/, '');
      res[key] = { t: name, f: rel };
      const practice = PRACTICE_RE.test(x.name) || (PRACTICE_RE.test(f) && !THEORY_RE.test(x.name));
      (practice ? es : lez).push(key);
      if (proc.has(rel)) continue; // an AI already planned this file
      open++;
      const mb = x.size / 1048576;
      const p = /\.(pdf|docx?|pptx?|md|txt|odt|key)$/i.test(x.name) ? Math.max(1, Math.min(4, Math.round(1 + mb * 0.8))) + (practice ? 1 : 0) : /\.(mp4|mkv|webm|mov|m4a|mp3)$/i.test(x.name) ? 2 : 1;
      queue.push({ id: 'a' + hash(rel + (practice ? '#p' : '#t')), task: [practice ? 'practice' : 'theory', tid, p, `${practice ? 'Practice' : 'Study'}: ${name}`, [key]] });
    }
    topics.push({ id: tid, n: i + 1, t: f, exam: '', know: [], lez, es: es.map(r => ({ r })), color: TOPIC_COLORS[i % TOPIC_COLORS.length], auto: true });
    if (open) queue.push({ id: 'a' + hash(f + '#review'), task: ['review', tid, 1, `Review “${f}”: one-page summary, key definitions and formulas`, []] });
  });
  const t0 = today(), start = def.start && def.start > t0 ? def.start : t0;
  const examDay = def.exam && def.exam > start ? def.exam : null;
  if (examDay && queue.length) {
    const first = topics[0] ? topics[0].id : '';
    queue.push({ id: 'a' + hash(id + '#final-mock'), final: 3, task: ['mock', first, 4, 'Mock exam: past papers or mixed exercises under timed conditions, no notes', []] });
    queue.push({ id: 'a' + hash(id + '#final-review'), final: 2, task: ['review', first, 3, 'Final review: all topics, formulas and your Mistakes log', []] });
    queue.push({ id: 'a' + hash(id + '#final-light'), final: 1, task: ['cards', first, 2, 'Eve of the exam: flashcards and formula sheet only. Early night!', []] });
  }
  const tasks = [];
  for (const q of queue) { const d = doneAt(q.id); if (d) tasks.push({ id: q.id, date: d, task: q.task }); }
  const todo = queue.filter(q => !doneAt(q.id));
  const goal = S.settings.dailyGoal;
  const cap = d => { const c = Math.max(2, goal - autoLoad(id, d)); return parse(d).getDay() === 0 ? Math.max(1, Math.round(c / 2)) : c; };
  const regular = todo.filter(q => !q.final), finals = todo.filter(q => q.final);
  const last = examDay ? addDays(examDay, -(finals.length ? 4 : 1)) : null;
  const total = regular.reduce((a, q) => a + q.task[2], 0);
  let scale = 1, target = Infinity;
  if (last && last >= start) {
    let capSum = 0; for (let d = start; d <= last; d = addDays(d, 1)) capSum += cap(d);
    if (total > capSum) scale = Math.min(1.6, total / Math.max(1, capSum));
    else { const days = daysBetween(start, last) + 1; target = Math.max(2, Math.ceil(total / days * 1.15)); }
  }
  const span = last && last >= start ? daysBetween(start, last) + 1 : 0;
  if (span && target !== Infinity && regular.length <= span) {
    // Few tasks for a long time: spread them evenly until the exam instead of front-loading them.
    regular.forEach((q, k) => { let d = addDays(start, Math.floor(k * span / regular.length)); if (parse(d).getDay() === 0 && d < last) d = addDays(d, 1); tasks.push({ id: q.id, date: d, task: q.task }); });
    regular.length = 0;
  }
  let d = start, used = 0;
  for (const q of regular) {
    for (let guard = 0; guard < 800; guard++) {
      const room = Math.min(Math.round(cap(d) * scale), target);
      if (used === 0 || used + q.task[2] <= room) break;
      d = addDays(d, 1); used = 0;
    }
    tasks.push({ id: q.id, date: d, task: q.task }); used += q.task[2];
  }
  for (const q of finals) tasks.push({ id: q.id, date: addDays(examDay, -q.final), task: q.task });
  st.auto = { gen: t0, topics, res, tasks };
  for (const q of todo) delete st.moved[q.id];
  save();
  const dates = tasks.map(x => x.date).sort();
  return { tasks: tasks.length, open: todo.length, topics: topics.length, from: dates[0], to: dates[dates.length - 1] };
}

// ─── Sessions / stats ────────────────────────────────────────────────────
const focusSessions = (all = false) => S.sessions.filter(s => s.kind === 'focus' && (all || s.subj === CUR));
function minutesOn(date, all = true) { return focusSessions(all).filter(s => s.date === date).reduce((a, s) => a + s.min, 0); }
function pomodoriOn(date, all = true) { return focusSessions(all).filter(s => s.date === date && s.full).length; }
function streak() {
  let n = 0, d = today();
  if (!minutesOn(d)) d = addDays(d, -1);
  while (minutesOn(d) >= 25) { n++; d = addDays(d, -1); if (n > 999) break; }
  return n;
}

// ─── Flashcards (SM-2 light) ─────────────────────────────────────────────
function cardState(i) { return S.cards[i] || { ef: 2.5, int: 0, due: null, reps: 0 }; }
function dueCards() {
  const t = today(), due = [], fresh = [];
  CARDS.forEach((c, i) => { const s = S.cards[i]; if (!s) fresh.push(i); else if (s.due <= t) due.push(i); });
  const newToday = Object.values(S.cardLog).filter(x => x === today()).length;
  return [...due, ...fresh.slice(0, Math.max(0, S.settings.newCardsPerDay - newToday))];
}
function grade(i, q) { // q: 0 again · 1 hard · 2 good · 3 easy
  const had = dueCards().length;
  const s = { ...cardState(i) };
  if (!S.cards[i]) S.cardLog[i] = today();
  if (q === 0) { s.reps = 0; s.int = 0; s.ef = Math.max(1.3, s.ef - 0.2); s.due = today(); }
  else {
    s.reps++;
    s.int = s.reps === 1 ? (q === 3 ? 3 : 1) : s.reps === 2 ? (q === 1 ? 2 : 4) : Math.round(s.int * (q === 1 ? 1.2 : q === 3 ? s.ef * 1.3 : s.ef));
    s.ef = Math.max(1.3, s.ef + (q === 1 ? -0.15 : q === 3 ? 0.1 : 0));
    s.due = addDays(today(), s.int);
  }
  S.cards[i] = s; save();
  if (had && !dueCards().length) { SFX.goal(); toast('All of today’s flashcards done! 🎉'); }
}

// ─── Topic progress ──────────────────────────────────────────────────────
function topicProgress(id) {
  const t = topicById[id];
  if (!t) return { know: 0, cards: null, plan: null, all: 0 };
  const k = t.know.length ? t.know.filter((_, i) => S.know[id + '#' + i]).length / t.know.length : null;
  const cards = CARDS.map((c, i) => [c, i]).filter(([c]) => c[0] === id);
  const c = cards.length ? cards.filter(([, i]) => S.cards[i]?.int >= 4).length / cards.length : null;
  let tot = 0, done = 0;
  for (const d of allPlanDates()) for (const x of planTasks(d)) if (x.topic === id && x.p) { tot += x.p; if (x.done) done += x.p; }
  const p = tot ? done / tot : null;
  const parts = [k, c, p].filter(v => v !== null);
  return { know: k || 0, cards: c, plan: p, all: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0 };
}
function readiness() {
  const ts = TOPICS.filter(t => t.id !== 'oral');
  if (!ts.length) return 0;
  return ts.reduce((a, t) => a + topicProgress(t.id).all * 0.6 + (S.mastery[t.id] || 0) / 5 * 0.4, 0) / ts.length;
}

// ─── Islamic calendar (offline table for the student's city) ─────────────
let HOL = null;
function islToday() { return islamicOn() && OFFL.prayer ? ISL.today(OFFL.prayer, today(), S.settings.hijriOffset) : { h: null, text: '', hol: null }; }
function applyHoliday() {
  const t = islToday(); HOL = t.hol;
  document.body.classList.toggle('ramadan', !!(HOL && HOL.kind === 'ramadan'));
  document.body.classList.toggle('eid', !!(HOL && HOL.kind === 'eid'));
  document.body.classList.toggle('sacred', !!(HOL && HOL.kind === 'sacred'));
}
function holidayBanner() {
  if (!HOL || !OFFL.prayer) return '';
  const r = ISL.times(OFFL.prayer, today()), now = new Date();
  if (HOL.kind === 'ramadan') {
    const iftar = ISL.at(today(), r.maghrib), suhoor = ISL.at(today(), r.fajr);
    const msg = now < suhoor ? `Suḥūr until <b>${r.fajr}</b> (in ${fmtIn(suhoor - now)})` : now < iftar ? `Ifṭār at <b>${r.maghrib}</b> · in ${fmtIn(iftar - now)}` : `Ifṭār done · tomorrow suḥūr until <b>${ISL.times(OFFL.prayer, addDays(today(), 1))?.fajr || ''}</b>`;
    return `<div class="holi-banner ramadan"><span class="lanterns">${'<i></i>'.repeat(7)}</span><div><b>Ramaḍān mubārak · day ${HOL.day}${HOL.last10 ? ' · the last ten nights' : ''}</b><div class="small">${msg} · your plan stays the same: study after suḥūr and after ifṭār.</div></div><span class="crescent">☪</span></div>`;
  }
  if (HOL.kind === 'eid') return `<div class="holi-banner eid"><span class="confetti"></span><div><b>${esc(HOL.name)} · ʿĪd mubārak!</b><div class="small">${esc(ISL.BLURB[HOL.id === 'fitr' ? 'fitr' : 'adha'])} Day ${HOL.day} of the festival: enjoy it, the plan can wait.</div></div><span class="crescent">✦</span></div>`;
  return `<div class="holi-banner sacred"><div><b>${esc(HOL.name)}</b><div class="small">${esc(ISL.BLURB[HOL.id] || '')}</div></div><span class="crescent">☾</span></div>`;
}
function nextPrayer() { return islamicOn() && OFFL.prayer ? ISL.next(OFFL.prayer, new Date()) : null; }

// ─── Pomodoro engine ─────────────────────────────────────────────────────
const P = { mode: 'focus', running: false, end: 0, left: 0, task: null, count: 0, started: 0 };
const modeLen = m => (m === 'focus' ? S.settings.focus : m === 'short' ? S.settings.short : S.settings.long) * 60000;
const MODE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };
function pSet(mode) { P.mode = mode; P.running = false; P.left = modeLen(mode); tick(); }
function pStart() {
  if (P.running) return; if (!P.left) P.left = modeLen(P.mode); P.end = Date.now() + P.left; P.started = Date.now() - (modeLen(P.mode) - P.left); P.running = true;
  if (S.settings.lofi.auto) { if (P.mode === 'focus') lofiPlay(); else lofiPause(); }
  tick();
}
function pPause() { if (!P.running) return; P.left = Math.max(0, P.end - Date.now()); P.running = false; if (S.settings.lofi.auto) lofiPause(); tick(); }
function pReset() { if (P.mode === 'focus' && P.running) logSession(false); P.running = false; P.left = modeLen(P.mode); if (S.settings.lofi.auto) lofiPause(); tick(); }
function pSkip() { if (P.mode === 'focus') logSession(false); pNext(); }
function logSession(full) {
  const min = full ? S.settings.focus : (Date.now() - P.started) / 60000;
  if (min < 1) return;
  const t = P.task;
  S.sessions.push({ kind: 'focus', date: today(), at: Date.now(), min: Math.round(min * 10) / 10, full, task: t?.key || null, title: t?.title || null, topic: t?.topic || null, subj: t?.subj || CUR });
  save();
}
function pNext() {
  if (P.mode === 'focus') { P.count++; P.mode = P.count % S.settings.longEvery === 0 ? 'long' : 'short'; }
  else P.mode = 'focus';
  P.running = false; P.left = modeLen(P.mode);
  if (S.settings.lofi.auto && P.mode !== 'focus') lofiPause();
  if ((P.mode !== 'focus' && S.settings.autoBreak) || (P.mode === 'focus' && S.settings.autoFocus)) pStart();
  tick();
}
function pDone() {
  if (P.mode === 'focus') {
    logSession(true);
    const n = pomodoriOn(today());
    window.api.notify('🍅 Pomodoro complete!', `${n} of ${S.settings.dailyGoal} today. ${n % S.settings.longEvery === 0 ? 'Long break: stand up and move.' : 'Short break.'}`);
  } else window.api.notify('Break is over', 'Back to: ' + (P.task?.title || 'a new Pomodoro'));
  chime(P.mode === 'focus');
  if (P.mode === 'focus' && pomodoriOn(today()) === S.settings.dailyGoal) setTimeout(() => { SFX.goal(); toast('Daily Pomodoro goal reached! 🍅🎉'); }, 1100);
  pNext();
  if (view === 'today' || view === 'stats' || view === 'pomodoro') render();
}
let audio;
function chime(up) {
  if (!S.settings.sound) return;
  audio ||= new AudioContext();
  const notes = up ? [660, 880, 1320] : [880, 660];
  notes.forEach((f, i) => {
    const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + i * 0.18;
    o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + 0.65);
  });
}
let noise = null; // brown noise for focus
function toggleNoise() {
  if (noise) { noise.stop(); noise = null; return false; }
  audio ||= new AudioContext();
  const len = audio.sampleRate * 4, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = audio.createBufferSource(), g = audio.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0.35;
  src.connect(g).connect(audio.destination); src.start(); noise = src; return true;
}

// ─── Lofi: generated offline (lofi.js) or a YouTube live radio ───────────
// Online sources are stored by NAME, not by video ID: live radios are restarted with new IDs,
// so the main process searches YouTube's live results for them (cached, re-checked on error).
const LOFI_SRC = [
  ['gen', 'Offline lofi (generated)', 'Always available, even without internet'],
  ['lg-study', 'Lofi Girl · lofi hip hop radio', 'YouTube live · beats to relax/study to', { q: 'lofi girl lofi hip hop radio beats to relax study to', ch: 'Lofi Girl', words: ['lofi hip hop radio', 'study'], fallback: 'jfKfPfyJRdk' }],
  ['lg-jazz', 'Lofi Girl · jazz lofi radio', 'YouTube live · beats to chill/study to', { q: 'lofi girl jazz lofi radio', ch: 'Lofi Girl', words: ['jazz'], fallback: 'E2vONfzoyRI' }],
  ['ch-radio', 'Chillhop · lofi hip hop radio', 'YouTube live · beats to study/relax to', { q: 'chillhop music lofi hip hop radio beats to study relax', ch: 'Chillhop Music', words: ['lofi hip hop radio'], fallback: '7NOSDKb0HlU' }],
  ['ch-jazzy', 'Chillhop · jazzy & lofi beats', 'YouTube live · Chillhop Radio', { q: 'chillhop radio jazzy lofi hip hop beats', ch: 'Chillhop Music', words: ['jazzy'], fallback: '5yx6BWlEVcY' }],
  ['lg-synth', 'Lofi Girl · synthwave radio', 'YouTube live · beats to chill/game to', { q: 'lofi girl synthwave radio', ch: 'Lofi Girl', words: ['synthwave'], fallback: '4xDzrJKXOOY' }],
];
const lofiOnline = () => S.settings.lofi.src !== 'gen';
let lofiOn = false;
Lofi.onChange(() => { tick(); if (zen) zenPanels(); });
function lofiName() { const s = S.settings.lofi.src; return s === 'gen' ? Lofi.name : (LOFI_SRC.find(x => x[0] === s) || [])[1] || 'Radio'; }
function lofiPlay() {
  const L = S.settings.lofi;
  if (L.src === 'gen') { radioStop(); Lofi.volume(L.vol); Lofi.play(); }
  else { Lofi.pause(); radioEnsure(L.src, true); }
  lofiOn = true; syncLofiUI();
}
function lofiPause() { Lofi.pause(); radioPause(); lofiOn = false; syncLofiUI(); }
function lofiToggle() { lofiOn ? lofiPause() : lofiPlay(); }
function lofiSetSrc(v) {
  const was = lofiOnline(); S.settings.lofi.src = v; save();
  if (v === 'gen') radioStop(); else if (!lofiOn) radioEnsure(v, false);
  if (lofiOn) lofiPlay();
  if (zen) { if (was !== lofiOnline()) zenBuild(); else { zenPanels(); zenLayout(); } } else render();
}

// The YouTube player stays loaded ("warm") once created: pause/play and full screen are instant.
const RADIO = { key: null, id: null, ready: false, want: false, state: -1, fails: 0, wd: null };
function radioCmd(func, args = []) { const f = $('#radio-yt'); if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args, id: 1, channel: 'widget' }), '*'); }
function radioHead(msg) { return `<div class="rhd">${ic('music', 14)}<span>${esc(msg || lofiName())}</span><button data-a="lofi-stop" title="Stop">${ic('x', 14)}</button></div>`; }
async function radioEnsure(key, play) {
  const src = LOFI_SRC.find(x => x[0] === key); if (!src || !src[3]) return;
  const r = $('#radio');
  RADIO.want = play; r.classList.toggle('on', play);
  if (RADIO.key === key && (RADIO.id || RADIO.busy)) { if (play && RADIO.ready) radioCmd('playVideo'); return; }
  radioStop(); RADIO.key = key; RADIO.want = play; RADIO.fails = 0; r.classList.toggle('on', play);
  await radioResolve(src, {});
}
async function radioResolve(src, opts) {
  const key = src[0], r = $('#radio');
  RADIO.busy = true; r.innerHTML = radioHead('Looking for the live stream of ' + src[1] + '…') + '<div class="rload"><span class="spin"></span></div>';
  const res = await window.api.lofiResolve({ key, ...src[3] }, opts);
  RADIO.busy = false;
  if (RADIO.key !== key) return;
  if (!res || res.error) return radioGiveUp(src, 'No live stream found for “' + src[1] + '” (are you online?)');
  radioLoad(res.id, res.title);
}
function radioLoad(id, title) {
  const r = $('#radio');
  RADIO.id = id; RADIO.ready = false; RADIO.state = -1; RADIO.title = title || '';
  r.innerHTML = radioHead() + `<div class="rframe"><iframe id="radio-yt" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=${RADIO.want ? 1 : 0}&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3" allow="autoplay; encrypted-media; fullscreen"></iframe></div>`;
  const f = $('#radio-yt');
  f.addEventListener('load', () => { const hi = () => f.contentWindow && f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); hi(); setTimeout(hi, 600); setTimeout(hi, 2000); });
  clearTimeout(RADIO.wd);
  RADIO.wd = setTimeout(() => { if (RADIO.id === id && !RADIO.ready) radioFail('the player does not respond'); }, 25000);
  if (zen) zenLayout();
}
async function radioFail(why) {
  const src = LOFI_SRC.find(x => x[0] === RADIO.key); if (!src) return;
  const bad = RADIO.id; RADIO.id = null; RADIO.fails++;
  console.warn('[lofi] stream unavailable', bad, why);
  if (RADIO.fails > 3) return radioGiveUp(src, src[1] + ': no working live stream right now');
  await radioResolve(src, { bad, force: true });
}
function radioGiveUp(src, msg) {
  radioStop(); toast('📻 ' + msg + ' · switching to offline lofi');
  if (lofiOn || RADIO.want) { Lofi.volume(S.settings.lofi.vol); Lofi.play(); lofiOn = true; }
  syncLofiUI(); if (zen) zenBuild();
}
function radioPause() { RADIO.want = false; $('#radio').classList.remove('on'); if (RADIO.ready) radioCmd('pauseVideo'); }
function radioStop() { clearTimeout(RADIO.wd); const r = $('#radio'); r.classList.remove('on'); r.innerHTML = ''; Object.assign(RADIO, { key: null, id: null, ready: false, busy: false }); }
window.addEventListener('message', e => {
  const f = $('#radio-yt'); if (!f || e.source !== f.contentWindow) return;
  let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
  if (!d || !d.event) return;
  if (d.event === 'onReady' || (d.event === 'initialDelivery' && !RADIO.ready)) {
    if (!RADIO.ready) { RADIO.ready = true; clearTimeout(RADIO.wd); radioCmd('setVolume', [Math.round(S.settings.lofi.vol * 100)]); if (RADIO.want) radioCmd('playVideo'); }
  }
  if (d.event === 'onError') radioFail('error ' + d.info);
  if (d.event === 'onStateChange') RADIO.state = d.info;
  if (d.event === 'infoDelivery' && d.info && d.info.playerState != null) RADIO.state = d.info.playerState;
  if (RADIO.state === 1) RADIO.fails = 0;
});
function syncLofiUI() { document.querySelectorAll('[data-a=lofi-toggle]').forEach(b => { b.classList.toggle('on', lofiOn); b.innerHTML = lofiOn ? `${ic('pause', 14)} Pause music` : `${ic('music', 14)} Lofi`; }); if (zen) zenPanels(); }

// ─── Tick: timer UIs, notch status ───────────────────────────────────────
const clock = ms => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
let lastStatus = 0;
function tick() {
  if (!S || !SUBJ) return;
  const left = P.running ? Math.max(0, P.end - Date.now()) : (P.left || modeLen(P.mode));
  if (P.running && left <= 0) { P.running = false; P.left = 0; pDone(); return; }
  const txt = clock(left), frac = left / modeLen(P.mode);
  document.title = P.running ? `${txt} · ${MODE_LABEL[P.mode]}` : 'Trenta e Lode';
  const col = P.mode === 'focus' ? 'var(--focus)' : 'var(--break)';
  $('#mini-timer').innerHTML = `<div class="mt-ring">${miniRing(frac, col)}</div><div style="min-width:0"><small>${MODE_LABEL[P.mode]}${P.running ? '' : ' · paused'}</small><div class="t" style="color:${P.running ? col : 'inherit'}">${txt}</div><small class="ell">${esc(P.task?.title || 'No task linked')}</small></div>`;
  const ring = $('#ring-prog');
  if (ring) {
    const C = 2 * Math.PI * 145;
    ring.setAttribute('stroke-dasharray', `${C * frac} ${C}`); ring.setAttribute('stroke', col);
    $('#ring-time').textContent = txt;
    $('#ring-mode').textContent = MODE_LABEL[P.mode];
    const b = $('#pomo-toggle'); if (b) b.innerHTML = P.running ? `${ic('pause', 16)} Pause` : `${ic('play', 16)} Start`;
  }
  if (zen) zenTick(txt, frac, col);
  const c = $('#compact');
  if (document.body.classList.contains('compact')) c.innerHTML = `<div class="small muted">${MODE_LABEL[P.mode]}</div><div class="time" style="color:${col}">${txt}</div><div class="row"><button class="btn sm" data-a="pomo-toggle">${P.running ? 'Pause' : 'Start'}</button><button class="btn sm" data-a="pomo-skip">Skip</button><button class="btn sm" data-a="compact-off">Expand</button></div>`;
  const np = nextPrayer(), tp = $('#tp-prayer');
  if (tp) { tp.style.display = np ? '' : 'none'; if (np) tp.innerHTML = `${ic('prayers', 15)}<span><b>${esc(np.name)}</b> ${np.hhmm}</span><span class="faint">· ${fmtIn(np.at - Date.now())}</span>`; }
  if (Date.now() - lastStatus > 900) {
    lastStatus = Date.now();
    const ne = nextExam(), it = islToday();
    window.api.status({
      theme: S.settings.theme, sim: view === 'mocks' && !!sub.run && sub.run.phase !== 'grade',
      subj: { short: short(SUBJ.def) || 'Trenta e Lode', color: SUBJ.def.color },
      pomo: { mode: P.mode, label: MODE_LABEL[P.mode], txt, running: P.running, frac, task: P.task?.title || '', today: pomodoriOn(today()) },
      prayer: np && { name: np.name, hhmm: np.hhmm, inTxt: fmtIn(np.at - Date.now()) },
      exam: ne && daysBetween(today(), ne.date) >= 0 && { t: ne.t, days: daysBetween(today(), ne.date) }, hijri: it.text, hol: it.hol && { name: it.hol.name, kind: it.hol.kind },
      lofi: { on: lofiOn, name: lofiName() },
    });
  }
}
function miniRing(frac, col) { const C = 2 * Math.PI * 15; return `<svg width="38" height="38" viewBox="0 0 38 38" style="transform:rotate(-90deg)"><circle cx="19" cy="19" r="15" fill="none" stroke="var(--panel3)" stroke-width="4"/><circle cx="19" cy="19" r="15" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C * frac} ${C}"/></svg>`; }
setInterval(tick, 500);

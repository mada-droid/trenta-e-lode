/* Trenta e Lode: modal, quick add, catch-up plan, search, every click/change/submit handler, and boot. */
'use strict';

// ─── Modal ───────────────────────────────────────────────────────────────
function modal(html) { const m = $('#modal'); m.querySelector('.modal-box').innerHTML = html; m.classList.remove('hidden'); math(m); const i = m.querySelector('input:not([type=radio]):not([type=checkbox])'); i && i.focus(); }
function closeModal() { $('#modal').classList.add('hidden'); }

// ─── Natural-language quick add ──────────────────────────────────────────
// "redo exercise 7 tomorrow !! #limits 2🍅" → due tomorrow, high priority, topic "limits", estimate 2.
function parseQuick(q) {
  let title = q, due = null, prio = 1, topic = '', est = 1;
  const t = today(), wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  title = title.replace(/(!{1,3})(?=\s|$)/, m => { prio = Math.min(3, m.length + 1); return ''; });
  title = title.replace(/#(\S+)/, (_, k) => { const f = TOPICS.find(x => x.id.startsWith(k.toLowerCase()) || x.t.toLowerCase().includes(k.toLowerCase())); if (f) topic = f.id; return ''; });
  title = title.replace(/(\d+)\s*🍅/, (_, n) => { est = +n; return ''; });
  title = title.replace(/\b(\d{4}-\d{2}-\d{2})\b/, (_, d) => { due = d; return ''; });
  title = title.replace(/\bin (\d+) days?\b/i, (_, n) => { due = addDays(t, +n); return ''; });
  title = title.replace(/\b(today|tomorrow|day after tomorrow)\b/i, m => { due = addDays(t, { today: 0, tomorrow: 1, 'day after tomorrow': 2 }[m.toLowerCase()]); return ''; });
  title = title.replace(/\b(?:on |next )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i, (m, k) => { const i = wd.indexOf(k.toLowerCase()); const cur = new Date().getDay(); due = addDays(t, ((i - cur + 7) % 7) || 7); return ''; });
  title = title.replace(/\b(\d{1,2})\/(\d{1,2})\b/, (_, d, m) => { const now = new Date(); const y = +m < now.getMonth() + 1 - 2 ? now.getFullYear() + 1 : now.getFullYear(); due = `${y}-${pad(m)}-${pad(d)}`; return ''; });
  return { title: title.replace(/\s+/g, ' ').trim(), due, prio, topic, est };
}

// ─── Catch-up plan for the next exam ─────────────────────────────────────
function recoveryPlan() {
  const t = today();
  const target = S.exams.find(e => e.date > t && S.outcome[e.id] !== 'passed');
  if (!target) return toast('No upcoming exam.');
  const from = addDays(t, 1), to = addDays(target.date, -1);
  const weak = TOPICS.filter(x => x.id !== 'oral').map(x => [x, (S.mastery[x.id] || 0) / 5 * 0.5 + topicProgress(x.id).all * 0.5]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  if (!weak.length) return toast('The subject needs topics first: upload files and press Reload.');
  const simsLeft = SIMS.map(s => s.id);
  const n = daysBetween(from, to) + 1;
  if (n < 2) return toast('Too little time for a plan: light review and flashcards!');
  const misc = weak[0].id;
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i), list = [];
    if (i === n - 1) list.push(['cards', misc, 2, 'Eve of the exam: light flashcards and the formula sheet. Early night.']);
    else if (i % 4 === 3) { const s = simsLeft.shift(); list.push(['mock', misc, 6, s ? `Timed mock exam: ${SIMS.find(x => x.id === s).t}` : 'Timed mock exam: past paper or mixed exercises']); list.push(['review', misc, 1, 'Self-grading and Mistakes log']); }
    else {
      const a = weak[(i * 2) % weak.length], b = weak[(i * 2 + 1) % weak.length];
      const ex = x => (x.es[0] ? [x.es[0].r] : x.lez[0] ? [x.lez[0]] : []);
      list.push(['practice', a.id, 3, `Strengthen: ${a.t}`, ex(a)]);
      list.push(['practice', b.id, 2, `Strengthen: ${b.t}`, ex(b)]);
      list.push(['review', misc, 1, 'Mistakes log: redo 2 open mistakes']);
      list.push(['cards', misc, 1, 'Today’s flashcards']);
    }
    S.extra[d] = (S.extra[d] || []).filter(x => !x.auto).concat(list.map(task => ({ id: uid(), auto: true, task })));
  }
  save(); toast(`Catch-up plan created until ${fmtDay(to)} (${target.t})`); render();
}

// ─── Search / command palette ────────────────────────────────────────────
function searchResults(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const out = [];
  for (const [id, t] of Object.entries(VIEW_TITLE())) if (t.toLowerCase().includes(q)) out.push({ ic: id, t, s: 'Go to page', run: () => go(id) });
  for (const s of subjects()) if ((s.name + ' ' + s.code).toLowerCase().includes(q)) out.push({ ic: 'topics', t: s.name, s: 'Switch subject', run: () => switchSubject(s.id) });
  for (const t of TOPICS) if (t.t.toLowerCase().includes(q)) out.push({ ic: 'topics', t: t.t, s: 'Topic', run: () => go('topics', { topic: t.id }) });
  for (const x of S.todos.filter(y => !y.done)) if (x.title.toLowerCase().includes(q)) out.push({ ic: 'todo', t: x.title, s: 'To-do', run: () => go('todo') });
  if ('focus lofi zen full screen'.includes(q)) out.push({ ic: 'lofi', t: 'Full-screen focus mode', s: 'Command', run: zenOn });
  if ('tutorial tour help'.includes(q)) out.push({ ic: 'spark', t: 'Replay the tutorial', s: 'Command', run: tourStart });
  if ('add subject new subject'.includes(q)) out.push({ ic: 'plus', t: 'Add a subject', s: 'Command', run: () => subjectModal() });
  if (CARDS.some(c => (c[1] + c[2]).toLowerCase().includes(q))) out.push({ ic: 'formulas', t: `Search “${q}” in the formula sheet`, s: 'Formula sheet', run: () => go('formulas', { q }) });
  return out.slice(0, 8);
}
let SR = [];
function showSearch() {
  const q = $('#q').value, box = $('#q-res');
  SR = searchResults(q);
  box.innerHTML = SR.map((r, i) => `<button data-a="sr" data-i="${i}">${ic(r.ic, 16)}<span><b>${esc(r.t)}</b><small>${esc(r.s)}</small></span></button>`).join('') || (q ? '<div class="small muted" style="padding:10px">No results</div>' : '');
  box.classList.toggle('on', !!q);
}
function switchSubject(id) { bindSubject(id); sub_menu = false; save(); go(view, {}); toast('Subject: ' + SUBJ.def.name); }

// ─── AI answers ──────────────────────────────────────────────────────────
const KIND_ALIAS = { teoria: 'theory', esercizi: 'practice', exercise: 'practice', exercises: 'practice', sim: 'mock', simulation: 'mock', ripasso: 'review', flash: 'cards', flashcards: 'cards', orale: 'oral', riposo: 'rest', study: 'theory', reading: 'theory', lecture: 'theory' };
function parseAiJson(txt) {
  txt = String(txt || '').trim();
  const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) txt = m[1];
  try { return JSON.parse(txt); } catch { /* try the outermost braces */ }
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a >= 0 && b > a) try { return JSON.parse(txt.slice(a, b + 1)); } catch { /* invalid */ }
  return null;
}
async function importAi(sel, raw) {
  const data = parseAiJson(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return toast('That does not look like the JSON the AI was asked for. Copy its whole answer, or the ```json block.');
  const clean = {};
  for (const k of ['topics', 'videos', 'cards', 'exams', 'phases', 'sims', 'processed']) if (Array.isArray(data[k])) clean[k] = data[k];
  if (data.resources && typeof data.resources === 'object') clean.resources = data.resources;
  if (data.plan && typeof data.plan === 'object') {
    clean.plan = {};
    for (const [d, v] of Object.entries(data.plan)) if (v && Array.isArray(v.tasks)) clean.plan[d] = { note: v.note || '', tasks: v.tasks.filter(Array.isArray).map(t => { const x = t.slice(0, 6); x[0] = KIND[x[0]] ? x[0] : KIND_ALIAS[String(x[0]).toLowerCase()] || 'theory'; x[2] = Math.max(0, Math.min(10, +x[2] || 1)); x[3] = String(x[3] || 'Study'); x[4] = Array.isArray(x[4]) ? x[4] : []; return x; }) };
  }
  let dropped = 0, kept = 0;
  if (clean.videos) {
    toast('Checking the videos on YouTube…');
    const ids = clean.videos.flatMap(v => (v.yt || []).map(y => Array.isArray(y) ? y[0] : y)).filter(x => /^[\w-]{11}$/.test(x));
    const ok = await window.api.ytCheck(ids);
    clean.videos = clean.videos.map(v => {
      const yt = (v.yt || []).map(y => Array.isArray(y) ? y : [y]).filter(y => { const good = ok[y[0]]; if (!good) dropped++; return good; })
        .map(y => [y[0], y[1] || ok[y[0]].title, y[2] || ok[y[0]].ch, y[3] || '']);
      kept += yt.length; return { ...v, yt };
    }).filter(v => v.yt.length && v.id);
  }
  const r = await window.api.subjectMerge(sel.folder, clean);
  await loadSubjects(); generatePlan(sel.id); bindSubject(CUR); render();
  toast(`Imported: ${plural(r.topics, 'topic')}, ${plural(kept, 'video')}${dropped ? ` (${dropped} not found on YouTube, skipped)` : ''}, ${plural(r.cards, 'flashcard')}, ${plural(r.days, 'day')} of plan`);
}
function busyDays(exceptId) {
  const out = [];
  for (let i = 1; i <= 60; i++) { const d = addDays(today(), i), n = autoLoad(exceptId, d); if (n) out.push(`${d}: ${n}`); }
  return out.join(', ');
}

// ─── Events ──────────────────────────────────────────────────────────────
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-a],[data-go],[data-pdf]');
  if (!e.target.closest('.drop,.subj-list,[data-a=bell],[data-a=subj-menu],.search')) { document.querySelectorAll('.drop.on').forEach(d => d.classList.remove('on')); if (sub_menu && !e.target.closest('#subj')) { sub_menu = false; menu(); } }
  if (!el) { if (e.target.id === 'modal') closeModal(); return; }
  if (el.dataset.pdf) {
    const R = RES[el.dataset.pdf];
    if (!R) return;
    const r = await window.api.openPdf(R.root, R.f, el.dataset.page ? +el.dataset.page : null);
    if (r === 'missing') toast('File not found: was it moved or renamed?');
    return;
  }
  if (el.dataset.go && !el.dataset.a) { e.preventDefault(); return go(el.dataset.go, el.dataset.vid ? { vid: el.dataset.vid } : {}); }
  const a = el.dataset.a, d = el.dataset;
  if (a && a.startsWith('onb-')) return onbAction(a, d, el);
  switch (a) {
    case 'plan-toggle': { const cur = S.plan[d.k]?.done; S.plan[d.k] = { done: !cur, at: Date.now() }; save(); if (!cur) toast('Done! ✓ You will find it in Completed'); render(); break; }
    case 'plan-move': { const to = reschedule(d.k); toast('Moved to ' + fmtDay(to)); render(); break; }
    case 'resched-all': { const od = overdue(); od.forEach(t => reschedule(t.key)); toast(`${plural(od.length, 'task')} rescheduled over the next days`); render(); break; }
    case 'focus-task': { const t = findPlanTask(d.k, d.date); P.task = { ...t, subj: CUR }; if (P.mode !== 'focus') pSet('focus'); pStart(); go('pomodoro'); break; }
    case 'focus-todo': { const x = S.todos.find(y => y.id === d.id); P.task = { key: 'todo:' + x.id, title: x.title, topic: x.topic, subj: x.subj }; if (P.mode !== 'focus') pSet('focus'); pStart(); go('pomodoro'); break; }
    case 'start-next': { const t = planTasks(today()).find(x => !x.done && x.p) || overdue()[0]; P.task = t ? { ...t, subj: CUR } : null; if (P.mode !== 'focus') pSet('focus'); pStart(); go('pomodoro'); break; }
    case 'sel-day': sub.day = d.d; render(); break;
    case 'recovery': recoveryPlan(); break;
    case 'todo-filter': sub.f = d.f; render(); break;
    case 'todo-sf': sub.sf = d.f; render(); break;
    case 'done-filter': sub[d.k] = d.v; render(); break;
    case 'todo-toggle': { const x = S.todos.find(y => y.id === d.id); x.done = !x.done; x.doneAt = x.done ? Date.now() : null; save(); render(); break; }
    case 'todo-del': S.todos = S.todos.filter(y => y.id !== d.id); save(); render(); break;
    case 'sub-toggle': { const x = S.todos.find(y => y.id === d.id); x.subs[+d.i].done = el.checked; save(); break; }
    case 'todo-edit': {
      const x = S.todos.find(y => y.id === d.id);
      modal(`<h2>Edit task</h2><form data-form="todo-save" data-id="${x.id}" class="grid">
        <label class="f">Title<input type="text" name="title" value="${esc(x.title)}"></label>
        <div class="grid g4"><label class="f">Subject<select name="subj"><option value="">—</option>${subjects().map(s => `<option value="${s.id}" ${x.subj === s.id ? 'selected' : ''}>${esc(short(s))}</option>`).join('')}</select></label><label class="f">Due<input type="date" name="due" value="${x.due || ''}"></label><label class="f">Priority<select name="prio">${[[1, 'Normal'], [2, 'High'], [3, 'Urgent']].map(([v, l]) => `<option value="${v}" ${x.prio === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="f">Estimate 🍅<input type="number" name="est" value="${x.est || 0}"></label></div>
        <label class="f">Topic<select name="topic"><option value="">—</option>${TOPICS.map(t => `<option value="${t.id}" ${x.topic === t.id ? 'selected' : ''}>${esc(t.t)}</option>`).join('')}</select></label>
        <label class="f">Subtasks (one per line)<textarea name="subs">${esc((x.subs || []).map(s => s.t).join('\n'))}</textarea></label>
        <label class="f">Notes<textarea name="notes">${esc(x.notes || '')}</textarea></label>
        <div class="row"><button class="btn pri">Save</button><button type="button" class="btn ghost" data-a="modal-close">Cancel</button></div></form>`);
      break;
    }
    case 'quick-add': modal(`<h2>New task</h2><p class="small muted" style="margin-top:-6px">Type naturally: <i>“redo exercise 7 tomorrow !! #limits 2🍅”</i></p>${todoForm()}`); break;
    case 'modal-close': closeModal(); break;
    case 'pomo-toggle': P.running ? pPause() : pStart(); break;
    case 'pomo-reset': pReset(); break;
    case 'pomo-skip': pSkip(); break;
    case 'pomo-mode': pSet(d.m); render(); break;
    case 'noise': toggleNoise(); render(); break;
    case 'lofi-toggle': case 'lofi-toggle-z': lofiToggle(); if (view === 'pomodoro' && !zen) render(); break;
    case 'lofi-stop': lofiPause(); break;
    case 'lofi-next': if (S.settings.lofi.src === 'gen') { Lofi.next(); toast('♫ ' + Lofi.name); } else { const i = LOFI_SRC.findIndex(x => x[0] === S.settings.lofi.src); lofiSetSrc(LOFI_SRC[(i + 1) % LOFI_SRC.length][0]); } break;
    case 'zen': zenOn(); break;
    case 'zen-pick': S.settings.zenBg = d.k; save(); if (BGSTATE[ZBG[d.k].f] !== true) bgDownload(ZBG[d.k].f); render(); break;
    case 'zen-bg': { const k = Object.keys(ZBG); S.settings.zenBg = k[(k.indexOf(S.settings.zenBg) + 1) % k.length]; save(); zenBuild(); toast('🎞 ' + ZBG[S.settings.zenBg].t); break; }
    case 'zen-off': zenOff(); break;
    case 'compact-on': document.body.classList.add('compact'); await window.api.compact(true); tick(); break;
    case 'compact-off': document.body.classList.remove('compact'); await window.api.compact(false); render(); break;
    case 'open-topic': go('topics', { topic: d.id }); break;
    case 'mastery': S.mastery[d.id] = (S.mastery[d.id] === +d.v ? +d.v - 1 : +d.v); save(); render(); break;
    case 'know': S.know[d.k] = el.checked; save(); el.closest('.know').classList.toggle('on', el.checked); break;
    case 'vid-watched': { const v = (S.videos[d.id] ||= {}); v.watched = !v.watched; save(); render(); break; }
    case 'vid-note-del': S.videos[d.id].notes = S.videos[d.id].notes.filter(n => String(n.at) !== d.at); save(); render(); break;
    case 'yt-pick': sub.yi = +d.i; render(); break;
    case 'yt-ext': window.api.openUrl('https://www.youtube.com/watch?v=' + d.y); break;
    case 'ext': e.preventDefault(); window.api.openUrl(d.u); break;
    case 'seek': ytCmd('seekTo', [+d.t, true]); ytCmd('playVideo'); break;
    case 'flip': sub.show = true; render(); break;
    case 'grade': grade(+d.i, +d.q); sub.show = false; render(); break;
    case 'sim-start': { const s = SIMS.find(x => x.id === d.id); sub = { run: { id: s.id, start: Date.now(), end: Date.now() + s.minutes * 60000 } }; render(); break; }
    case 'sim-end': sub.run.phase = 'grade'; sub.run.used = (Date.now() - sub.run.start) / 60000; render(); break;
    case 'sim-cancel': sub = {}; render(); break;
    case 'err-new': errModal(d.topic); break;
    case 'err-filter': sub.f = d.f; render(); break;
    case 'err-toggle': { const x = S.errors.find(y => y.id === d.id); x.resolved = !x.resolved; save(); render(); break; }
    case 'err-del': S.errors = S.errors.filter(y => y.id !== d.id); save(); render(); break;
    case 'backup': { await window.api.backup(S); toast('Backup saved'); break; }
    // subjects
    case 'subj-menu': sub_menu = !sub_menu; menu(); break;
    case 'subj-pick': switchSubject(d.id); break;
    case 'subj-add': sub_menu = false; subjectModal(); break;
    case 'subj-edit': subjectModal(subjects().find(x => x.id === d.id)); break;
    case 'subj-del': { const s = subjects().find(x => x.id === d.id);
      modal(`<h2>Remove “${esc(s.name)}”?</h2><p>Its folder (with the files you uploaded) is moved to the Recycle Bin, so you can still restore it from there. Its plan, flashcard progress and mistakes are removed from the app.</p>
        <div class="row"><button class="btn danger-fill" data-a="subj-del-yes" data-id="${s.id}">Remove the subject</button><button class="btn ghost" data-a="modal-close">Cancel</button></div>`); break; }
    case 'subj-del-yes': {
      const s = subjects().find(x => x.id === d.id); if (!s) break;
      const ok = await window.api.subjectRemove(s.folder);
      S.subjects = S.subjects.filter(x => x.id !== s.id); delete S.sub[s.id];
      S.errors = S.errors.filter(x => x.subj !== s.id);
      if (CUR === s.id) bindSubject(subjects()[0]?.id || ''); else bindSubject(CUR);
      save(); closeModal(); await loadSubjects(); bindSubject(CUR); topbar(); render();
      toast(ok ? `${s.name} removed (its folder is in the Recycle Bin)` : `${s.name} removed from the app; the folder could not be moved`); break;
    }
    case 'theme': S.settings.theme = d.t; document.body.classList.toggle('light', d.t === 'light'); save(); sendPrefs(); topbar(); render(); break;
    case 'bell': {
      const h = S.popHist || [];
      if ($('#bell')?.classList.contains('on')) { $('#bell').classList.remove('on'); break; } // a second click closes it
      S.unseen = 0; topbar(); const nb = $('#bell');
      nb.innerHTML = `<div class="row" style="padding:10px 12px 6px"><b>Reminders</b><span class="sp"></span><button class="btn sm ghost" data-a="pop-test" data-k="dhikr">Dhikr now</button><button class="btn sm ghost" data-a="pop-test" data-k="verse">Verse</button></div>
        ${h.slice(0, 10).map(x => `<div class="nrow"><span class="ni">${x.type === 'prayer' ? '🕌' : x.type === 'verse' ? '۞' : x.type === 'dhikr' ? '☾' : '☪'}</span><span class="ell" style="flex:1"><b>${esc(x.title)}</b><small>${{ prayer: 'Prayer', verse: 'Verse', dhikr: 'Dhikr', holiday: 'Special day' }[x.type]}</small></span><span class="faint small">${new Date(x.at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('') || '<div class="small muted" style="padding:10px 12px 14px">No reminders yet: the first one arrives a couple of minutes after the app starts.</div>'}`;
      nb.classList.add('on'); break;
    }
    case 'sr': { const r = SR[+d.i]; $('#q').value = ''; $('#q-res').classList.remove('on'); r && r.run(); break; }
    // prayers
    case 'pr-notif': S.settings.prayers[d.k] = !S.settings.prayers[d.k]; save(); sendPrefs(); render(); break;
    case 'pop-test': window.api.testPopup(d.k); break;
    case 'pm': { const [y, m] = (sub.month || today().slice(0, 7)).split('-').map(Number); sub.month = +d.d === 0 ? today().slice(0, 7) : iso(new Date(y, m - 1 + +d.d, 1)).slice(0, 7); render(); break; }
    case 'atab': sub.atab = d.k; render(); break;
    case 'dhikr-open': { const x = OFFL.adhkar.find(y => y.id === d.id); modal(`<h2>${esc(x.title)}</h2><div class="dhikr-img"><img src="${OFFL.hubUrl}/Offline/${x.img}" alt=""></div>${x.translit ? `<p class="small"><b>Pronunciation:</b> ${esc(x.translit)}</p>` : ''}${x.meaning ? `<p class="small"><b>Meaning:</b> ${esc(x.meaning)}</p>` : ''}${x.virtue ? `<p class="small muted"><b>Virtue:</b> ${esc(x.virtue)}</p>` : ''}<p class="small faint">${esc(x.ref || '')} · duasrevival.com</p><div class="row"><button class="btn pri" data-a="modal-close">Close</button></div>`); break; }
    case 'geo-pick': sub.geoPick = sub.geo[+d.i]; render(); break;
    case 'geo-save': { const g = sub.geoPick; await setLocation(g, $('#geo-method').value, $('#geo-madhab').value); sub.geo = []; sub.geoPick = null; topbar(); render(); break; }
    case 'islamic': S.settings.islamic = el.checked; save(); sendPrefs(); applyHoliday(); topbar(); render(); break;
    case 'islamic-on': S.settings.islamic = true; save(); sendPrefs(); topbar(); render(); break;
    case 'content-dl': {
      el.disabled = true; const pr = () => $('#dl-prog'); if (pr()) pr().textContent = 'Starting…';
      const r = await window.api.contentDownload(['verses', 'adhkar']);
      OFFL = { ...OFFL, ...(await window.api.offline()) };
      ONB.dl = r.error ? 'Stopped: ' + r.error : `✓ ${r.adhkar || 0} adhkar and ${r.verses || 0} Qur’an passages saved`;
      toast(ONB.dl); if (!$('#onb').classList.contains('hidden')) onbRender(); else render(); break;
    }
    // materials
    case 'ms': sub.ms = d.id; sub.picked = []; render(); break;
    case 'pick': { const p = await window.api.pickFiles(); if (p.length) { sub.picked = [...(sub.picked || []), ...p]; sub.arg = document.querySelector('[name=arg]').value; render(); } break; }
    case 'fopen': window.api.openFile(d.rel); break;
    case 'open-folder': window.api.openFolder(d.k); break;
    case 'ai-pick': sub.ai = d.k; render(); break;
    case 'reload-plan': {
      await loadSubjects(); const id = sub.ms || CUR, r = generatePlan(id); bindSubject(CUR); render();
      toast(r && r.tasks ? `Plan ready for ${subjDef(id).name}: ${plural(r.tasks, 'task')} over ${plural(r.topics, 'topic')}, ${fmtDay(r.from, { day: 'numeric', month: 'short' })} → ${fmtDay(r.to, { day: 'numeric', month: 'short' })}` : 'No files to plan yet: upload some first.'); break;
    }
    case 'hub-change': {
      const p = await window.api.pickHub(); if (!p) break;
      const h = await window.api.hubInit(p); S.settings.hub = h.hub; OFFL.hub = h.hub; OFFL.hubUrl = h.hubUrl; save(); sendPrefs();
      OFFL = { ...OFFL, ...(await window.api.offline()) }; await loadSubjects(); await refreshBgState(); bindSubject(CUR);
      toast('Data folder: ' + h.hub + ' (files in the old folder were not moved)'); if (!$('#onb').classList.contains('hidden')) onbRender(); else render(); break;
    }
    case 'tour': closeModal(); tourStart(); break;
    case 'tour-next': TI++; tourShow(); break;
    case 'tour-prev': TI = Math.max(0, TI - 1); tourShow(); break;
    case 'tour-end': tourEnd(); break;
    case 'onboarding': onbOpen(0); break;
  }
});
document.addEventListener('change', e => {
  const el = e.target, a = el.dataset.a;
  if (a === 'pomo-task') {
    const [k, id, date] = el.value.split('|');
    P.task = !k ? null : k === 'plan' ? { ...findPlanTask(id, date), subj: CUR } : (() => { const x = S.todos.find(y => y.id === id); return { key: 'todo:' + x.id, title: x.title, topic: x.topic, subj: x.subj }; })();
    tick();
  }
  if (a === 'lofi-src' || a === 'lofi-src-sel') lofiSetSrc(el.value);
  if (a === 'lofi-auto') { S.settings.lofi.auto = el.checked; save(); }
  if (a === 'pref') { S.settings[el.dataset.k] = el.checked; save(); sendPrefs(); }
  if (a === 'pref-num') { S.settings[el.dataset.k] = +el.value; save(); sendPrefs(); if (el.dataset.k === 'hijriOffset') { applyHoliday(); render(); } }
});
document.addEventListener('input', e => {
  const a = e.target.dataset.a;
  if (a === 'formula-q') { sub.q = e.target.value; sub.focusQ = true; render(); }
  if (a === 'lofi-vol') { S.settings.lofi.vol = +e.target.value; Lofi.volume(+e.target.value); radioCmd('setVolume', [Math.round(+e.target.value * 100)]); save(); }
  if (e.target.id === 'q') showSearch();
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, fd = Object.fromEntries(new FormData(f)), kind = f.dataset.form;
  if (kind === 'quick-todo') { if (!fd.q.trim()) return; const p = parseQuick(fd.q); S.todos.push({ id: uid(), created: Date.now(), done: false, subj: CUR, ...p }); save(); toast('Added to your To-do'); render(); }
  if (kind === 'todo-add') {
    const p = parseQuick(fd.title);
    S.todos.push({ id: uid(), created: Date.now(), done: false, subj: fd.subj || CUR, title: p.title, due: fd.due || p.due, prio: Math.max(+fd.prio, p.prio), topic: fd.topic || p.topic, est: +fd.est || p.est });
    save(); closeModal(); toast('Task added'); render();
  }
  if (kind === 'todo-save') {
    const x = S.todos.find(y => y.id === f.dataset.id);
    const old = Object.fromEntries((x.subs || []).map(s => [s.t, s.done]));
    Object.assign(x, { title: fd.title, subj: fd.subj, due: fd.due || null, prio: +fd.prio, est: +fd.est, topic: fd.topic, notes: fd.notes, subs: fd.subs.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ t, done: !!old[t] })) });
    save(); closeModal(); render();
  }
  if (kind === 'vid-note') { const v = (S.videos[f.dataset.id] ||= {}); (v.notes ||= []).push({ t: Math.floor(ytTime), y: f.dataset.y, at: Date.now(), text: fd.text }); v.notes.sort((a, b) => a.t - b.t); save(); render(); }
  if (kind === 'err-add') { S.errors.push({ id: uid(), date: today(), resolved: false, subj: CUR, ...fd }); save(); closeModal(); toast('Mistake logged: now it is a rule'); render(); }
  if (kind === 'sim-grade') {
    const s = SIMS.find(x => x.id === sub.run.id);
    const scores = s.parts.map((p, i) => Math.min(p[1], Math.max(0, +fd['s' + i] || 0)));
    S.sims.push({ sim: s.id, date: today(), scores, total: scores.reduce((a, b) => a + b, 0), max: s.parts.reduce((a, p) => a + p[1], 0), minutes: Math.round(sub.run.used) });
    save(); sub = {}; toast('Result saved'); render();
  }
  if (kind === 'upload') {
    const sel = subjDef(sub.ms || CUR), arg = fd.arg.trim();
    if (!arg || !sub.picked?.length) return;
    const r = await window.api.importFiles(sel.folder, arg, sub.picked);
    toast(`${plural(r.files.length, 'file')} added to ${short(sel)} · ${r.topic}. Press Reload to plan them.`);
    sub.picked = []; sub.arg = arg; await loadSubjects(); bindSubject(CUR); render();
  }
  if (kind === 'ai') {
    const sel = subjDef(sub.ms || CUR), sd = SDATA[sel.folder] || { files: {} }, proc = new Set(sd.data?.processed || []);
    const files = Object.entries(sd.files || {}).flatMap(([a, xs]) => xs.map(x => a + '/' + x.name)).filter(r => !proc.has(r));
    if (!files.length && !fd.note.trim()) return toast('No new files: upload something, or write a note for the AI.');
    const ai = sub.ai || (HAS_CLAUDE ? 'claude-code' : 'chatgpt');
    const r = await window.api.aiRequest({ ai, subject: sel.name, folder: sel.folder, files, note: fd.note.trim(), exam: sel.exam, dailyGoal: S.settings.dailyGoal, focus: S.settings.focus, lang: S.settings.videoLang, busy: busyDays(sel.id) });
    for (const x of files) S.files[sel.id + '|' + x] = { req: r.name, at: Date.now() };
    S.requests.push({ id: uid(), subj: sel.id, ai, at: Date.now(), name: r.name, files });
    save(); render();
    if (ai === 'claude-code') toast('Claude Code is opening in your data folder. Press Reload when it has finished.');
    else modal(`<h2>Prompt copied ✓</h2><ol class="small" style="line-height:1.8"><li>The website of ${esc((AIS.find(x => x[0] === ai) || [])[1])} and your subject folder just opened.</li><li>Drag the files from the folder into the chat (attach them).</li><li>Paste the prompt with <b>Ctrl V</b> and send it.</li><li>Copy the whole answer and paste it into <b>Paste the AI’s answer</b> on this page, then press <b>Import</b>.</li></ol><div class="row"><button class="btn pri" data-a="modal-close">Got it</button></div>`);
  }
  if (kind === 'ai-import') { const sel = subjDef(sub.ms || CUR); await importAi(sel, fd.json); }
  if (kind === 'settings') {
    const s = S.settings;
    for (const k of ['focus', 'short', 'long', 'longEvery', 'dailyGoal', 'newCardsPerDay']) s[k] = +fd[k];
    for (const k of ['autoBreak', 'autoFocus', 'sound', 'notch', 'autostart']) s[k] = !!fd[k];
    s.name = (fd.name || '').trim(); s.videoLang = (fd.videoLang || 'English').trim() || 'English';
    s.theme = fd.theme; document.body.classList.toggle('light', s.theme === 'light');
    if (!P.running) P.left = modeLen(P.mode);
    save(); sendPrefs(); toast('Settings saved'); topbar(); render();
  }
  if (kind === 'subj-save' || kind === 'onb-subj') {
    const id = f.dataset.id, name = (fd.name || '').trim(); if (!name) return;
    let s = id && subjects().find(x => x.id === id);
    const before = s ? s.exam + '|' + s.start : '';
    if (s) {
      if (name !== s.name) { const nf = await window.api.subjectRename(s.folder, name); if (!nf) return toast('A subject folder with that name already exists.'); s.folder = nf; }
      Object.assign(s, { name, code: (fd.code || '').trim(), exam: fd.exam || '', start: fd.start || '', color: fd.color || s.color });
    } else {
      if (subjects().some(x => x.name.toLowerCase() === name.toLowerCase())) return toast('You already have a subject with that name.');
      const folder = await window.api.subjectFolder(name);
      s = { id: 's' + uid(), name, code: (fd.code || '').trim(), exam: fd.exam || '', start: fd.start || '', color: fd.color || SUBJ_COLORS[subjects().length % SUBJ_COLORS.length], folder, created: today() };
      S.subjects.push(s); CUR = s.id;
    }
    await loadSubjects();
    if (s && before && before !== s.exam + '|' + s.start && S.sub[s.id]?.auto) generatePlan(s.id);
    bindSubject(CUR); save(); closeModal(); topbar();
    if (!$('#onb').classList.contains('hidden')) onbRender(); else { render(); if (!id) toast(`${name} added. Next: upload its files here in Materials.`); if (!id && view !== 'materials') go('materials', { ms: s.id }); }
  }
  if (kind === 'geo' || kind === 'onb-geo') {
    const q = (fd.q || '').trim(); if (!q) return;
    let res = []; try { res = await window.api.geoSearch(q); } catch { return toast('City search needs an internet connection.'); }
    if (!res.length) return toast('No place found with that name.');
    if (kind === 'geo') { sub.geoQ = q; sub.geo = res; sub.geoPick = null; render(); } else { ONB.geo = res; onbRender(); }
  }
});
document.addEventListener('keydown', e => {
  if (!$('#tour').classList.contains('hidden')) { if (e.key === 'Escape') tourEnd(); if (e.key === 'ArrowRight' || e.key === 'Enter') { TI++; tourShow(); } if (e.key === 'ArrowLeft') { TI = Math.max(0, TI - 1); tourShow(); } return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); return; }
  if (e.key === 'Escape') { if (zen) return zenOff(); closeModal(); closeDrops(); return; }
  if (e.target.id === 'q' && e.key === 'Enter') { const r = SR[0]; if (r) { e.target.value = ''; $('#q-res').classList.remove('on'); r.run(); } return; }
  if (e.target.matches('input,textarea,select')) return;
  if (zen && e.code === 'Space') { e.preventDefault(); P.running ? pPause() : pStart(); return; }
  if (view === 'review') {
    if (e.code === 'Space') { e.preventDefault(); if (!sub.show) { sub.show = true; render(); } }
    const due = dueCards(); if (sub.show && due.length && ['1', '2', '3', '4'].includes(e.key)) { grade(due[0], +e.key - 1); sub.show = false; render(); }
  }
  if (view === 'pomodoro' && e.code === 'Space') { e.preventDefault(); P.running ? pPause() : pStart(); }
});
window.addEventListener('beforeunload', () => { if (!S) return; if (P.running && P.mode === 'focus') logSession(false); const o = { ...S }; for (const k of [...SUBKEYS, 'popHist', 'unseen']) delete o[k]; window.api.save(o); });
// Commands from the notch / main process
window.api.on('cmd', c => {
  if (c === 'toggle') P.running ? pPause() : pStart();
  if (c === 'skip') pSkip();
  if (c === 'lofi') lofiToggle();
  if (c === 'zen') zenOn();
  if (c === 'zen-exit' && zen) { zen = false; document.body.classList.remove('zen', 'zen-yt'); $('#zen').innerHTML = ''; radioCover(); render(); }
});
// Frameless window (Windows): our own buttons, drag by the top bar, double-click to maximise.
document.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) window.api.win(b.dataset.w); });
document.addEventListener('dblclick', e => { if (document.body.classList.contains('frameless') && e.target.closest('#top') && !e.target.closest('button, input, select, .search, .seg, .drop')) window.api.win('max'); });
window.api.on('win:state', s => { document.body.classList.toggle('frameless', !!s.frameless); document.body.classList.toggle('maxed', !!s.max); });
window.api.on('popup:history', h => { S.popHist = h; S.unseen = (S.unseen || 0) + 1; topbar(); if (view === 'prayers') render(); });
window.api.on('content:progress', p => { const t = `${p.step}: ${p.i} / ${p.n}`; ONB.dl = t; const el = $('#dl-prog'); if (el) el.textContent = t; });

// ─── Boot ────────────────────────────────────────────────────────────────
(async () => {
  const loaded = await window.api.load();
  S = Object.assign(DEFAULT(), loaded || {});
  const D0 = DEFAULT().settings;
  S.settings = Object.assign(D0, S.settings);
  S.settings.lofi = Object.assign(DEFAULT().settings.lofi, S.settings.lofi);
  S.settings.prayers = Object.assign(DEFAULT().settings.prayers, S.settings.prayers);
  if (!LOFI_SRC.some(x => x[0] === S.settings.lofi.src)) S.settings.lofi.src = 'gen';
  if (!ZBG[S.settings.zenBg]) S.settings.zenBg = 'collina';
  for (const k of SUBKEYS) delete S[k];
  const h = await window.api.hubInit(S.settings.hub || null);
  S.settings.hub = h.hub; OFFL.hub = h.hub; OFFL.hubUrl = h.hubUrl;
  const info = await window.api.info(); APPINFO = info; METHODS = info.methods; REPO_URL = info.repo || REPO_URL;
  document.body.classList.toggle('light', S.settings.theme === 'light');
  sendPrefs();
  try { OFFL = { ...OFFL, ...(await window.api.offline()) }; } catch (e) { console.warn(e); }
  S.popHist = await window.api.popupHistory(); S.unseen = 0;
  await loadSubjects();
  bindSubject(S.settings.subject);
  applyHoliday();
  await refreshBgState();
  P.left = modeLen('focus');
  save();
  topbar();
  render();
  if (lofiOnline()) setTimeout(() => !RADIO.key && radioEnsure(S.settings.lofi.src, false), 1500); // warm player
  if (!S.onboarded && !window.TL_NO_ONBOARDING) onbOpen(0);
  // Refresh "today" views when the date changes (app left open overnight).
  let day = today(); setInterval(() => { if (today() !== day) { day = today(); applyHoliday(); render(); } }, 60000);
  setInterval(() => { if ((view === 'today' || view === 'prayers') && !zen && !document.activeElement.matches('input,textarea,select') && $('#modal').classList.contains('hidden') && $('#tour').classList.contains('hidden')) { const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; } }, 60000);
})();

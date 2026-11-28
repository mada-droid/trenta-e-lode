// general.js — "Generale" tasks: personal to-dos for a day (or repeating) that are not tied to a subject,
// e.g. working out, praying, calling home. They show in Oggi/Today and in the plan's day panel whatever
// subject is selected, and count towards "everything done today". Shared by the Italian and English editions.
const GEN = (() => {
  const IT = document.documentElement.lang === 'it';
  const L = IT ? {
    head: 'Generale', hint: 'per tutte le materie', ph: 'Aggiungi per tutte le materie… es. Allenamento, Chiamare mamma',
    rep: { '': 'Solo questo giorno', daily: 'Ogni giorno', weekdays: 'Lun–ven', weekly: 'Ogni settimana' },
    add: 'Aggiungi', del: 'Elimina', skip: 'Salta oggi', delAll: 'Elimina la serie', done: 'Fatto! ✓', added: 'Aggiunto in Generale', none: 'Niente in Generale per questo giorno.',
    allDone: 'Tutto fatto per oggi! 🎉 Ottimo lavoro',
  } : {
    head: 'General', hint: 'for every subject', ph: 'Add for every subject… e.g. Workout, Call mom',
    rep: { '': 'Only this day', daily: 'Every day', weekdays: 'Mon–Fri', weekly: 'Every week' },
    add: 'Add', del: 'Delete', skip: 'Skip this day', delAll: 'Delete the series', done: 'Done! ✓', added: 'Added to General', none: 'Nothing in General for this day.',
    allDone: 'Everything done for today! 🎉 Great work',
  };
  const EMO = [[/allen|palestr|gym|workout|corsa|corr|run|sport|nuot|swim|esercizio fisico|stretch/i, '🏋️'], [/preg|salah|salat|pray|cora|quran|qur|dhikr|adhkar|moschea|mosque/i, '🕌'],
    [/chiam|telefon|call|phone|mamma|mom|mum|papà|dad|famiglia|family/i, '📞'], [/spesa|grocer|shopping|compr/i, '🛒'], [/pulir|pulizi|clean|lavatric|laundry|bucato/i, '🧹'],
    [/legg|libro|read|book/i, '📖'], [/medit|respir|breath/i, '🧘'], [/dorm|sonno|sleep|nap/i, '😴'], [/acqua|water|idrat/i, '💧'], [/cucin|cook|pranzo|cena|lunch|dinner/i, '🍳'], [/passegg|walk/i, '🚶']];
  const emoji = s => /^\p{Extended_Pictographic}/u.test(s) ? '' : ((EMO.find(([r]) => r.test(s)) || [])[1] || '');
  const list = () => (S.general ||= []);
  const dow = d => (parse(d).getDay() + 6) % 7; // 0 = Monday
  function occurs(g, d) {
    if (g.skip && g.skip[d]) return false;
    if (!g.repeat) return g.date === d;
    if (d < g.date) return false;
    return g.repeat === 'daily' || (g.repeat === 'weekdays' && dow(d) < 5) || (g.repeat === 'weekly' && dow(d) === dow(g.date));
  }
  const on = d => list().filter(g => occurs(g, d));
  const isDone = (g, d) => !!(g.done && g.done[d]);
  const allDone = d => on(d).every(g => isDone(g, d));
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function section(d) {
    const items = on(d);
    return `<div class="gen-sec"><div class="row gen-head"><h3>${L.head}</h3><span class="faint small">· ${L.hint}</span></div>
      ${items.map(g => { const dn = isDone(g, d); return `<div class="task gen-task ${dn ? 'done' : ''}"><button class="chk" data-a="gen-toggle" data-id="${g.id}" data-d="${d}" title="${L.done}"></button>
        <div class="body"><div class="ttl">${g.emoji ? g.emoji + ' ' : ''}${esc2(g.title)}</div>${g.repeat ? `<div class="meta"><span class="pill">↻ ${L.rep[g.repeat]}</span></div>` : ''}</div>
        <div class="acts">${g.repeat ? `<button class="btn sm ghost" data-a="gen-skip" data-id="${g.id}" data-d="${d}" title="${L.skip}">⤼</button><button class="btn sm ghost danger" data-a="gen-del" data-id="${g.id}" title="${L.delAll}">✕</button>`
          : `<button class="btn sm ghost danger" data-a="gen-del" data-id="${g.id}" title="${L.del}">✕</button>`}</div></div>`; }).join('')}
      <form class="row gen-add" data-form="gen-add" data-d="${d}"><input type="text" name="title" placeholder="${L.ph}" autocomplete="off" style="flex:1">
        <select name="rep">${Object.entries(L.rep).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn sm">${L.add}</button></form></div>`;
  }
  // Ticked: tick sound, or the big one when today's plan (current subject) and General are all done.
  function celebrate(d) {
    const t = today();
    if (d === t && allDone(t) && planTasks(t).every(x => x.done)) { SFX.dayDone(); toast(L.allDone); }
    else { const items = on(d), n = items.filter(g => isDone(g, d)).length; SFX.tick(items.length ? n / items.length : 0.5); toast(L.done); }
  }
  function keepScroll(fn) { const v = $('#view'), y = v.scrollTop; fn(); render(); v.scrollTop = y; }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a^="gen-"]'); if (!el) return;
    const d = el.dataset, g = list().find(x => x.id === d.id); if (!g) return;
    if (d.a === 'gen-toggle') keepScroll(() => { g.done ||= {}; if (g.done[d.d]) { delete g.done[d.d]; SFX.untick(); } else { g.done[d.d] = Date.now(); celebrate(d.d); } save(); });
    if (d.a === 'gen-skip') keepScroll(() => { (g.skip ||= {})[d.d] = true; save(); });
    if (d.a === 'gen-del') keepScroll(() => { S.general = list().filter(x => x !== g); SFX.untick(); save(); });
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (f.dataset.form !== 'gen-add') return;
    e.preventDefault();
    const fd = new FormData(f), title = String(fd.get('title') || '').trim(); if (!title) return;
    keepScroll(() => { list().push({ id: Math.random().toString(36).slice(2, 10), title, emoji: emoji(title), date: f.dataset.d, repeat: fd.get('rep') || '', done: {}, created: Date.now() }); save(); toast(L.added); });
    setTimeout(() => { const i = document.querySelector(`.gen-add[data-d="${f.dataset.d}"] input`); if (i) i.focus(); }, 30);
  });
  // ─── From "New task" / To-do: "General" as a choice in the Subject menu ───
  const GKEY = '__gen';
  const opt = () => `<option value="${GKEY}">✦ ${L.head} (${L.hint})</option>`;
  const repField = () => `<label class="f gen-only" style="display:none">${IT ? 'Ripeti' : 'Repeat'}<select name="rep">${Object.entries(L.rep).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>`;
  function add({ title, date, repeat = '' }) {
    list().push({ id: Math.random().toString(36).slice(2, 10), title, emoji: emoji(title), date: date || today(), repeat, done: {}, created: Date.now() });
    save(); toast(L.added);
  }
  // To-do tab: every General task, upcoming first; ticks apply to the task's day (today for repeating ones).
  function todoCard() {
    const t = today(), gs = list().slice().sort((a, b) => (!!a.repeat - !!b.repeat) || a.date.localeCompare(b.date));
    const when = g => g.repeat ? `↻ ${L.rep[g.repeat]}` : g.date === t ? (IT ? 'oggi' : 'today') : fmtDay(g.date);
    return `<div class="card gen-card" style="margin-top:16px"><div class="row gen-head"><h2 style="margin:0">✦ ${L.head}</h2><span class="faint small">· ${L.hint}</span></div>
      ${gs.length ? gs.map(g => { const d = g.repeat ? t : g.date, show = !g.repeat || occurs(g, t), dn = isDone(g, d); return `<div class="task gen-task ${dn ? 'done' : ''}">
        ${show ? `<button class="chk" data-a="gen-toggle" data-id="${g.id}" data-d="${d}"></button>` : '<span class="chk" style="visibility:hidden"></span>'}
        <div class="body"><div class="ttl">${g.emoji ? g.emoji + ' ' : ''}${esc2(g.title)}</div><div class="meta"><span class="pill ${!g.repeat && g.date < t && !dn ? 'warn' : ''}">${when(g)}</span></div></div>
        <div class="acts"><button class="btn sm ghost danger" data-a="gen-del" data-id="${g.id}" title="${g.repeat ? L.delAll : L.del}">✕</button></div></div>`; }).join('')
        : `<div class="empty">${L.none}</div>`}</div>`;
  }
  // Show "Repeat" only when General is picked in a task form.
  document.addEventListener('change', e => {
    const s = e.target; if (s.name !== 'subj' || !s.closest('form')) return;
    const f = s.closest('form'), g = s.value === GKEY;
    f.querySelectorAll('.gen-only').forEach(x => { x.style.display = g ? '' : 'none'; });
    f.querySelectorAll('[name=topic],[name=est],[name=prio]').forEach(x => { const l = x.closest('label'); if (l) l.style.display = g ? 'none' : ''; });
  });
  return { section, on, allDone, occurs, add, opt, repField, todoCard, KEY: GKEY };
})();

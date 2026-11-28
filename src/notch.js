'use strict';
// Dynamic notch: a pill hanging from the top edge while the main window is minimised.
// Collapsed: timer ring + time + next prayer. Hover: task, progress, controls, prayer/exam/lofi info.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pill = document.getElementById('pill');
let S = null;
function ring(frac, col) {
  const C = 2 * Math.PI * 9;
  return `<svg class="ring" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C * frac} ${C}"/></svg>`;
}
function render() {
  if (!S) return;
  document.body.classList.toggle('light', S.theme === 'light');
  const p = S.pomo, pr = S.prayer;
  const col = p.mode === 'focus' ? '#e0806a' : '#8cc0a0';
  const eq = S.lofi && S.lofi.on ? '<span class="bars"><i></i><i></i><i></i></span>' : '';
  document.getElementById('mini').innerHTML = `${ring(p.frac, col)}<span class="t">${p.txt}</span><span class="lbl">${p.running ? esc(p.label) : esc(S.subj.short) + ' · paused'}</span>${eq}<span class="sp"></span>
    ${pr ? `<span class="pr">${esc(pr.name)} ${esc(pr.hhmm)}</span>` : ''}`;
  document.getElementById('full').innerHTML = `
    <div class="row"><span class="chip"><span class="dot" style="background:${S.subj.color}"></span>${esc(S.subj.short)}</span><span class="task">${esc(p.task || 'No task linked')}</span>
      <span class="foot ${S.hol && S.hol.kind === 'ramadan' ? 'ram' : ''}">${esc(S.hol ? S.hol.name + ' · ' : '')}${esc(S.hijri || '')}</span></div>
    <div class="row"><span class="big" style="color:${p.running ? col : '#f1ebe0'}">${p.txt}</span>
      <div style="flex:1;display:grid;gap:5px;margin-left:6px"><span class="foot">${esc(p.label)}${p.running ? '' : ' · paused'} · ${p.today} 🍅 today</span><div class="prog"><i style="width:${(1 - p.frac) * 100}%;background:${col}"></i></div></div>
      <button class="pri" data-c="toggle" title="${p.running ? 'Pause' : 'Start'}">${p.running ? '❚❚' : '▶'}</button><button data-c="skip" title="Skip">⏭</button>
      <button data-c="lofi" title="Lofi">${S.lofi && S.lofi.on ? '♫' : '♪'}</button><button data-c="open" title="Open the app">⤢</button></div>
    <div class="row foot">${pr ? `🕌 <b>${esc(pr.name)}</b>&nbsp;at ${esc(pr.hhmm)} · in ${esc(pr.inTxt)}` : ''}<span class="sp"></span>${S.exam ? `📅 ${esc(S.exam.t)} in <b>&nbsp;${S.exam.days} d</b>` : ''}${S.lofi && S.lofi.on ? ` · ♫ ${esc(S.lofi.name)}` : ''}</div>`;
}
ov.on('status', s => { S = s; render(); });
ov.on('pulse', () => { pill.classList.remove('pulse'); void pill.offsetWidth; pill.classList.add('pulse'); });
// Open/close comes from the main process, which polls the cursor (works even when another app has focus).
ov.on('notch:hover', over => pill.classList.toggle('open', !!over));
pill.addEventListener('mouseenter', () => ov.send('notch:mouse', false));
pill.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) ov.send('notch:cmd', b.dataset.c); else if (!pill.classList.contains('open')) ov.send('notch:cmd', 'open'); });
pill.addEventListener('dblclick', e => { if (!e.target.closest('[data-c]')) ov.send('notch:cmd', 'open'); });
pill.addEventListener('contextmenu', e => { e.preventDefault(); ov.send('notch:menu'); });

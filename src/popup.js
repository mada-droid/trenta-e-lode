'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MOSQUE = '<svg width="170" height="120" viewBox="0 0 170 120" fill="currentColor"><path d="M20 120V60h8v-8l4-10 4 10v8h8v60zM130 120V60h8v-8l4-10 4 10v8h8v60zM50 120V78c0-22 35-38 35-38s35 16 35 38v42z"/><circle cx="85" cy="30" r="5"/></svg>';
let timer, left = 0, total = 0, paused = false, cur = null;
function close() { const c = document.querySelector('.card'); if (c) c.classList.add('out'); clearInterval(timer); setTimeout(() => ov.send('pop:close', cur && cur.id), 300); }
function chime() {
  try { const a = new AudioContext(); [[587, 0], [784, .22], [988, .44]].forEach(([f, d]) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + d; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 1.5); }); } catch (e) { /* audio unavailable */ }
}
// The dhikr is an image: load and decode it before drawing the card, so the text never appears before it.
let seq = 0;
async function show(m) {
  const my = ++seq;
  if (m.type === 'dhikr' && m.img) { const im = new Image(); im.src = m.img; try { await im.decode(); } catch (e) { /* missing image: show the text anyway */ } }
  if (my === seq) render(m);
}
function render(m) {
  cur = m;
  document.body.classList.toggle('light', m.theme === 'light');
  let cls = '', hd = '', body = '', ft = '';
  if (m.type === 'dhikr') {
    const d = m.item;
    hd = `<span class="ic">${m.item.when === 'morning' ? '☀' : '☾'}</span><div><b>${d.when === 'morning' ? 'Morning' : 'Evening'} adhkar</b><small>${esc(d.title)}</small></div>`;
    body = `<div class="frame"><img src="${esc(m.img)}" alt=""></div>
      ${d.virtue ? `<div class="meta"><b>Virtue:</b> ${esc(d.virtue)}</div>` : ''}
      ${d.translit ? `<details><summary>Pronunciation & meaning</summary>${esc(d.translit)}${d.meaning ? `<p style="margin:6px 0 0"><i>${esc(d.meaning)}</i></p>` : ''}</details>` : ''}`;
    ft = `<span class="src">${esc(d.ref || '')} · duasrevival.com</span><button class="btn pri" data-x>Done ✓</button>`;
  } else if (m.type === 'verse') {
    const v = m.item;
    hd = `<span class="ic">۞</span><div><b>A verse for you</b><small>${esc(v.surah.tr)} (${v.s}) · ${v.a === v.b ? v.a : v.a + '–' + v.b}</small></div>`;
    body = `<div class="verse ar">${v.ar.map((t, i) => esc(t) + ` <span style="font-size:.7em;color:var(--accent2)">﴿${(v.a + i).toLocaleString('ar-EG')}﴾</span>`).join(' ')}</div>
      <div class="tr">${esc((v.en || []).join(' '))}</div><div class="ref">Surah ${esc(v.surah.tr)} ${esc(v.ref)} · Saheeh International</div>`;
    ft = `<span class="src">Uthmani text · quran.com</span><button class="btn pri" data-x>Done ✓</button>`;
  } else if (m.type === 'prayer') {
    cls = 'prayer' + (m.ramadan ? ' ramadan' : '');
    hd = `<span class="ic">🕌</span><div><b>${m.ramadan && m.key === 'maghrib' ? 'Ifṭār · ' : ''}It is time to pray</b><small>${esc(m.city || '')}${m.city && m.hijri ? ' · ' : ''}${esc(m.hijri || '')}</small></div>`;
    body = `<div class="big"><b>${esc(m.name)}</b><span>${esc(m.hhmm)}</span><span class="ar">${esc(m.ar)}</span></div>
      <div class="when">${m.next ? `Next: ${esc(m.next.name)} at ${esc(m.next.hhmm)}` : ''}${m.ramadan && m.key === 'maghrib' ? ' · Allāhumma laka ṣumtu wa ʿalā rizqika afṭartu' : ''}</div>${MOSQUE}`;
    ft = `<span class="src">The Pomodoro can wait; the prayer cannot.</span><button class="btn" data-snooze>In 5 min</button><button class="btn pri" data-x>OK</button>`;
  } else if (m.type === 'holiday') {
    cls = m.kind === 'eid' ? 'eid' : m.kind === 'ramadan' ? 'ramadan' : '';
    hd = `<span class="ic">☪</span><div><b>${esc(m.title)}</b><small>${esc(m.hijri || '')}</small></div>`;
    body = `<div class="holi"><h2>${esc(m.name)}</h2><p>${esc(m.blurb || '')}</p></div>`;
    ft = `<span class="src"></span><button class="btn pri" data-x>${m.kind === 'eid' ? 'ʿĪd mubārak!' : 'Thank you'}</button>`;
  }
  document.getElementById('root').innerHTML = `<div class="card ${cls}"><div class="hd">${hd}<button class="x" data-x>×</button></div><div class="body">${body}</div><div class="ft">${ft}</div><div class="timer"><i id="tb"></i></div></div>`;
  const send = () => ov.send('pop:size', Math.ceil(document.querySelector('.card').getBoundingClientRect().height + 20));
  send();
  total = left = (m.type === 'prayer' ? 90 : m.type === 'holiday' ? 60 : 35) * 1000; clearInterval(timer);
  timer = setInterval(() => { if (paused) return; left -= 100; document.getElementById('tb').style.transform = `scaleX(${Math.max(0, left / total)})`; if (left <= 0) close(); }, 100);
  if (m.type === 'prayer' && m.sound) chime();
}
document.addEventListener('mouseenter', () => paused = true);
document.addEventListener('mouseleave', () => paused = false);
document.addEventListener('click', e => {
  const mt = e.target.closest('.meta'); if (mt) { mt.classList.toggle('full'); ov.send('pop:size', Math.ceil(document.querySelector('.card').getBoundingClientRect().height + 20)); }
  if (e.target.closest('[data-x]')) close();
  if (e.target.closest('[data-snooze]')) { ov.send('pop:snooze', cur); close(); }
});
document.addEventListener('toggle', () => ov.send('pop:size', Math.ceil(document.querySelector('.card').getBoundingClientRect().height + 20)), true);
ov.on('pop:show', show);

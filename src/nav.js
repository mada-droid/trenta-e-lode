// nav.js — the left menu can be collapsed to icons (and expanded again) and resized by dragging its edge.
// Toggle: the round button on the edge, Ctrl+B, or a double-click on the edge. Saved in localStorage.
// Shared by the Italian and English editions.
(() => {
  const IT = document.documentElement.lang === 'it';
  const T = IT ? { collapse: 'Riduci il menu (Ctrl+B)', expand: 'Espandi il menu (Ctrl+B)', drag: 'Trascina per allargare o restringere · doppio clic per ridurre' }
    : { collapse: 'Collapse the menu (Ctrl+B)', expand: 'Expand the menu (Ctrl+B)', drag: 'Drag to widen or narrow · double-click to collapse' };
  const MIN = 200, MAX = 380, KEY = 'tl-nav';
  const nav = document.getElementById('nav');
  if (!nav) return;
  let st = { w: 236, mini: false };
  try { st = { ...st, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* default */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } };

  const btn = document.createElement('button');
  btn.className = 'nav-toggle'; btn.type = 'button';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
  const grip = document.createElement('div');
  grip.className = 'nav-grip'; grip.title = T.drag;
  nav.append(btn, grip);

  function apply() {
    document.body.classList.toggle('nav-mini', st.mini);
    nav.style.width = st.mini ? '' : Math.max(MIN, Math.min(MAX, st.w)) + 'px';
    btn.title = st.mini ? T.expand : T.collapse;
    titles();
  }
  // Collapsed menu: the labels are hidden, so every item gets its label as a tooltip.
  function titles() {
    nav.querySelectorAll('#menu button').forEach(b => { const l = b.querySelector('.lb'); if (l) b.title = st.mini ? l.textContent : ''; });
    const s = nav.querySelector('.subj-btn b'); const sb = nav.querySelector('.subj-btn'); if (sb && s) sb.title = st.mini ? s.textContent : '';
  }
  function toggle() { st.mini = !st.mini; store(); apply(); if (typeof SFX !== 'undefined') SFX.tick(st.mini ? 0.2 : 0.6); }
  btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('keydown', e => { if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b' && !e.target.closest('input, textarea, select')) { e.preventDefault(); toggle(); } });

  // Drag the right edge: wider/narrower; dragging far to the left collapses, dragging out of a collapsed menu expands it.
  grip.addEventListener('pointerdown', e => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId); document.body.classList.add('nav-dragging');
    const left = nav.getBoundingClientRect().left;
    const move = ev => {
      const w = ev.clientX - left;
      if (w < 140) { if (!st.mini) { st.mini = true; apply(); } return; }
      st.mini = false; st.w = Math.max(MIN, Math.min(MAX, w)); apply();
    };
    const up = () => { grip.removeEventListener('pointermove', move); document.body.classList.remove('nav-dragging'); store(); };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up, { once: true });
    grip.addEventListener('pointercancel', up, { once: true });
  });
  grip.addEventListener('dblclick', toggle);
  new MutationObserver(titles).observe(nav, { childList: true, subtree: true });
  apply();
})();

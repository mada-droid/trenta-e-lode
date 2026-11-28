// datefield.js — every date field shows and accepts dd/mm/yyyy.
// Chromium's native <input type=date> follows the Windows regional format (mm/dd/yyyy on US systems)
// whatever the app language, so each one gets a text field in front of it: type 25/12/2026 (slashes are
// added for you) or pick from the calendar button, which opens the native picker (min/max still grey out
// dates that are not allowed). The native input stays in the form and carries the yyyy-mm-dd value.
(() => {
  const pad = n => String(n).padStart(2, '0');
  const toDmy = v => (v ? v.split('-').reverse().join('/') : '');
  const msg = { min: 'Pick today or a later date.', max: 'This date cannot be in the future.', bad: 'Write the date as dd/mm/yyyy.' };
  const say = t => (typeof toast === 'function' ? toast(t) : null);
  function parse(s) {
    const m = String(s).trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4}|\d{2})$/);
    if (!m) return null;
    const d = +m[1], mo = +m[2], y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  // Returns '' (empty), an ISO date, or an error key.
  function check(txt, inp) {
    const v = txt.value.trim(); if (!v) return { v: '' };
    const iso = parse(v); if (!iso) return { err: 'bad' };
    if (inp.min && iso < inp.min) return { err: 'min' };
    if (inp.max && iso > inp.max) return { err: 'max' };
    return { v: iso };
  }
  function enhance(inp) {
    if (inp.dataset.dmy) return; inp.dataset.dmy = '1';
    const wrap = document.createElement('span'); wrap.className = 'dmy-wrap';
    const txt = document.createElement('input');
    Object.assign(txt, { type: 'text', className: 'dmy', placeholder: 'dd/mm/yyyy', autocomplete: 'off', title: inp.title || '', value: toDmy(inp.value) });
    txt.inputMode = 'numeric'; txt.maxLength = 10;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dmy-btn'; btn.tabIndex = -1; btn.title = 'Calendar';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
    inp.parentNode.insertBefore(wrap, inp); wrap.append(txt, btn, inp);
    inp.classList.add('dmy-native'); inp.tabIndex = -1;
    btn.addEventListener('click', () => { try { inp.showPicker(); } catch { inp.focus(); } });
    inp.addEventListener('change', () => { txt.value = toDmy(inp.value); txt.classList.remove('bad'); });
    txt.addEventListener('input', e => { // 25122026 → 25/12/2026 while typing
      if (e.inputType && e.inputType.startsWith('delete')) return;
      const dg = txt.value.replace(/\D/g, '').slice(0, 8);
      if (/^\d+$/.test(txt.value.replace(/\//g, ''))) txt.value = dg.length > 4 ? `${dg.slice(0, 2)}/${dg.slice(2, 4)}/${dg.slice(4)}` : dg.length > 2 ? `${dg.slice(0, 2)}/${dg.slice(2)}` : dg;
      txt.classList.remove('bad');
    });
    const commit = () => { const r = check(txt, inp); if (r.err) { txt.classList.add('bad'); return r; } if (inp.value !== r.v) { inp.value = r.v; inp.dispatchEvent(new Event('change', { bubbles: true })); } txt.value = toDmy(r.v); return r; };
    txt.addEventListener('blur', () => { const r = commit(); if (r.err) say(msg[r.err]); });
    txt._commit = commit;
  }
  // Before any form handler runs: copy the typed dates into the real fields, or stop with a message.
  document.addEventListener('submit', e => {
    for (const t of e.target.querySelectorAll ? e.target.querySelectorAll('input.dmy') : []) {
      const r = t._commit && t._commit();
      if (r && r.err) { e.preventDefault(); e.stopImmediatePropagation(); say(msg[r.err]); t.focus(); return; }
    }
  }, true);
  const scan = root => root.querySelectorAll && root.querySelectorAll('input[type=date]:not([data-dmy])').forEach(enhance);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches('input[type=date]')) enhance(n); else scan(n); } }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();

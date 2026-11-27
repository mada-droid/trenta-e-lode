/* Prayer times + Hijri calendar helpers, shared by the main process (require) and the pages (window.ISL).
   The data is a table computed offline for the student's city: days[YYYY-MM-DD] = { fajr, sunrise, dhuhr, asr, maghrib, isha, hijri: [d, m, y] }. */
(function (root) {
  'use strict';
  const PRAYERS = [
    { k: 'fajr', name: 'Fajr', ar: 'الفجر' }, { k: 'sunrise', name: 'Sunrise', ar: 'الشروق' }, { k: 'dhuhr', name: 'Dhuhr', ar: 'الظهر' },
    { k: 'asr', name: 'ʿAsr', ar: 'العصر' }, { k: 'maghrib', name: 'Maghrib', ar: 'المغرب' }, { k: 'isha', name: 'ʿIshāʾ', ar: 'العشاء' },
  ];
  const HMONTHS = ['Muḥarram', 'Ṣafar', 'Rabīʿ al-awwal', 'Rabīʿ al-ākhir', 'Jumādā al-ūlā', 'Jumādā al-ākhira', 'Rajab', 'Shaʿbān', 'Ramaḍān', 'Shawwāl', 'Dhū al-qaʿda', 'Dhū al-ḥijja'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const shift = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
  const at = (s, hhmm) => { const [y, m, d] = s.split('-').map(Number); const [h, mi] = hhmm.split(':').map(Number); return new Date(y, m - 1, d, h, mi, 0); };

  // offset > 0: the real (sighted) calendar starts later than the computed one.
  function hijri(data, s, offset = 0) { const r = data && data.days[shift(s, -offset)]; return r ? r.hijri : null; }
  function hijriText(h) { return h ? `${h[0]} ${HMONTHS[h[1] - 1]} ${h[2]} AH` : ''; }

  // Only widely observed days.
  function holiday(h) {
    if (!h) return null;
    const [d, m] = h;
    if (m === 9) return { id: 'ramadan', name: 'Ramaḍān', kind: 'ramadan', day: d, last10: d >= 21 };
    if (m === 10 && d <= 3) return { id: 'fitr', name: 'ʿĪd al-Fiṭr', kind: 'eid', day: d };
    if (m === 12 && d <= 8) return { id: 'dhulhijja', name: 'First ten days of Dhū al-ḥijja', kind: 'sacred', day: d };
    if (m === 12 && d === 9) return { id: 'arafa', name: 'Day of ʿArafa', kind: 'sacred', day: d };
    if (m === 12 && d >= 10 && d <= 13) return { id: 'adha', name: 'ʿĪd al-Aḍḥā', kind: 'eid', day: d - 9 };
    if (m === 1 && d === 1) return { id: 'newyear', name: 'Islamic New Year', kind: 'sacred', day: 1 };
    if (m === 1 && d === 9) return { id: 'tasua', name: 'Tāsūʿāʾ', kind: 'sacred', day: 1 };
    if (m === 1 && d === 10) return { id: 'ashura', name: 'ʿĀshūrāʾ', kind: 'sacred', day: 1 };
    return null;
  }
  const BLURB = {
    ramadan: 'The month of fasting and of the Qur’an. Suḥūr before Fajr, ifṭār at Maghrib.',
    fitr: 'The festival of breaking the fast. ʿĪd mubārak!', adha: 'The festival of the sacrifice. ʿĪd mubārak!',
    dhulhijja: 'The best days of the year: dhikr, fasting (especially on ʿArafa) and good deeds.',
    arafa: 'Fasting on the day of ʿArafa expiates the sins of the past year and the coming year (Muslim).',
    newyear: 'The start of the Hijri year.', tasua: 'Fasted together with ʿĀshūrāʾ.', ashura: 'Fasting on ʿĀshūrāʾ expiates the sins of the past year (Muslim).',
  };
  function today(data, s, offset = 0) { const h = hijri(data, s, offset); return { h, text: hijriText(h), hol: holiday(h) }; }

  // Upcoming periods (grouped consecutive days) from `from` on.
  function upcoming(data, from, offset = 0, limit = 12) {
    if (!data) return [];
    const out = []; let cur = null;
    const end = data.meta.to;
    for (let s = from; s <= end; s = shift(s, 1)) {
      const hol = holiday(hijri(data, s, offset));
      if (hol && cur && cur.id === hol.id) { cur.end = s; continue; }
      if (cur) { out.push(cur); cur = null; if (out.length >= limit) break; }
      if (hol) cur = { id: hol.id, name: hol.name, kind: hol.kind, start: s, end: s, blurb: BLURB[hol.id] };
    }
    if (cur && out.length < limit) out.push(cur);
    return out;
  }

  function times(data, s) { return data && data.days[s]; }
  // Next prayer after `now` (Fajr included; sunrise excluded).
  function next(data, now = new Date()) {
    for (let i = 0; i < 2; i++) {
      const s = shift(iso(now), i), r = times(data, s); if (!r) continue;
      for (const p of PRAYERS) { if (p.k === 'sunrise' || r[p.k] === '--:--') continue; const t = at(s, r[p.k]); if (t > now) return { ...p, at: t, hhmm: r[p.k], date: s }; }
    }
    return null;
  }
  // Current prayer window (the last prayer that started).
  function current(data, now = new Date()) {
    const s = iso(now), r = times(data, s); if (!r) return null;
    let cur = null; for (const p of PRAYERS) { if (p.k === 'sunrise' || r[p.k] === '--:--') continue; if (at(s, r[p.k]) <= now) cur = p; }
    return cur;
  }

  const api = { PRAYERS, HMONTHS, hijri, hijriText, holiday, today, upcoming, times, next, current, at, iso, shift, BLURB };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ISL = api;
})(typeof window !== 'undefined' ? window : globalThis);

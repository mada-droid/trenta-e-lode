/* Inline SVG icons (24×24, stroke) and small illustrations used across the app. */
'use strict';
window.ICONS = {
  done: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9"/>',
  today: '<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20z"/>',
  plan: '<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/>',
  todo: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12.5 3 3 5-6"/>',
  pomodoro: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5"/>',
  topics: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20"/><path d="M8.5 7.5h7M8.5 11h5"/>',
  videos: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  review: '<rect x="8" y="3" width="13" height="16" rx="2.5"/><path d="M4.5 6.5v12A2.5 2.5 0 0 0 7 21h9"/>',
  mocks: '<path d="M6 3h12M6 21h12M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/>',
  mistakes: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4"/>',
  formulas: '<path d="M18 4H6l6 8-6 8h12"/>',
  stats: '<path d="M4 20V11M10 20V4M16 20v-7M21 20H3"/>',
  prayers: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="m17 3 .7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="currentColor"/>',
  materials: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16.5v-6M9.5 13l2.5-2.5 2.5 2.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/><circle cx="12" cy="12" r="7"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  lofi: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  skip: '<path d="m5 4 10 8-10 8zM19 5v14"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
  refresh: '<path d="M20 11A8 8 0 1 0 18 17M20 4v7h-7"/>',
};
window.ic = (n, s = 18) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

// Illustrations: navy-ish line art (currentColor) with accent fills from CSS variables.
window.ILL = {
  timer: `<svg viewBox="0 0 120 100" width="120" height="100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="60" cy="92" rx="38" ry="5" fill="var(--panel3)" stroke="none"/>
    <circle cx="60" cy="54" r="32" fill="var(--terra)" opacity=".9"/><circle cx="60" cy="54" r="32"/>
    <path d="M52 22c2-7 14-7 16 0M60 22v-6M56 16h8" /><path d="M48 21c-6-5-2-11 4-9M72 21c6-5 2-11-4-9" fill="var(--accent)"/>
    <circle cx="60" cy="54" r="22" fill="var(--panel)"/><path d="M60 40v14l9 7"/><circle cx="60" cy="54" r="2" fill="currentColor"/>
    <path d="M86 26l6-6M92 30h7M90 38l6 3" stroke="var(--accent2)"/></svg>`,
  cards: `<svg viewBox="0 0 120 100" width="120" height="100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="60" cy="92" rx="40" ry="5" fill="var(--panel3)" stroke="none"/>
    <rect x="22" y="22" width="48" height="62" rx="8" transform="rotate(-12 46 53)" fill="var(--accent2)"/>
    <rect x="46" y="16" width="50" height="66" rx="8" transform="rotate(8 71 49)" fill="var(--panel)"/>
    <path d="M58 34l26 3.5M57 44l18 2.5M56 54l22 3" transform="rotate(8 71 49)"/>
    <path d="M77 63l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.8 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="var(--accent)" transform="rotate(8 71 49)"/>
    <path d="M14 30l-6-3M16 20l-3-6M102 22l6-4" stroke="var(--accent)"/></svg>`,
  lofi: `<svg viewBox="0 0 120 100" width="120" height="100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="60" cy="92" rx="38" ry="5" fill="var(--panel3)" stroke="none"/>
    <path d="M28 64V54a32 32 0 0 1 64 0v10"/>
    <rect x="20" y="58" width="18" height="28" rx="7" fill="var(--accent)"/><rect x="82" y="58" width="18" height="28" rx="7" fill="var(--accent)"/>
    <path d="M52 30V14l16-3v16" stroke="var(--accent2)"/><circle cx="48" cy="31" r="4.5" fill="var(--accent2)" stroke="var(--accent2)"/><circle cx="64" cy="28" r="4.5" fill="var(--accent2)" stroke="var(--accent2)"/>
    <path d="M50 70h20M54 76h12" stroke="var(--terra)"/></svg>`,
  desk: `<svg viewBox="0 0 260 190" width="260" height="190" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 150h220M44 150v34M216 150v34" />
    <rect x="70" y="92" width="88" height="56" rx="6" fill="rgba(255,255,255,.18)"/><path d="M58 150l12-2h88l12 2"/>
    <text x="114" y="128" text-anchor="middle" font-family="Cambria Math, serif" font-size="24" fill="#fff" stroke="none">∫ Σ lim</text>
    <path d="M196 150v-58M196 92l-22-12h32z" fill="rgba(255,255,255,.25)"/><path d="M178 84l-12 22" stroke="rgba(255,236,180,.8)" stroke-width="10" opacity=".35"/>
    <rect x="28" y="128" width="34" height="9" rx="2" fill="rgba(255,255,255,.25)"/><rect x="24" y="137" width="40" height="13" rx="2" fill="rgba(255,255,255,.12)"/>
    <path d="M220 150c-2-14 2-26 10-32M226 150c4-12 12-18 20-18M222 136c-10-6-18-4-22 2" stroke="#cfe8d8"/>
    <path d="M178 136h16v14h-16zM194 140c6 0 6 7 0 7" /><path d="M182 130c2-4-2-6 0-10M188 130c2-4-2-6 0-10" stroke="rgba(255,255,255,.6)"/>
    <circle cx="44" cy="40" r="13" fill="rgba(255,255,255,.15)"/><path d="M50 32a11 11 0 1 0 0 16 9 9 0 0 1 0-16z" fill="#fff3d6" stroke="none"/>
    <circle cx="86" cy="30" r="1.6" fill="#fff"/><circle cx="120" cy="18" r="1.3" fill="#fff"/><circle cx="150" cy="40" r="1.6" fill="#fff"/><circle cx="104" cy="52" r="1.1" fill="#fff"/></svg>`,
  books: `<svg viewBox="0 0 160 120" width="160" height="120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="80" cy="108" rx="60" ry="6" fill="var(--panel3)" stroke="none"/>
    <rect x="30" y="80" width="100" height="22" rx="4" fill="var(--accent)"/><rect x="38" y="58" width="86" height="22" rx="4" fill="var(--accent2)"/>
    <rect x="34" y="36" width="92" height="22" rx="4" fill="var(--terra)"/><path d="M44 47h40M48 69h36M42 91h50" stroke="var(--panel)"/>
    <path d="M118 30c8-14 22-14 26-6M140 18l4-8M150 26l8-2" stroke="var(--accent)"/></svg>`,
  mosque: `<svg viewBox="0 0 220 130" width="220" height="130" fill="currentColor"><path d="M24 130V64h7v-9l3.5-11 3.5 11v9h7v66zM176 130V64h7v-9l3.5-11 3.5 11v9h7v66zM58 130V88c0-28 52-46 52-46s52 18 52 46v42z"/><circle cx="110" cy="34" r="5"/><path d="M107 22a6 6 0 1 0 6 0 5 5 0 0 1-6 0z"/></svg>`,
};

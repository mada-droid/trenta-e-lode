// Trenta e Lode: Electron main process.
// - App state as JSON in userData.
// - A data folder (default: Documents\Trenta e Lode) holds everything the student owns or downloads:
//     Subjects\<subject>\<topic>\…   files uploaded from the Materials page (+ subject.json written by an AI)
//     Requests\                     requests prepared for Claude / ChatGPT / Gemini
//     Offline\                      prayer table, adhkar and Qur'an passages downloaded once
//     Media\                        full-screen focus backgrounds (120 s loops)
// - Prayer times are computed offline for any city (adhan library), Hijri dates with the Umm al-Qura calendar.
// - Scheduler: prayer popups (never Fajr), an adhkar / Qur'an popup every N minutes, holiday greetings.
// - Minimise → the window hides and a "dynamic notch" appears at the top of the screen.
const { app, BrowserWindow, ipcMain, shell, Notification, session, screen, dialog, clipboard, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const adhan = require('adhan');
const ISL = require('./src/islamic.js');
const PKG = require('./package.json');

app.setAppUserModelId('io.github.trentaelode');
// Own settings folder (does not clash with other apps named "Trenta e Lode"); TL_USERDATA isolates test runs.
app.setPath('userData', process.env.TL_USERDATA || path.join(app.getPath('appData'), 'trenta-e-lode'));
const STATE = () => path.join(app.getPath('userData'), 'state.json');
const POPSTATE = () => path.join(app.getPath('userData'), 'popup-state.json');
const DEFAULT_HUB = () => process.env.TL_HUB || path.join(app.getPath('documents'), 'Trenta e Lode');
// Where the background videos are published (GitHub release assets of this repository).
const REPO = (PKG.repository && PKG.repository.url || '').replace(/^git\+/, '').replace(/\.git$/, '');
const MEDIA_BASE = REPO + '/releases/download/backgrounds-v1/';
let win, notch = null, pop = null;
let hub = null;
let prefs = {
  theme: 'dark', notch: true, islamic: true, prayerPopups: true, prayers: { dhuhr: true, asr: true, maghrib: true, isha: true }, prayerSound: true,
  adhkar: true, adhkarEvery: 10, verses: true, dndSim: true, hijriOffset: 0, holidayPopups: true, location: null, autostart: false,
};
let status = {};
const OV_PRELOAD = path.join(__dirname, 'preload-overlay.js');
const ICON = path.join(__dirname, 'build', 'icon.png');

// ─── Window: size, frameless rounded window (Windows), start at login ────
// On Windows the window has no title bar: the page draws rounded corners and its own min/max/close buttons.
// macOS and Linux keep the native frame.
const FRAMELESS = process.platform === 'win32' && !process.env.TL_SHOT;
// Big screens (3440×1440 ultrawide and up) get a 1730×1100 window, others 1440×900; never larger than the screen.
function sizeFor(d) {
  const sf = d.scaleFactor || 1, wa = d.workArea;
  const wide = Math.round(d.size.width * sf) >= 3440 && Math.round(d.size.height * sf) >= 1440;
  const w = Math.min(wide ? Math.round(1730 / sf) : 1440, wa.width);
  const h = Math.min(wide ? Math.round(1100 / sf) : 900, wa.height);
  return { width: w, height: h, x: Math.round(wa.x + (wa.width - w) / 2), y: Math.round(wa.y + (wa.height - h) / 2) };
}
let maxed = null; // bounds before our own maximise (transparent windows can't use the native one)
const winState = () => win && !win.isDestroyed() && win.webContents.send('win:state', { frameless: FRAMELESS, max: FRAMELESS ? !!maxed || win.isFullScreen() : win.isMaximized() || win.isFullScreen() });
function toggleMax() {
  if (!win) return;
  if (!FRAMELESS) win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (maxed) { win.setBounds(maxed); maxed = null; }
  else { maxed = win.getBounds(); win.setBounds(screen.getDisplayMatching(maxed).workArea); }
  winState();
}
// Electron/Chromium bug with transparent windows on Windows: after the window is hidden (minimise → notch) and
// shown again, Chromium leaves its input child window ("Chrome Legacy Window") hidden, so the page gets no mouse
// events at all (only the drag areas still work). Resizing by 1 px and back makes Chromium show it again.
let reviveT = null, reviving = false;
function revive() {
  if (!FRAMELESS || reviving || !win || win.isDestroyed() || !win.isVisible() || win.isMinimized() || win.isFullScreen()) return;
  reviving = true;
  const b = win.getBounds();
  win.setBounds({ ...b, width: b.width + 1 });
  setTimeout(() => { if (win && !win.isDestroyed()) win.setBounds(b); reviving = false; }, 60);
}
// 'show' and 'restore' fire together when the window comes back: one nudge for both.
const reviveSoon = () => { clearTimeout(reviveT); reviveT = setTimeout(revive, 120); };
function refit() { // a monitor was plugged in or unplugged: resize for the screen the window is now on
  const free = () => win && !maxed && !win.isMaximized() && !win.isFullScreen() && !saved;
  if (free()) setTimeout(() => { if (free()) win.setBounds(sizeFor(screen.getDisplayMatching(win.getBounds()))); }, 900);
}
ipcMain.on('win', (_e, c) => { if (!win) return; if (c === 'min') win.minimize(); else if (c === 'max') toggleMax(); else if (c === 'close') win.close(); });
const CAN_AUTOSTART = process.platform === 'win32' || process.platform === 'darwin';
function setAutostart(on) {
  if (!CAN_AUTOSTART || process.env.TL_SHOT) return;
  const o = { openAtLogin: !!on };
  if (!app.isPackaged && process.platform === 'win32') Object.assign(o, { path: process.execPath, args: [app.getAppPath()] });
  if (app.getLoginItemSettings(o).openAtLogin !== o.openAtLogin) app.setLoginItemSettings(o);
}

// Problems are written to log.txt in the settings folder (kept under ~200 KB).
function logLine(...a) {
  try {
    const f = path.join(app.getPath('userData'), 'log.txt');
    if (fs.existsSync(f) && fs.statSync(f).size > 200e3) fs.renameSync(f, f + '.old');
    fs.appendFileSync(f, new Date().toISOString() + ' ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n');
  } catch { /* ignore */ }
}
process.on('uncaughtException', e => logLine('main uncaughtException', e.stack || String(e)));
app.on('child-process-gone', (_e, d) => logLine('child process gone', d));

function createWindow() {
  win = new BrowserWindow({
    ...sizeFor(screen.getDisplayNearestPoint(screen.getCursorScreenPoint())), minWidth: 380, minHeight: 300,
    ...(FRAMELESS ? { frame: false, transparent: true, backgroundColor: '#00000000' } : { backgroundColor: '#171614' }),
    title: 'Trenta e Lode', icon: ICON, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.on('did-finish-load', winState);
  // A crashed page reloads by itself instead of leaving a dead window.
  win.webContents.on('render-process-gone', (_e, d) => { logLine('page process gone', d); if (d.reason !== 'clean-exit') setTimeout(() => win && !win.isDestroyed() && win.reload(), 1000); });
  win.on('unresponsive', () => logLine('window unresponsive'));
  win.on('responsive', () => logLine('window responsive again'));
  for (const ev of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) win.on(ev, winState);
  win.on('minimize', () => { if (prefs.notch && !process.env.TL_SHOT) { win.hide(); showNotch(); } });
  win.on('show', () => { hideNotch(); reviveSoon(); });
  win.on('restore', () => { hideNotch(); reviveSoon(); });
  win.on('leave-full-screen', () => win.webContents.send('cmd', 'zen-exit'));
  win.on('closed', () => { win = null; [notch, pop].forEach(w => w && !w.isDestroyed() && w.destroy()); });
  // Links clicked inside the app open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  // YouTube embeds refuse to play without a referrer; file:// pages send none.
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] }, (d, cb) => {
    d.requestHeaders['Referer'] = 'https://trentaelode.local/';
    cb({ requestHeaders: d.requestHeaders });
  });
  createWindow();
  screen.on('display-added', refit);
  screen.on('display-removed', refit);
  if (!process.env.TL_SHOT) { setInterval(schedTick, 15000); setTimeout(schedTick, 8000); }
});
app.on('window-all-closed', () => app.quit());

const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function writeJson(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 1)); fs.renameSync(t, f); }
const safe = s => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Misc';
async function getText(url, opts = {}) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), opts.timeout || 15000);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TrentaELode/' + PKG.version, ...(opts.headers || {}) }, signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return await r.text(); }
  finally { clearTimeout(to); }
}
const getJson = async (url, opts) => JSON.parse(await getText(url, opts));

// ─── Data folder ─────────────────────────────────────────────────────────
const SUBJECTS_DIR = () => path.join(hub, 'Subjects');
function setHub(h) {
  hub = h || DEFAULT_HUB();
  for (const d of ['Subjects', 'Requests', 'Offline', 'Media']) fs.mkdirSync(path.join(hub, d), { recursive: true });
  const guide = path.join(hub, 'CLAUDE.md');
  try { fs.writeFileSync(guide, fs.readFileSync(path.join(__dirname, 'src', 'data', 'AI-GUIDE.md'), 'utf8')); } catch { /* read-only copy is fine */ }
  loadOffline();
}
ipcMain.handle('hub:init', (_e, h) => { setHub(h && fs.existsSync(path.dirname(h)) ? h : null); return { hub, hubUrl: pathToFileURL(hub).href, def: DEFAULT_HUB() }; });
ipcMain.handle('hub:pick', async () => { const r = await dialog.showOpenDialog(win, { title: 'Choose the data folder', properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });

// ─── Lofi radio: find the stream that is live *now* ───────────────────────
// Live radios get restarted with new video IDs, so the app stores only a name + channel and searches
// YouTube's "Live" results for it. The result is cached; the renderer reports dead IDs ("bad") and asks again.
const LOFI_CACHE = () => path.join(app.getPath('userData'), 'lofi-cache.json');
const YT_HEAD = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'SOCS=CAI' };
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
async function ytLiveSearch(q) {
  const t = await getText('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgJAAQ%253D%253D', { headers: YT_HEAD, timeout: 9000 });
  const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const out = [];
  const walk = o => { if (!o || typeof o !== 'object') return; if (o.videoRenderer) { const v = o.videoRenderer; out.push({ id: v.videoId, title: (v.title?.runs || []).map(x => x.text).join(''), ch: v.ownerText?.runs?.[0]?.text || '', live: /LIVE/.test(JSON.stringify(v.badges || []) + JSON.stringify(v.thumbnailOverlays || [])) }); } for (const k in o) walk(o[k]); };
  walk(JSON.parse(m[1]));
  return out.filter(v => v.id && v.live);
}
ipcMain.handle('lofi:resolve', async (_e, src, opts = {}) => {
  const cache = readJson(LOFI_CACHE()) || {};
  const c = cache[src.key], bad = new Set([...(c?.bad || []), ...(opts.bad ? [opts.bad] : [])]);
  if (!opts.force && c?.id && !bad.has(c.id) && Date.now() - c.at < 6 * 3600e3) return { ...c, cached: true };
  try {
    const list = (await ytLiveSearch(src.q)).filter(v => !bad.has(v.id));
    const words = (src.words || []).map(norm), want = norm(src.q).split(' ');
    const score = v => { const t = norm(v.title); return (norm(v.ch) === norm(src.ch) ? 10 : 0) + words.filter(w => t.includes(w)).length * 4 + want.filter(w => t.includes(w)).length; };
    const okWords = v => words.every(w => norm(v.title).includes(w));
    const best = list.filter(okWords).sort((a, b) => score(b) - score(a))[0] || list.sort((a, b) => score(b) - score(a))[0];
    if (!best) throw new Error('no live stream found');
    cache[src.key] = { id: best.id, title: best.title, ch: best.ch, at: Date.now(), bad: [...bad].slice(-20) };
  } catch (err) {
    const id = c?.id && !bad.has(c.id) ? c.id : (!bad.has(src.fallback) ? src.fallback : null);
    if (!id) return { error: String(err.message || err) };
    return { id, title: c?.title || '', ch: c?.ch || src.ch, at: 0, offline: true };
  }
  writeJson(LOFI_CACHE(), cache);
  return cache[src.key];
});
// Checks YouTube IDs suggested by an AI (oEmbed answers 200 only for real, embeddable videos).
ipcMain.handle('yt:check', async (_e, ids) => {
  const ok = {};
  for (const id of [...new Set(ids)].slice(0, 200)) {
    try { const j = await getJson('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { timeout: 8000 }); ok[id] = { title: j.title, ch: j.author_name }; } catch { /* invalid or private */ }
  }
  return ok;
});

// ─── State ───────────────────────────────────────────────────────────────
ipcMain.handle('state:load', () => readJson(STATE()));
ipcMain.handle('state:save', (_e, s) => { writeJson(STATE(), s); return true; });
ipcMain.handle('state:backup', (_e, s) => {
  const f = path.join(hub || DEFAULT_HUB(), 'Backups', 'backup-' + new Date().toISOString().slice(0, 10) + '.json');
  writeJson(f, s); shell.showItemInFolder(f); return f;
});

const pdfWins = new Map();
ipcMain.handle('pdf:open', (_e, root, rel, page) => {
  const file = path.resolve(root || SUBJECTS_DIR(), rel);
  if (!file.startsWith(path.resolve(hub))) return 'missing';
  if (!fs.existsSync(file)) return 'missing';
  if (!/\.pdf$/i.test(file)) { shell.openPath(file); return 'ok'; }
  const url = pathToFileURL(file).href + (page ? '#page=' + page : '');
  let w = pdfWins.get(file);
  if (w && !w.isDestroyed()) { w.loadURL(url); w.focus(); return 'ok'; }
  w = new BrowserWindow({ width: 980, height: 1000, title: path.basename(rel), autoHideMenuBar: true, icon: ICON, webPreferences: { plugins: true } });
  pdfWins.set(file, w);
  w.loadURL(url);
  return 'ok';
});
ipcMain.handle('notify', (_e, title, body) => {
  if (Notification.isSupported()) new Notification({ title, body, silent: true, icon: ICON }).show();
  if (win && !win.isFocused()) win.flashFrame(true);
});
let saved = null;
ipcMain.handle('compact', (_e, on) => {
  if (on) {
    saved = win.getBounds();
    win.setAlwaysOnTop(true, 'floating'); win.setMinimumSize(260, 150);
    win.setBounds({ width: 300, height: 190, x: saved.x + saved.width - 320, y: saved.y + 20 });
  } else { win.setAlwaysOnTop(false); win.setMinimumSize(380, 300); if (saved) win.setBounds(saved); }
});
ipcMain.handle('fullscreen', (_e, on) => { win.setFullScreen(!!on); return win.isFullScreen(); });
const OPENABLE = [/^https:\/\/www\.youtube\.com\/watch\?v=/, /^https:\/\/(chatgpt\.com|gemini\.google\.com|claude\.ai)\//, /^https:\/\/(www\.)?duasrevival\.com\//, /^https:\/\/quran\.com\//, /^https:\/\/github\.com\//];
ipcMain.handle('url:open', (_e, url) => { if (OPENABLE.some(r => r.test(url))) shell.openExternal(url); });

// ─── Prayer times for any place (computed offline) ───────────────────────
// The table has the same shape everywhere: days[YYYY-MM-DD] = { fajr, sunrise, dhuhr, asr, maghrib, isha, hijri: [d, m, y] }.
const PRAYER_FILE = () => path.join(hub, 'Offline', 'prayer-times.json');
const METHODS = { MuslimWorldLeague: 'Muslim World League', Egyptian: 'Egyptian General Authority', Karachi: 'University of Islamic Sciences, Karachi', UmmAlQura: 'Umm al-Qura (Makkah)',
  Dubai: 'Dubai', MoonsightingCommittee: 'Moonsighting Committee', NorthAmerica: 'ISNA (North America)', Kuwait: 'Kuwait', Qatar: 'Qatar', Singapore: 'Singapore / Malaysia / Indonesia', Tehran: 'Tehran', Turkey: 'Diyanet (Turkey)' };
const METHOD_BY_COUNTRY = { SA: 'UmmAlQura', YE: 'UmmAlQura', US: 'NorthAmerica', CA: 'NorthAmerica', EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', DZ: 'Egyptian', MA: 'Egyptian', TN: 'Egyptian', SY: 'Egyptian', LB: 'Egyptian', IQ: 'Egyptian', JO: 'Egyptian', PS: 'Egyptian',
  PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', AE: 'Dubai', OM: 'Dubai', BH: 'Dubai', KW: 'Kuwait', QA: 'Qatar', SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore', TR: 'Turkey', IR: 'Tehran', GB: 'MoonsightingCommittee' };
const HANAFI_COUNTRIES = new Set(['PK', 'IN', 'BD', 'AF', 'TR']);
ipcMain.handle('geo:search', async (_e, q) => {
  const j = await getJson('https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name=' + encodeURIComponent(q));
  return (j.results || []).map(r => ({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude, tz: r.timezone, cc: r.country_code,
    method: METHOD_BY_COUNTRY[r.country_code] || 'MuslimWorldLeague', madhab: HANAFI_COUNTRIES.has(r.country_code) ? 'Hanafi' : 'Shafi' }));
});
ipcMain.handle('app:info', () => ({ methods: METHODS, repo: REPO, version: PKG.version, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, canAutostart: CAN_AUTOSTART }));
function buildPrayerTable(loc) {
  const coords = new adhan.Coordinates(+loc.lat, +loc.lon);
  const params = adhan.CalculationMethod[loc.method in METHODS ? loc.method : 'MuslimWorldLeague']();
  params.madhab = loc.madhab === 'Hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  if (Math.abs(+loc.lat) > 48) params.highLatitudeRule = adhan.HighLatitudeRule.recommended(coords);
  const tz = loc.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const hj = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
  const fmt = d => (d && !isNaN(d) ? hm.format(d).replace(/^24/, '00') : '--:--');
  const days = {};
  const start = new Date(); start.setDate(start.getDate() - 60);
  const n = 365 * 3 + 120;
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const pt = new adhan.PrayerTimes(coords, d, params);
    const parts = Object.fromEntries(hj.formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))).map(p => [p.type, p.value]));
    days[isoDay(d)] = { fajr: fmt(pt.fajr), sunrise: fmt(pt.sunrise), dhuhr: fmt(pt.dhuhr), asr: fmt(pt.asr), maghrib: fmt(pt.maghrib), isha: fmt(pt.isha), hijri: [+parts.day, +parts.month, parseInt(parts.year, 10)] };
  }
  const keys = Object.keys(days);
  return { meta: { city: loc.name, region: loc.region || '', lat: +loc.lat, lon: +loc.lon, tz, method: METHODS[loc.method] || METHODS.MuslimWorldLeague, methodKey: loc.method, madhab: loc.madhab || 'Shafi',
    source: 'Computed offline with the adhan library; Hijri dates: Umm al-Qura calendar', generated: isoDay(new Date()), from: keys[0], to: keys[keys.length - 1] }, days };
}
function ensurePrayerTable(force) {
  const loc = prefs.location;
  if (!loc || !hub) { OFF.prayer = null; return; }
  const cur = readJson(PRAYER_FILE());
  const same = cur && cur.meta && cur.meta.lat === +loc.lat && cur.meta.lon === +loc.lon && cur.meta.methodKey === loc.method && cur.meta.madhab === (loc.madhab || 'Shafi');
  const fresh = cur && cur.meta && cur.meta.to > isoDay(new Date(Date.now() + 300 * 864e5)) && cur.meta.from <= isoDay(new Date(Date.now() - 7 * 864e5));
  if (!force && same && fresh) { OFF.prayer = cur; return; }
  OFF.prayer = buildPrayerTable(loc);
  writeJson(PRAYER_FILE(), OFF.prayer);
}
ipcMain.handle('prayer:set', (_e, loc) => { prefs.location = loc; ensurePrayerTable(true); return OFF.prayer && OFF.prayer.meta; });

// ─── Offline content: adhkar (duasrevival.com) and short Qur'an passages (quran.com) ─────
// Downloaded once into the data folder on the student's own computer (nothing third-party is bundled in the app).
const OFF = { prayer: null, adhkar: [], verses: [] };
function loadOffline() {
  const o = path.join(hub, 'Offline');
  OFF.adhkar = (readJson(path.join(o, 'adhkar.json')) || {}).adhkar || [];
  OFF.verses = (readJson(path.join(o, 'quran-passages.json')) || {}).verses || [];
  ensurePrayerTable(false);
}
ipcMain.handle('offline:load', () => ({ hub, hubUrl: pathToFileURL(hub).href, prayer: OFF.prayer, adhkar: OFF.adhkar, verses: OFF.verses }));
const stripTags = s => String(s || '').replace(/<sup[^>]*>.*?<\/sup>/gs, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
let dlBusy = false;
ipcMain.handle('content:download', async (e, what = ['adhkar', 'verses']) => {
  if (dlBusy) return { error: 'A download is already running.' };
  dlBusy = true;
  const send = (step, i, n) => { try { e.sender.send('content:progress', { step, i, n }); } catch { /* window closed */ } };
  const res = {};
  try {
    if (what.includes('verses')) res.verses = await downloadVerses(send);
    if (what.includes('adhkar')) res.adhkar = await downloadAdhkar(send);
  } catch (err) { res.error = String(err.message || err); }
  dlBusy = false; loadOffline();
  return res;
});
async function downloadVerses(send) {
  const refs = readJson(path.join(__dirname, 'src', 'data', 'verse-refs.json')) || [];
  const ch = (await getJson('https://api.quran.com/api/v4/chapters?language=en')).chapters;
  const out = [];
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i]; send('Qur’an passages', i + 1, refs.length);
    const ar = [], en = [];
    for (let a = r.a; a <= r.b; a++) {
      const j = await getJson(`https://api.quran.com/api/v4/verses/by_key/${r.s}:${a}?fields=text_uthmani&translations=20`);
      ar.push(j.verse.text_uthmani); en.push(stripTags(j.verse.translations?.[0]?.text));
    }
    const c = ch.find(x => x.id === r.s) || {};
    out.push({ ref: `${r.s}:${r.a}${r.b !== r.a ? '-' + r.b : ''}`, s: r.s, a: r.a, b: r.b, tag: r.tag, surah: { ar: c.name_arabic || '', tr: c.name_simple || '', en: c.translated_name?.name || '' }, ar, en });
  }
  writeJson(path.join(hub, 'Offline', 'quran-passages.json'), { meta: { arabic: 'Uthmani script, api.quran.com', translation: 'Saheeh International (api.quran.com, translation 20)', generated: isoDay(new Date()) }, verses: out });
  return out.length;
}
async function downloadAdhkar(send) {
  const base = 'https://www.duasrevival.com';
  const dir = path.join(hub, 'Offline', 'adhkar'); fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const [when, list] of [['morning', '/morning-azkar'], ['evening', '/evening-azkar']]) {
    const html = await getText(base + list);
    const links = [...new Set([...html.matchAll(new RegExp(`href="(${list}/[a-z0-9-]+)"`, 'g'))].map(m => m[1]))];
    for (let i = 0; i < links.length; i++) {
      send(when === 'morning' ? 'Morning adhkar' : 'Evening adhkar', i + 1, links.length);
      try {
        const p = await getText(base + links[i]);
        const title = stripTags((p.match(/<h1>(.*?)<\/h1>/s) || [])[1]);
        const img = (p.match(/id="post-img"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*id="post-img"/) || []).slice(1).find(Boolean);
        const field = k => stripTags((p.match(new RegExp(`<b>\\s*${k}:?\\s*</b>(.*?)</p>`, 's')) || [])[1]);
        let file = null;
        if (img) {
          file = 'adhkar/' + path.basename(img).replace(/[^\w.-]/g, '_');
          const r = await fetch(new URL(img, base)); if (r.ok) fs.writeFileSync(path.join(hub, 'Offline', file), Buffer.from(await r.arrayBuffer())); else file = null;
        }
        if (title && file) out.push({ id: links[i].replace(/^\//, '').replace('/', '_'), when, title, img: file, translit: field('Pronunciation'), meaning: field('Meaning'), virtue: field('Virtue'), ref: field('Reference'), url: base + links[i] });
      } catch { /* skip one page */ }
    }
  }
  if (!out.length) throw new Error('Could not read duasrevival.com right now.');
  writeJson(path.join(hub, 'Offline', 'adhkar.json'), { meta: { source: 'https://www.duasrevival.com (Morning and Evening Azkar)', generated: isoDay(new Date()) }, adhkar: out });
  return out.length;
}

// ─── Focus backgrounds (120 s loops published as release assets) ─────────
ipcMain.handle('bg:status', (_e, files) => Object.fromEntries(files.map(f => [f, fs.existsSync(path.join(hub, 'Media', f))])));
const bgJobs = new Map();
ipcMain.handle('bg:download', async (e, file) => {
  if (bgJobs.has(file)) return bgJobs.get(file);
  const job = (async () => {
    const dest = path.join(hub, 'Media', file), tmp = dest + '.part';
    const r = await fetch(MEDIA_BASE + file);
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    const total = +r.headers.get('content-length') || 0; let got = 0, last = 0;
    const out = fs.createWriteStream(tmp);
    for await (const chunk of r.body) {
      out.write(chunk); got += chunk.length;
      if (Date.now() - last > 300) { last = Date.now(); try { e.sender.send('bg:progress', { file, got, total }); } catch { /* closed */ } }
    }
    await new Promise(res => out.end(res));
    fs.renameSync(tmp, dest);
    try { e.sender.send('bg:progress', { file, got: total, total, done: true }); } catch { /* closed */ }
    return { ok: true };
  })().catch(err => ({ error: String(err.message || err) })).finally(() => bgJobs.delete(file));
  bgJobs.set(file, job);
  return job;
});

ipcMain.on('prefs', (_e, p) => {
  const locChanged = p.location && JSON.stringify(p.location) !== JSON.stringify(prefs.location);
  prefs = { ...prefs, ...p };
  if ('autostart' in p) setAutostart(p.autostart);
  if (p.hub && p.hub !== hub) setHub(p.hub);
  else if (locChanged && hub) ensurePrayerTable(false);
});
ipcMain.on('status', (_e, s) => { status = s; if (notch && !notch.isDestroyed() && notch.isVisible()) notch.webContents.send('status', s); });

// ─── Subjects & uploaded material ────────────────────────────────────────
ipcMain.handle('subjects:read', (_e, folders) => {
  const out = {};
  for (const f of folders) {
    const dir = path.join(SUBJECTS_DIR(), safe(f));
    try { fs.mkdirSync(dir, { recursive: true }); } catch { out[f] = { dir, data: null, files: {} }; continue; }
    const data = readJson(path.join(dir, 'subject.json'));
    const files = {};
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith('.') || d.name.startsWith('_')) continue;
      files[d.name] = fs.readdirSync(path.join(dir, d.name), { withFileTypes: true }).filter(x => x.isFile() && !x.name.startsWith('.') && !x.name.endsWith('.part'))
        .map(x => { const st = fs.statSync(path.join(dir, d.name, x.name)); return { name: x.name, size: st.size, mtime: st.mtimeMs }; });
    }
    out[f] = { dir, data, files };
  }
  return out;
});
ipcMain.handle('subject:folder', (_e, name) => { const f = safe(name); fs.mkdirSync(path.join(SUBJECTS_DIR(), f), { recursive: true }); return f; });
ipcMain.handle('subject:rename', (_e, from, to) => {
  const a = path.join(SUBJECTS_DIR(), safe(from)), b = path.join(SUBJECTS_DIR(), safe(to));
  if (a === b) return safe(to);
  if (fs.existsSync(b)) return null;
  if (fs.existsSync(a)) fs.renameSync(a, b); else fs.mkdirSync(b, { recursive: true });
  return safe(to);
});
ipcMain.handle('subject:remove', async (_e, folder) => {
  const dir = path.join(SUBJECTS_DIR(), safe(folder));
  if (!fs.existsSync(dir)) return true;
  try { await shell.trashItem(dir); } catch { return false; } // to the Recycle Bin, never deleted for good
  return true;
});
// Merge what an AI produced into subject.json. Nothing the student already has is deleted.
ipcMain.handle('subject:merge', (_e, folder, add) => {
  const f = path.join(SUBJECTS_DIR(), safe(folder), 'subject.json');
  const cur = readJson(f) || {};
  const byId = (a = [], b = [], key = 'id') => { const m = new Map(a.map(x => [x[key], x])); for (const x of b) if (x && x[key] != null) m.set(x[key], { ...(m.get(x[key]) || {}), ...x }); return [...m.values()]; };
  const out = { ...cur };
  out.topics = byId(cur.topics, add.topics);
  out.videos = byId(cur.videos, add.videos);
  out.exams = byId(cur.exams, add.exams);
  out.phases = byId(cur.phases, add.phases);
  out.sims = byId(cur.sims, add.sims);
  out.resources = { ...(cur.resources || {}), ...(add.resources || {}) };
  const seen = new Set((cur.cards || []).map(c => c[1]));
  out.cards = [...(cur.cards || []), ...(add.cards || []).filter(c => Array.isArray(c) && c.length >= 3 && !seen.has(c[1]))];
  out.plan = { ...(cur.plan || {}) };
  for (const [d, v] of Object.entries(add.plan || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !v) continue;
    const old = out.plan[d] || { tasks: [] }, titles = new Set(old.tasks.map(t => t[3]));
    out.plan[d] = { note: old.note || v.note, tasks: [...old.tasks, ...(v.tasks || []).filter(t => Array.isArray(t) && !titles.has(t[3]))] };
  }
  out.processed = [...new Set([...(cur.processed || []), ...(add.processed || [])])];
  writeJson(f, out);
  return { topics: (add.topics || []).length, videos: (add.videos || []).length, cards: (add.cards || []).length, days: Object.keys(add.plan || {}).length };
});
ipcMain.handle('files:pick', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Choose files to add', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Study material', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'pptx', 'xlsx', 'txt', 'md', 'zip', 'mp4'] }, { name: 'All files', extensions: ['*'] }] });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('files:import', (_e, folder, topic, paths) => {
  const dir = path.join(SUBJECTS_DIR(), safe(folder), safe(topic));
  fs.mkdirSync(dir, { recursive: true });
  const done = [];
  for (const p of paths) {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
    const ext = path.extname(p), base = path.basename(p, ext);
    let name = base + ext, i = 2;
    while (fs.existsSync(path.join(dir, name))) name = `${base} (${i++})${ext}`;
    fs.copyFileSync(p, path.join(dir, name));
    done.push(name);
  }
  return { dir, files: done, topic: safe(topic) };
});
const inSubjects = rel => { const f = path.resolve(SUBJECTS_DIR(), rel); return f.startsWith(path.resolve(SUBJECTS_DIR())) ? f : null; };
ipcMain.handle('files:open', (_e, rel) => { const f = inSubjects(rel); if (f) shell.openPath(f); });
ipcMain.handle('files:reveal', (_e, rel) => { const f = inSubjects(rel); if (f) shell.showItemInFolder(f); });
ipcMain.handle('folder:open', (_e, which) => { const f = path.resolve(hub, which || ''); if (!f.startsWith(path.resolve(hub))) return; fs.mkdirSync(f, { recursive: true }); shell.openPath(f); });

// ─── Requests for an AI assistant ────────────────────────────────────────
// Claude Code works directly in the data folder (it reads CLAUDE.md and the files, and edits subject.json).
// ChatGPT, Gemini and claude.ai get a self-contained prompt: the student attaches the files and pastes the JSON answer back.
function hasClaudeCode() { return new Promise(res => execFile(process.platform === 'win32' ? 'where' : 'which', ['claude'], err => res(!err))); }
ipcMain.handle('ai:hasClaude', () => hasClaudeCode());
ipcMain.handle('ai:request', async (_e, r) => {
  const dir = path.join(hub, 'Requests'); fs.mkdirSync(dir, { recursive: true });
  const n = new Date(), stamp = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}`;
  const name = `${stamp}_${safe(r.subject).replace(/\s/g, '-')}`;
  const subjDir = path.join(SUBJECTS_DIR(), safe(r.folder));
  const guide = fs.readFileSync(path.join(__dirname, 'src', 'data', 'AI-GUIDE.md'), 'utf8');
  const schema = guide.slice(guide.indexOf('## The subject.json format'));
  const md = [
    `# Request: ${r.subject}`, '', `Created on ${n.toLocaleString('en-GB')} by the Trenta e Lode app.`, '',
    `Subject folder: \`${subjDir}\``, '', `Today: ${isoDay(n)}${r.exam ? ` · exam date: ${r.exam}` : ''} · daily goal across all subjects: ${r.dailyGoal} Pomodoros of ${r.focus} min · preferred video language: ${r.lang}.`, '',
    '## Files to process', ...(r.files.length ? r.files.map(f => `- \`${f}\``) : ['- (no new files)']), '',
    r.note ? '## Notes from the student\n\n' + r.note + '\n' : '',
    r.busy ? '## Days already busy with other subjects (Pomodoros planned)\n\n' + r.busy + '\n' : '',
  ].join('\n');
  const mdFile = path.join(dir, name + '.md');
  fs.writeFileSync(mdFile, md, 'utf8');
  let prompt, launcher = null, url = null;
  if (r.ai === 'claude-code') {
    prompt = `Process the request Requests/${name}.md following CLAUDE.md: topics, verified YouTube videos, flashcards, study plan and calendar for the new files`;
    launcher = path.join(dir, name + ' - open Claude Code.cmd');
    fs.writeFileSync(launcher, `@echo off\r\ncd /d "${hub}"\r\nclaude "${prompt}"\r\n`, 'utf8');
    shell.openPath(launcher);
  } else {
    prompt = [
      `I am a university student using the study app "Trenta e Lode". Please turn my course material for the subject "${r.subject}" into study data for the app.`,
      `I am attaching these files (they are in the folder "${subjDir}"):`, ...r.files.map(f => '- ' + f), '',
      md.split('\n').slice(6).join('\n'),
      'Instructions:',
      '1. Read the attached files and derive the topics, what I must know for each one ("know"), and the kind of exam question to expect ("exam").',
      `2. For each topic suggest 1 main YouTube lecture plus 1–3 alternatives in ${r.lang}. Only use videos you are sure exist; give the 11-character video IDs. The app verifies every ID and drops the wrong ones.`,
      `3. Build a day-by-day plan from ${isoDay(new Date(Date.now() + 864e5))}${r.exam ? ' until the day before the exam ' + r.exam : ''}: about ${r.dailyGoal} Pomodoros per day across all my subjects (see the busy days), lighter on Sundays, with review and practice days.`,
      '4. Add flashcards for definitions, theorems and formulas (LaTeX between $…$).',
      '5. Put every processed file path (as listed above) in "processed".',
      'Answer with ONE JSON object only, in a ```json code block, following exactly this format:', '', schema,
    ].join('\n');
    url = r.ai === 'chatgpt' ? 'https://chatgpt.com/' : r.ai === 'gemini' ? 'https://gemini.google.com/app' : 'https://claude.ai/new';
    shell.openExternal(url);
    if (r.files.length) shell.openPath(subjDir); // so the files can be dragged into the chat
  }
  clipboard.writeText(prompt);
  return { file: mdFile, name, prompt, launcher, url };
});

// ─── Notch ───────────────────────────────────────────────────────────────
function showNotch() {
  if (!notch || notch.isDestroyed()) {
    const wa = screen.getPrimaryDisplay().workArea, W = 640, H = 200;
    notch = new BrowserWindow({ width: W, height: H, x: Math.round(wa.x + wa.width / 2 - W / 2), y: wa.y, frame: false, transparent: true, resizable: false, movable: false,
      alwaysOnTop: true, skipTaskbar: true, show: false, hasShadow: false, fullscreenable: false, minimizable: false, maximizable: false,
      webPreferences: { preload: OV_PRELOAD, contextIsolation: true, backgroundThrottling: false } });
    notch.setAlwaysOnTop(true, 'screen-saver');
    notch.setIgnoreMouseEvents(true, { forward: true });
    notch.loadFile(path.join(__dirname, 'src', 'notch.html'));
    notch.webContents.once('did-finish-load', () => { notch.webContents.send('status', status); notch.showInactive(); });
  } else { notch.webContents.send('status', status); notch.showInactive(); }
}
function hideNotch() { if (notch && !notch.isDestroyed()) notch.hide(); }
function restoreMain() { if (!win) return; win.show(); if (win.isMinimized()) win.restore(); win.focus(); hideNotch(); }
ipcMain.on('notch:mouse', (_e, ignore) => { if (notch && !notch.isDestroyed()) notch.setIgnoreMouseEvents(!!ignore, { forward: true }); });
ipcMain.on('notch:cmd', (_e, c) => { if (c === 'open') return restoreMain(); if (win) win.webContents.send('cmd', c); });
ipcMain.on('notch:menu', () => {
  Menu.buildFromTemplate([{ label: 'Open Trenta e Lode', click: restoreMain }, { label: 'Focus mode (full screen)', click: () => { restoreMain(); win.webContents.send('cmd', 'zen'); } },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]).popup({ window: notch });
});

// ─── Popups ──────────────────────────────────────────────────────────────
let popState = { q: {}, fired: {}, history: [], lastAdhkar: 0, lastHoliday: '', n: 0 };
try { popState = { ...popState, ...JSON.parse(fs.readFileSync(POPSTATE(), 'utf8')) }; } catch { /* first run */ }
const savePop = () => { try { fs.writeFileSync(POPSTATE(), JSON.stringify(popState)); } catch { /* ignore */ } };
function popTitle(m) { return m.type === 'dhikr' ? m.item.title : m.type === 'verse' ? `${m.item.surah.tr} ${m.item.ref}` : m.name; }
function showPopup(m) {
  if (!m) return;
  m = { ...m, theme: prefs.theme, city: prefs.location ? prefs.location.name : '', id: Date.now() };
  popState.history.unshift({ at: Date.now(), type: m.type, title: popTitle(m), ref: m.type === 'dhikr' ? m.item.id : m.type === 'verse' ? m.item.ref : null });
  popState.history = popState.history.slice(0, 40); savePop();
  if (win) win.webContents.send('popup:history', popState.history);
  if (notch && !notch.isDestroyed() && notch.isVisible()) notch.webContents.send('pulse');
  if (!pop || pop.isDestroyed()) {
    pop = new BrowserWindow({ width: 440, height: 300, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, show: false,
      hasShadow: false, fullscreenable: false, minimizable: false, maximizable: false, webPreferences: { preload: OV_PRELOAD, contextIsolation: true } });
    pop.setAlwaysOnTop(true, 'screen-saver');
    pop.loadFile(path.join(__dirname, 'src', 'popup.html'));
    pop.webContents.once('did-finish-load', () => pop.webContents.send('pop:show', m));
  } else pop.webContents.send('pop:show', m);
}
ipcMain.on('pop:size', (_e, h) => {
  if (!pop || pop.isDestroyed()) return;
  const wa = screen.getPrimaryDisplay().workArea, W = 440, H = Math.min(h, wa.height - 20);
  pop.setBounds({ x: wa.x + wa.width - W - 6, y: wa.y + wa.height - H - 6, width: W, height: H });
  if (!pop.isVisible()) pop.showInactive();
});
ipcMain.on('pop:close', () => { if (pop && !pop.isDestroyed()) pop.hide(); });
ipcMain.on('pop:snooze', (_e, m) => setTimeout(() => showPopup(m), 5 * 60000));

// Next item of a shuffled queue: nothing repeats until everything has been shown.
function nextOf(kind, ids) {
  let q = (popState.q[kind] || []).filter(id => ids.includes(id));
  if (!q.length) { q = ids.slice(); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } }
  const id = q.shift(); popState.q[kind] = q; savePop(); return id;
}
function makeVerse(now) {
  if (!OFF.verses.length) return null;
  const d = isoDay(now), hol = OFF.prayer ? ISL.today(OFF.prayer, d, prefs.hijriOffset).hol : null;
  let tag = null;
  if (hol && hol.kind === 'ramadan' && Math.random() < 0.35) tag = 'ramadan';
  else if (now.getDay() === 5 && Math.random() < 0.25) tag = 'friday';
  let pool = tag ? OFF.verses.filter(v => v.tag === tag) : OFF.verses; if (!pool.length) pool = OFF.verses;
  const ref = nextOf(tag ? 'verse-' + tag : 'verse', pool.map(v => v.ref));
  return { type: 'verse', item: OFF.verses.find(v => v.ref === ref) };
}
function makeDhikr(now, force) {
  const d = isoDay(now), r = OFF.prayer && OFF.prayer.days[d];
  // Morning adhkar from Fajr until ʿAsr, evening adhkar from ʿAsr until the next Fajr.
  const when = force || (r ? (now >= ISL.at(d, r.fajr) && now < ISL.at(d, r.asr) ? 'morning' : 'evening') : (now.getHours() >= 4 && now.getHours() < 15 ? 'morning' : 'evening'));
  const list = OFF.adhkar.filter(a => a.when === when);
  if (!list.length) return null;
  const id = nextOf('dhikr-' + when, list.map(a => a.id));
  const item = list.find(a => a.id === id);
  return { type: 'dhikr', item, img: pathToFileURL(path.join(hub, 'Offline', item.img)).href };
}
// Two adhkar, then one verse (or only one of the two kinds if the other is turned off).
function dhikrOrVerse(now = new Date()) {
  popState.n = (popState.n || 0) + 1;
  const verseTurn = prefs.verses && OFF.verses.length && (!prefs.adhkar || !OFF.adhkar.length || popState.n % 3 === 0);
  return verseTurn ? makeVerse(now) : prefs.adhkar ? makeDhikr(now) : null;
}
function schedTick() {
  if (!prefs.islamic || !hub) return;
  const now = new Date(), d = isoDay(now), P = OFF.prayer;
  const busy = prefs.dndSim && status.sim;
  if (P && P.days[d]) {
    const r = P.days[d], today = ISL.today(P, d, prefs.hijriOffset);
    if (!popState.fired[d]) popState.fired = { [d]: [] };
    const fired = popState.fired[d];
    if (prefs.prayerPopups) for (const p of ISL.PRAYERS) {
      if (p.k === 'fajr' || p.k === 'sunrise' || !prefs.prayers[p.k]) continue;
      const t = ISL.at(d, r[p.k]);
      if (now >= t && now - t < 10 * 60000 && !fired.includes(p.k)) {
        fired.push(p.k); savePop();
        const nx = ISL.next(P, new Date(t.getTime() + 60000));
        const jum = p.k === 'dhuhr' && now.getDay() === 5;
        showPopup({ type: 'prayer', key: p.k, name: jum ? 'Jumuʿa' : p.name, ar: jum ? 'الجمعة' : p.ar, hhmm: r[p.k], next: nx && { name: nx.name, hhmm: nx.hhmm },
          hijri: today.text, ramadan: !!(today.hol && today.hol.kind === 'ramadan'), sound: prefs.prayerSound });
        return;
      }
    }
    if (prefs.holidayPopups && today.hol && popState.lastHoliday !== d && now.getHours() >= 7 && !busy) {
      const h = today.hol; popState.lastHoliday = d; savePop();
      const title = h.kind === 'ramadan' ? (h.day === 1 ? 'Ramaḍān mubārak!' : `Ramaḍān · day ${h.day}${h.last10 ? ' · the last ten nights' : ''}`) : h.kind === 'eid' ? 'ʿĪd mubārak!' : 'A special day';
      showPopup({ type: 'holiday', kind: h.kind, name: h.name, title, hijri: today.text, blurb: ISL.BLURB[h.id] + (h.kind === 'ramadan' ? ` Suḥūr until ${r.fajr}, ifṭār at ${r.maghrib}.` : '') });
      return;
    }
  }
  const every = Math.max(1, prefs.adhkarEvery || 10) * 60000;
  if ((prefs.adhkar || prefs.verses) && (OFF.adhkar.length || OFF.verses.length) && !busy) {
    if (!popState.lastAdhkar || popState.lastAdhkar > Date.now()) popState.lastAdhkar = Date.now() - every + 2 * 60000; // first one ~2 min after start
    if (Date.now() - popState.lastAdhkar >= every) { popState.lastAdhkar = Date.now(); savePop(); showPopup(dhikrOrVerse(now)); }
  }
}
function testPopup(kind, now = new Date()) {
  const P = OFF.prayer;
  if (kind === 'prayer') {
    const n = (P && ISL.next(P, now)) || { k: 'asr', name: 'ʿAsr', ar: 'العصر', hhmm: '14:22' };
    const nx = P && ISL.next(P, new Date((n.at || now).getTime() + 60000));
    showPopup({ type: 'prayer', key: n.k, name: n.name, ar: n.ar, hhmm: n.hhmm, next: nx && { name: nx.name, hhmm: nx.hhmm }, hijri: P ? ISL.today(P, isoDay(now), prefs.hijriOffset).text : '', sound: prefs.prayerSound });
  } else if (kind === 'verse') showPopup(makeVerse(now));
  else if (kind === 'morning' || kind === 'evening') showPopup(makeDhikr(now, kind));
  else if (kind === 'dhikr') showPopup(makeDhikr(now));
  else if (kind === 'eid') showPopup({ type: 'holiday', kind: 'eid', name: 'ʿĪd al-Fiṭr', title: 'ʿĪd mubārak!', hijri: '1 Shawwāl 1448 AH', blurb: ISL.BLURB.fitr });
  else showPopup({ type: 'holiday', kind: 'ramadan', name: 'Ramaḍān', title: 'Ramaḍān mubārak!', hijri: '1 Ramaḍān 1448 AH', blurb: ISL.BLURB.ramadan + ' Suḥūr until 05:49, ifṭār at 17:36.' });
}
ipcMain.handle('popup:test', (_e, kind) => testPopup(kind));
ipcMain.handle('popup:history', () => popState.history);

// ─── Self-test: TL_SHOT=<dir> electron . → screenshots, then quit ────────
// TL_VIEWS=name[=urlencoded js],… ; "@wait-<ms>", "@notch…[=js]" captures the notch, "@pop-<kind>[=theme]" a popup.
if (process.env.TL_SHOT) app.whenReady().then(async () => {
  const dir = process.env.TL_SHOT; fs.mkdirSync(dir, { recursive: true });
  win.webContents.on('console-message', (e, lvl, msg, line, src) => { if (lvl >= 2) console.log('[renderer]', msg, src + ':' + line); });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(3500);
  for (const v of (process.env.TL_VIEWS || 'today').split(',')) {
    const [name, js] = v.split('=');
    if (name.startsWith('@wait-')) { await wait(+name.slice(6)); continue; }
    if (name.startsWith('@notch')) {
      showNotch(); await wait(1200);
      if (js) await notch.webContents.executeJavaScript(decodeURIComponent(js));
      await wait(1000);
      fs.writeFileSync(path.join(dir, name.slice(1) + '.png'), (await notch.webContents.capturePage()).toPNG()); hideNotch(); continue;
    }
    if (name.startsWith('@pop')) {
      if (js) prefs.theme = decodeURIComponent(js);
      testPopup(name.split('-')[1]);
      await wait(2200);
      fs.writeFileSync(path.join(dir, name.slice(1) + '.png'), (await pop.webContents.capturePage()).toPNG()); pop.hide(); continue;
    }
    try { await win.webContents.executeJavaScript(js ? decodeURIComponent(js) : `go('${name}')`); } catch (err) { console.log('[shot]', name, err.message); }
    await wait(1600);
    fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG());
  }
  app.quit();
});

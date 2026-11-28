// updater.js — keeps Trenta e Lode up to date from the GitHub releases.
// • "Install updates automatically": a newer version is downloaded in the background and installed
//   when the app closes (installer builds; the portable .exe cannot update itself, so it gets a link).
// • "Tell me when a new version is available": a popup offers to update now (or says the update is
//   ready and offers to restart). Without internet the check fails silently and is retried later.
const { app, net, shell } = require('electron');

module.exports = function createUpdater({ getPrefs, showPopup, send, repo }) {
  let au = null;
  try { au = require('electron-updater').autoUpdater; } catch { /* running without the dependency */ }
  const repoPath = (repo || '').replace(/^https:\/\/github\.com\//, '');
  const PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;
  const canInstall = () => !!au && app.isPackaged && !PORTABLE && (process.platform === 'win32' || (process.platform === 'linux' && !!process.env.APPIMAGE));
  const current = process.env.TL_FAKE_VERSION || app.getVersion(); // TL_FAKE_VERSION: self-tests
  const st = { state: 'idle', current, latest: null, url: null, notes: '', progress: 0, error: '', checked: 0, canInstall: canInstall() };
  const push = () => send('update:status', { ...st });
  const newer = (a, b) => { const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
  const plain = md => String(md || '').replace(/```[\s\S]*?```/g, '').replace(/[#*_`>]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 260);
  const notified = {}; // version → day, so the popup comes back at most once a day

  if (au) {
    au.autoDownload = false; au.autoInstallOnAppQuit = true; au.logger = null;
    au.on('download-progress', p => { st.state = 'downloading'; st.progress = Math.round(p.percent || 0); push(); });
    au.on('update-downloaded', () => {
      st.state = 'ready'; st.progress = 100; push();
      if (getPrefs().updateNotify !== false) showPopup({ type: 'update', kind: 'ready', name: `Trenta e Lode ${st.latest}`, version: st.latest, current, notes: st.notes });
    });
    au.on('error', e => { st.state = 'error'; st.error = String((e && e.message) || e).slice(0, 200); push(); });
  }

  async function latestRelease() {
    const r = await net.fetch(`https://api.github.com/repos/${repoPath}/releases/latest`, { headers: { 'User-Agent': 'Trenta-e-Lode-updater', Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return { version: String(j.tag_name || '').replace(/^v/, ''), url: j.html_url, notes: plain(j.body) };
  }
  async function check(manual = false) {
    const p = getPrefs();
    if (!manual && p.autoUpdate === false && p.updateNotify === false) return { ...st };
    if (!manual && !app.isPackaged && !process.env.TL_FAKE_VERSION) return { ...st }; // not from a source checkout
    if (st.state === 'downloading' || st.state === 'ready') return { ...st };
    st.state = 'checking'; push();
    try {
      const r = await latestRelease();
      Object.assign(st, { checked: Date.now(), latest: r.version, url: r.url, notes: r.notes, error: '' });
      if (!r.version || !newer(r.version, current)) { st.state = 'uptodate'; push(); return { ...st }; }
      st.state = 'available'; push();
      if (p.autoUpdate !== false && canInstall()) { download(); return { ...st }; } // the popup comes when it is ready
      const day = new Date().toDateString();
      if (manual || (p.updateNotify !== false && notified[r.version] !== day)) {
        notified[r.version] = day;
        showPopup({ type: 'update', kind: 'available', name: `Trenta e Lode ${r.version}`, version: r.version, current, notes: r.notes, canInstall: canInstall() });
      }
    } catch (e) { st.state = 'offline'; st.error = String((e && e.message) || e).slice(0, 200); push(); }
    return { ...st };
  }
  function download() {
    if (!canInstall()) { shell.openExternal(st.url || `${repo}/releases/latest`); return; }
    st.state = 'downloading'; st.progress = 0; push();
    au.checkForUpdates().then(() => au.downloadUpdate()).catch(e => { st.state = 'error'; st.error = String((e && e.message) || e).slice(0, 200); push(); });
  }
  function act(a) {
    if (a === 'install') download();
    else if (a === 'restart' && st.state === 'ready') setImmediate(() => au.quitAndInstall(false, true));
    else if (a === 'notes') shell.openExternal(st.url || `${repo}/releases`);
    return { ...st };
  }
  function start() { setTimeout(() => check(false), 20000); setInterval(() => check(false), 4 * 3600 * 1000); }
  return { check, act, start, status: () => ({ ...st }) };
};

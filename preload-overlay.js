// Preload for the small overlay windows (popup notifications and the dynamic notch).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ov', {
  on: (ch, cb) => ipcRenderer.on(ch, (_e, d) => cb(d)),
  send: (ch, d) => ipcRenderer.send(ch, d),
});

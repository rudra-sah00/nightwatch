const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  onUpdaterMessage: (cb) =>
    ipcRenderer.on('updater-message', (_e, text) => cb(text)),
  onUpdaterVersion: (cb) =>
    ipcRenderer.on('updater-version', (_e, ver) => cb(ver)),
  onUpdaterProgress: (cb) =>
    ipcRenderer.on('updater-progress', (_e, pct) => cb(pct)),
});

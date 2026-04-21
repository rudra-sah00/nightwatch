const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Shared store instance — set by main.js via setStore() to avoid creating a second instance
let store = null;

function setStore(sharedStore) {
  store = sharedStore;
}

function getStore() {
  return store;
}

const activeDownloadsMap = new Map();
const downloadQueue = [];

const VAULT_PATH = path.join(app.getPath('userData'), 'OfflineVault');
if (!fs.existsSync(VAULT_PATH)) {
  fs.mkdirSync(VAULT_PATH, { recursive: true });
}

function getDatabase() {
  try {
    return { items: getStore().get('downloads', []) };
  } catch (_e) {
    return { items: [] };
  }
}

function saveDatabase(dbObj) {
  try {
    getStore().set('downloads', dbObj.items || []);
  } catch (_e) {}
}

let _syncTimer = null;
const _pendingSync = new Map();

function syncDbState(updatedItem) {
  if (updatedItem.status === 'CANCELLED') return;

  // Buffer the latest state per contentId
  const safeClone = { ...updatedItem };
  delete safeClone.reqs;
  delete safeClone.segmentsDownloadedSet;
  _pendingSync.set(updatedItem.contentId, safeClone);

  // Flush immediately for terminal states, debounce for progress updates
  if (
    updatedItem.status === 'COMPLETED' ||
    updatedItem.status === 'ERROR' ||
    updatedItem.status === 'PAUSED'
  ) {
    _flushSync();
    return;
  }

  // Debounce: write at most every 3 seconds during active downloads
  if (!_syncTimer) {
    _syncTimer = setTimeout(() => {
      _syncTimer = null;
      _flushSync();
    }, 3000);
  }
}

function _flushSync() {
  if (_pendingSync.size === 0) return;
  const db = getDatabase();
  for (const [contentId, item] of _pendingSync) {
    const idx = db.items.findIndex((i) => i.contentId === contentId);
    if (idx > -1) db.items[idx] = item;
    else db.items.push(item);
  }
  _pendingSync.clear();
  saveDatabase(db);
}

function finalizeCancel(_item, contentId) {
  const db = getDatabase();
  db.items = db.items.filter((i) => i.contentId !== contentId);
  saveDatabase(db);
  try {
    const p = path.join(VAULT_PATH, contentId);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  } catch (_e) {}
  activeDownloadsMap.delete(contentId);
}

function sendSafeProgress(eventSender, item) {
  if (!eventSender || eventSender.isDestroyed()) return;
  const safeClone = { ...item };
  delete safeClone.reqs;
  delete safeClone.segmentsDownloadedSet;
  try {
    eventSender.send('download-progress', safeClone);
  } catch (_e) {
    // Sender destroyed between check and send — safe to ignore
  }

  // Update Windows taskbar progress bar
  if (process.platform === 'win32') {
    try {
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        if (item.status === 'DOWNLOADING' && item.progress > 0) {
          win.setProgressBar(item.progress / 100);
        } else if (
          item.status === 'COMPLETED' ||
          item.status === 'ERROR' ||
          item.status === 'CANCELLED'
        ) {
          win.setProgressBar(-1); // Remove progress bar
        }
      }
    } catch (_e) {}
  }
}

module.exports = {
  setStore,
  getStore,
  activeDownloadsMap,
  downloadQueue,
  VAULT_PATH,
  getDatabase,
  saveDatabase,
  syncDbState,
  finalizeCancel,
  sendSafeProgress,
};

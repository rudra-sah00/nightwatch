const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Store = require('electron-store');
const store = new Store();

const activeDownloadsMap = new Map();
const downloadQueue = [];

const VAULT_PATH = path.join(app.getPath('userData'), 'OfflineVault');
if (!fs.existsSync(VAULT_PATH)) {
  fs.mkdirSync(VAULT_PATH, { recursive: true });
}

function getDatabase() {
  try {
    return { items: store.get('downloads', []) };
  } catch (_e) {
    return { items: [] };
  }
}

function saveDatabase(dbObj) {
  try {
    store.set('downloads', dbObj.items || []);
  } catch (_e) {}
}

function syncDbState(updatedItem) {
  if (updatedItem.status === 'CANCELLED') return;
  const db = getDatabase();
  const idx = db.items.findIndex((i) => i.contentId === updatedItem.contentId);
  const safeClone = { ...updatedItem };
  delete safeClone.reqs;
  delete safeClone.segmentsDownloadedSet;

  if (idx > -1) db.items[idx] = safeClone;
  else db.items.push(safeClone);
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
  if (!eventSender) return;
  const safeClone = { ...item };
  delete safeClone.reqs;
  delete safeClone.segmentsDownloadedSet;
  eventSender.send('download-progress', safeClone);
}

module.exports = {
  store,
  activeDownloadsMap,
  downloadQueue,
  VAULT_PATH,
  getDatabase,
  saveDatabase,
  syncDbState,
  finalizeCancel,
  sendSafeProgress,
};

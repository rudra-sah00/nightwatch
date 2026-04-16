const { protocol, ipcMain, net } = require('electron');
const path = require('node:path');
const {
  VAULT_PATH,
  store,
  downloadQueue,
  activeDownloadsMap,
  getDatabase,
  sendSafeProgress,
  finalizeCancel,
  saveDatabase,
} = require('./downloads/state');
const { startMp4Download } = require('./downloads/mp4');
const { startHlsDownload } = require('./downloads/hls');

let currentActiveCount = 0;

async function startDownloadTask(eventSender, args) {
  const { m3u8Url } = args;
  const isMp4 =
    m3u8Url.includes('.mp4') ||
    m3u8Url.includes('/subject/play') ||
    m3u8Url.includes('?dl=1');

  if (isMp4) {
    return startMp4Download(eventSender, { ...args, url: m3u8Url });
  } else {
    return startHlsDownload(eventSender, args);
  }
}

function processQueue() {
  const maxActive = store.get('concurrentDownloads') || 1;
  while (currentActiveCount < maxActive && downloadQueue.length > 0) {
    const task = downloadQueue.shift();
    if (task.isCancelled) continue;

    currentActiveCount++;
    startDownloadTask(task.eventSender, task.args).finally(() => {
      currentActiveCount--;
      processQueue();
    });
  }
}

function setupDownloadManager() {
  ipcMain.on('start-download', (event, args) => {
    const db = getDatabase();
    let iter = db.items.find((i) => i.contentId === args.contentId);
    if (!iter) {
      iter = {
        contentId: args.contentId,
        title: args.title,
        m3u8Url: args.m3u8Url,
        status: 'QUEUED',
        progress: 0,
        downloadedBytes: 0,
      };
      if (args.metadata) iter.showData = args.metadata;
      db.items.push(iter);
    } else {
      iter.status = 'QUEUED';
      if (args.metadata) iter.showData = args.metadata;
    }
    saveDatabase(db);
    sendSafeProgress(event.sender, iter);

    downloadQueue.push({
      eventSender: event.sender,
      args,
      isCancelled: false,
      contentId: args.contentId,
    });
    processQueue();
  });

  ipcMain.on('cancel-download', (_event, contentId) => {
    if (activeDownloadsMap.has(contentId)) {
      const activeItem = activeDownloadsMap.get(contentId);
      activeItem.status = 'CANCELLED';
      if (activeItem.reqs && Array.isArray(activeItem.reqs)) {
        activeItem.reqs.forEach((req) => {
          req?.destroy();
        });
      }
    }
    const qIndex = downloadQueue.findIndex((q) => q.contentId === contentId);
    if (qIndex > -1) {
      downloadQueue[qIndex].isCancelled = true;
    }
    finalizeCancel({ status: 'CANCELLED' }, contentId);
  });

  ipcMain.handle('get-downloads', async () => {
    return getDatabase().items;
  });

  if (protocol.handle) {
    protocol.handle('offline-media', (request) => {
      let relativePath;
      try {
        const urlObj = new URL(request.url);
        relativePath =
          urlObj.hostname === 'local'
            ? decodeURIComponent(urlObj.pathname.slice(1))
            : decodeURIComponent(urlObj.hostname + urlObj.pathname);
      } catch (_e) {
        relativePath = decodeURIComponent(
          request.url.replace(/^offline-media:\/\//, ''),
        );
      }
      return net.fetch(`file://${path.join(VAULT_PATH, relativePath)}`);
    });
  }
}

module.exports = { setupDownloadManager, startDownloadTask };

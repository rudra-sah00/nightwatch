const { protocol, ipcMain } = require('electron');

/**
 * MUST be called immediately after app.whenReady() — before the splash or main window.
 * Registers the offline-media:// custom protocol handler so encrypted HLS segments
 * downloaded offline can be served to the video player at any point in app lifetime.
 */
function setupOfflineMediaProtocol() {
  if (!protocol.handle) return; // Safety: older Electron versions

  const path = require('node:path');
  const fs = require('node:fs');
  const { VAULT_PATH } = require('./downloads/state');

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
    const finalPath = path.join(VAULT_PATH, relativePath);

    // Security: prevent path traversal — resolved path must stay inside VAULT_PATH
    const resolvedPath = path.resolve(finalPath);
    if (!resolvedPath.startsWith(path.resolve(VAULT_PATH))) {
      console.error('[offline-media] Path traversal blocked:', relativePath);
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const stat = fs.statSync(finalPath);
      const range = request.headers.get('range');
      const size = stat.size;

      const ext = path.extname(finalPath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.m3u8') contentType = 'application/x-mpegURL';
      else if (ext === '.ts') contentType = 'video/MP2T';
      else if (ext === '.vtt') contentType = 'text/vtt';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';

      const { XorStream } = require('./downloads/cipher');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = end - start + 1;

        let fileStream = fs.createReadStream(finalPath, { start, end });
        if (ext === '.ts' || ext === '.mp4') {
          fileStream = fileStream.pipe(new XorStream(start));
        }
        const webStream = require('node:stream').Readable.toWeb(fileStream);
        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        let fileStream = fs.createReadStream(finalPath);
        if (ext === '.ts' || ext === '.mp4') {
          fileStream = fileStream.pipe(new XorStream(0));
        }
        const webStream = require('node:stream').Readable.toWeb(fileStream);
        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': size.toString(),
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (err) {
      console.error('[offline-media] Error serving file:', err);
      return new Response('File error', { status: 500 });
    }
  });
}
const path = require('node:path');
const fs = require('node:fs');
const {
  VAULT_PATH,
  getStore,
  downloadQueue,
  activeDownloadsMap,
  getDatabase,
  sendSafeProgress,
  finalizeCancel,
  saveDatabase,
} = require('./downloads/state');
const { downloadS1 } = require('./downloads/providers/s1');
const { downloadS2 } = require('./downloads/providers/s2');

let currentActiveCount = 0;

async function startDownloadTask(eventSender, args) {
  const { contentId } = args;
  const prefix = contentId.split(':')[0];

  if (prefix === 's1') {
    return downloadS1(eventSender, args);
  } else if (prefix === 's2') {
    return downloadS2(eventSender, args);
  } else {
    // Fallback if not prefixed
    const { startMp4Download } = require('./downloads/processors/mp4');
    const { startHlsDownload } = require('./downloads/processors/hls');
    const isMp4 =
      args.m3u8Url.includes('.mp4') ||
      args.m3u8Url.includes('/subject/play') ||
      args.m3u8Url.includes('?dl=1');
    if (isMp4)
      return startMp4Download(eventSender, { ...args, url: args.m3u8Url });
    else return startHlsDownload(eventSender, args);
  }
}

function processQueue() {
  const maxActive = getStore().get('concurrentDownloads') || 1;
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
  // Rehydrate downloads on app start.
  // - QUEUED / ERROR → re-queue automatically (user intended these to run)
  // - PAUSED → keep as PAUSED; user will manually resume
  // - DOWNLOADING → app crashed mid-download; mark as PAUSED so user can resume safely
  const initialDb = getDatabase();

  // Fix items that were left in DOWNLOADING state from a crash
  let needsSave = false;
  for (const item of initialDb.items) {
    if (item.status === 'DOWNLOADING') {
      item.status = 'PAUSED';
      item.speed = '';
      needsSave = true;
    }
  }
  if (needsSave) saveDatabase(initialDb);

  // Only auto-restart QUEUED, ERROR, and FAILED items — not PAUSED
  const autoStartItems = initialDb.items.filter(
    (i) =>
      i.status === 'QUEUED' || i.status === 'ERROR' || i.status === 'FAILED',
  );
  for (const item of autoStartItems) {
    downloadQueue.push({
      eventSender: null, // No sender yet — frontend reconnects when it mounts
      args: item,
      isCancelled: false,
      contentId: item.contentId,
    });
  }
  processQueue();

  ipcMain.on('start-download', (event, args) => {
    // Safety cap: refuse new downloads if queue is already full
    const MAX_QUEUE = 100;
    if (downloadQueue.length >= MAX_QUEUE) {
      event.sender.send('download-progress', {
        contentId: args.contentId,
        status: 'ERROR',
        error:
          'Download queue is full. Please wait for current downloads to finish.',
      });
      return;
    }

    // Check available disk space (require at least 500MB free)
    try {
      const { statfsSync } = require('node:fs');
      const stats = statfsSync(VAULT_PATH);
      const freeBytes = stats.bavail * stats.bsize;
      const MIN_FREE = 500 * 1024 * 1024; // 500MB
      if (freeBytes < MIN_FREE) {
        event.sender.send('download-progress', {
          contentId: args.contentId,
          status: 'ERROR',
          error: `Not enough disk space. ${Math.round(freeBytes / 1024 / 1024)}MB free, need at least 500MB.`,
        });
        return;
      }
    } catch (_e) {
      // statfsSync may not be available on all platforms — proceed anyway
    }

    const db = getDatabase();
    let iter = db.items.find((i) => i.contentId === args.contentId);
    if (!iter) {
      iter = {
        contentId: args.contentId,
        title: args.title,
        m3u8Url: args.m3u8Url,
        quality: args.quality || 'high',
        status: 'QUEUED',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
      };
      if (args.metadata) iter.showData = args.metadata;
      db.items.push(iter);
    } else {
      if (iter.quality !== args.quality) {
        // Quality changed — delete existing files and restart from scratch
        const contentFolder = path.join(VAULT_PATH, args.contentId);
        if (fs.existsSync(contentFolder)) {
          fs.rmSync(contentFolder, { recursive: true, force: true });
        }
        iter.downloadedBytes = 0;
        iter.totalBytes = 0;
        iter.progress = 0;
        iter.m3u8Url = args.m3u8Url;
      }
      iter.quality = args.quality || 'high';
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
  ipcMain.on('pause-download', (event, contentId) => {
    if (activeDownloadsMap.has(contentId)) {
      const activeItem = activeDownloadsMap.get(contentId);
      activeItem.status = 'PAUSED';
      if (activeItem.reqs && Array.isArray(activeItem.reqs)) {
        activeItem.reqs.forEach((req) => {
          req?.destroy();
        });
      }
      activeItem.speed = '';
      require('./downloads/state').syncDbState(activeItem);
      require('./downloads/state').sendSafeProgress(event.sender, activeItem);
    }
  });

  ipcMain.on('resume-download', (event, contentId) => {
    const db = require('./downloads/state').getDatabase();
    const item = db.items.find((i) => i.contentId === contentId);
    if (item && (item.status === 'PAUSED' || item.status === 'ERROR')) {
      item.status = 'QUEUED';
      require('./downloads/state').saveDatabase(db);

      // Fix #11: Re-queue the download with full args payload, not just ID
      downloadQueue.push({
        eventSender: event.sender,
        args: item,
        isCancelled: false,
        contentId: item.contentId,
      });
      processQueue();
    }
  });

  ipcMain.handle('get-downloads', async () => {
    return getDatabase().items;
  });
}

// Note: offline-media:// protocol handler is registered separately via
// setupOfflineMediaProtocol() which is called early in main.js (before the splash).

module.exports = {
  setupOfflineMediaProtocol,
  setupDownloadManager,
  startDownloadTask,
};

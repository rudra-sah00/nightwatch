const fs = require('node:fs');
const path = require('node:path');
const {
  getDatabase,
  syncDbState,
  sendSafeProgress,
  activeDownloadsMap,
  finalizeCancel,
  VAULT_PATH,
  store,
} = require('../state');
const { downloadFile, formatSpeed } = require('../network');

async function startMp4Download(
  eventSender,
  { contentId, title, url, posterUrl },
) {
  const contentFolder = path.join(VAULT_PATH, contentId);
  if (!fs.existsSync(contentFolder))
    fs.mkdirSync(contentFolder, { recursive: true });

  const db = getDatabase();
  let item = db.items.find((i) => i.contentId === contentId);
  if (!item) {
    item = {
      contentId,
      title,
      m3u8Url: url,
      status: 'DOWNLOADING',
      progress: 0,
      downloadedBytes: 0,
      segmentsTotal: 1,
      segmentsDownloaded: 0,
    };
    db.items.push(item);
  } else {
    item.status = 'DOWNLOADING';
  }
  if (!item.downloadedBytes) item.downloadedBytes = 0;

  activeDownloadsMap.set(contentId, item);
  item.reqs = [];

  item.segmentsTotal = 1;
  item.isMp4 = true;
  syncDbState(item);
  sendSafeProgress(eventSender, item);

  const localName = 'movie.mp4';
  const destPath = path.join(contentFolder, localName);

  let lastTime = Date.now();
  let bytesSinceLastTick = 0;

  try {
    if (
      posterUrl &&
      (!posterUrl.startsWith('offline-media://') ||
        !fs.existsSync(
          path.join(
            contentFolder,
            `poster${path.extname(new URL(posterUrl.replace('offline-media://local/', 'http://localhost/')).pathname) || '.jpg'}`,
          ),
        ))
    ) {
      try {
        const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
        const posterDest = path.join(contentFolder, `poster${ext}`);
        if (!fs.existsSync(posterDest)) {
          await downloadFile(posterUrl, posterDest, null, item, store).catch(
            () => null,
          );
        }
        item.posterUrl = `offline-media://local/${encodeURIComponent(contentId)}/poster${ext}`;
        if (item.showData) {
          item.showData.posterUrl = item.posterUrl;
          if (item.showData.posterHdUrl)
            item.showData.posterHdUrl = item.posterUrl;
        }
      } catch (err) {
        console.error(
          '[startMp4Download] Error processing poster URL:',
          err.message,
        );
      }
    }

    let startOffset = 0;
    let needsFullDownload = true;

    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      if (item.progress === 100 || item.status === 'COMPLETED') {
        item.downloadedBytes = stat.size;
        needsFullDownload = false;
      } else if (stat.size > 0) {
        startOffset = stat.size;
      }
    }

    if (needsFullDownload) {
      await downloadFile(
        url,
        destPath,
        (bytes) => {
          item.downloadedBytes += bytes;
          bytesSinceLastTick += bytes;
          const now = Date.now();
          if (now - lastTime >= 1000) {
            item.speed = formatSpeed(bytesSinceLastTick);
            item.progress = 50; // Just an arbitrary display marker since we don't have total size here
            syncDbState(item);
            sendSafeProgress(eventSender, item);
            lastTime = now;
            bytesSinceLastTick = 0;
          }
        },
        item,
        store,
        startOffset,
      );
    }

    if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);
    if (item.status === 'PAUSED') {
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }

    item.segmentsDownloaded = 1;
    item.status = 'COMPLETED';
    item.progress = 100;
    item.localPlaylistPath = `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(localName)}`;
    item.speed = '';
    syncDbState(item);
    sendSafeProgress(eventSender, item);
  } catch (error) {
    console.error('[startMp4Download ERROR]', error);
    if (item.status !== 'CANCELLED' && item.status !== 'PAUSED') {
      item.status = 'ERROR';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
    }
  } finally {
    activeDownloadsMap.delete(contentId);
  }
}

module.exports = { startMp4Download };

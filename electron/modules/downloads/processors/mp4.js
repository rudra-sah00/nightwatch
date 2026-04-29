const fs = require('node:fs');
const path = require('node:path');
const {
  getDatabase,
  syncDbState,
  sendSafeProgress,
  activeDownloadsMap,
  finalizeCancel,
  VAULT_PATH,
  getStore,
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
      totalBytes: 0, // Persisted total so progress survives restarts
      segmentsTotal: 1,
      segmentsDownloaded: 0,
    };
    db.items.push(item);
  } else {
    item.status = 'DOWNLOADING';
  }
  if (!item.downloadedBytes) item.downloadedBytes = 0;
  if (!item.totalBytes) item.totalBytes = 0;

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
    // Download poster image (skip if already cached)
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
          await downloadFile(
            posterUrl,
            posterDest,
            null,
            item,
            getStore(),
          ).catch(() => null);
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

    // --- RESUME LOGIC ---
    // Read the actual file size on disk to determine the resume offset.
    // This survives app restarts — we don't rely on the in-memory state.
    let startOffset = 0;
    let needsDownload = true;

    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);

      if (item.status === 'COMPLETED' || item.progress === 100) {
        // Already fully downloaded — skip network request entirely
        item.downloadedBytes = stat.size;
        if (!item.totalBytes) item.totalBytes = stat.size;
        needsDownload = false;
      } else if (stat.size > 0) {
        // Partial file exists — resume from current file size
        startOffset = stat.size;
        // Restore downloadedBytes from actual file size (not DB, which may be stale)
        item.downloadedBytes = stat.size;
        // Recalculate progress if we have the stored totalBytes
        if (item.totalBytes > 0) {
          item.progress = Math.min(99, (stat.size / item.totalBytes) * 100);
        }
      }
    } else {
      // Fresh download — reset counters
      item.downloadedBytes = 0;
      item.totalBytes = 0;
      item.progress = 0;
    }

    syncDbState(item);
    sendSafeProgress(eventSender, item);

    if (needsDownload) {
      await downloadFile(
        url,
        destPath,
        (bytes) => {
          item.downloadedBytes += bytes;
          bytesSinceLastTick += bytes;

          const now = Date.now();
          if (now - lastTime >= 1000) {
            item.speed = formatSpeed(bytesSinceLastTick);
            // Calculate real progress if we know the total size
            if (item.totalBytes > 0) {
              item.progress = Math.min(
                99,
                (item.downloadedBytes / item.totalBytes) * 100,
              );
            } else {
              // totalBytes not yet known — show indeterminate progress
              item.progress = 50;
            }
            syncDbState(item);
            sendSafeProgress(eventSender, item);
            lastTime = now;
            bytesSinceLastTick = 0;
          }
        },
        item,
        getStore(),
        startOffset,
        // onTotalBytes: called once when Content-Length header arrives
        (totalBytes) => {
          if (totalBytes > 0 && item.totalBytes !== totalBytes) {
            item.totalBytes = totalBytes;
            // Now we can show real progress for the already-downloaded portion
            if (item.downloadedBytes > 0) {
              item.progress = Math.min(
                99,
                (item.downloadedBytes / item.totalBytes) * 100,
              );
            }
            syncDbState(item);
            sendSafeProgress(eventSender, item);
          }
        },
      );
    }

    if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);
    if (item.status === 'PAUSED') {
      // Sync actual file size so next resume starts from the right offset
      if (fs.existsSync(destPath)) {
        item.downloadedBytes = fs.statSync(destPath).size;
      }
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }

    // Sync final file size as totalBytes (in case we never got Content-Length)
    if (fs.existsSync(destPath)) {
      const finalStat = fs.statSync(destPath);
      item.totalBytes = finalStat.size;
      item.downloadedBytes = finalStat.size;
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
    if (error.message === 'CANCELLED_BY_USER' || item.status === 'CANCELLED') {
      return finalizeCancel(item, contentId);
    }
    if (error.message === 'PAUSED_BY_USER' || item.status === 'PAUSED') {
      // Sync actual bytes downloaded so resume picks up from exact position
      if (fs.existsSync(destPath)) {
        item.downloadedBytes = fs.statSync(destPath).size;
        if (item.totalBytes > 0) {
          item.progress = Math.min(
            99,
            (item.downloadedBytes / item.totalBytes) * 100,
          );
        }
      }
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }
    item.status = 'ERROR';
    item.error = error.message;
    item.speed = '';
    syncDbState(item);
    sendSafeProgress(eventSender, item);
  } finally {
    activeDownloadsMap.delete(contentId);
  }
}

module.exports = { startMp4Download };

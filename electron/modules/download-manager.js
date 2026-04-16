const { protocol, ipcMain, app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');
const Store = require('electron-store');

const store = new Store();

// Config
const CONCURRENCY_LIMIT = 5; // How many chunks to download in parallel per item

const VAULT_PATH = path.join(app.getPath('userData'), 'OfflineVault');

// Ensure vault exists
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

/**
 * Fetch a raw HTTP/HTTPS text content
 */
function fetchText(url) {
  if (
    !url ||
    typeof url !== 'string' ||
    url === 'null' ||
    url.startsWith('null') ||
    url === 'undefined'
  ) {
    return Promise.reject(
      new Error(`[fetchText] Invalid URL provided: ${url}`),
    );
  }
  return new Promise((resolve, reject) => {
    if (url.startsWith('//')) {
      url = `https:${url}`;
    }
    const client = url.startsWith('https') ? https : http;
    client
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            return resolve(fetchText(new URL(res.headers.location, url).href));
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        },
      )
      .on('error', reject);
  });
}

/**
 * Downloads a binary file and tracks bytes, observing global speed limits & cancel state
 */
function downloadFile(url, dest, onProgressBytes, activeItem = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    const req = client.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          resolve(
            downloadFile(
              new URL(res.headers.location, url).href,
              dest,
              onProgressBytes,
              activeItem,
            ),
          );
          return;
        }

        res.on('data', (chunk) => {
          // Abort requested!
          if (activeItem && activeItem.status === 'CANCELLED') {
            res.destroy();
            file.close();
            fs.unlink(dest, () => {});
            return reject(new Error('CANCELLED_BY_USER'));
          }

          if (onProgressBytes) onProgressBytes(chunk.length);

          // Enforce Speed Limit (MB/s)
          const speedLimitMB = store.get('downloadSpeedLimit') || 0; // 0 = unlimited
          if (speedLimitMB > 0) {
            res.pause();
            const targetBytesPerSec = speedLimitMB * 1024 * 1024;
            const waitTimeMs = (chunk.length / targetBytesPerSec) * 1000;
            setTimeout(() => res.resume(), waitTimeMs);
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      },
    );

    req.on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });

    // Attach req to active item so we can abort eagerly before connection establishes
    if (activeItem && !activeItem.reqs) activeItem.reqs = [];
    if (activeItem) activeItem.reqs.push(req);
  });
}

function resolveUrl(baseUrl, segmentUrl) {
  if (!segmentUrl) return baseUrl;
  if (segmentUrl.startsWith('http')) return segmentUrl;
  try {
    const parsed = new URL(segmentUrl, baseUrl);
    return parsed.href;
  } catch (err) {
    throw new Error(
      `Failed to resolve URL. baseUrl: ${baseUrl}, segmentUrl: ${segmentUrl}. ${err.message}`,
    );
  }
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return `${parseFloat((bytesPerSec / k ** i).toFixed(1))} ${sizes[i]}`;
}

// Queue Management State
const activeDownloadsMap = new Map(); // K: contentId, V: shared item object reference!
const downloadQueue = [];
let currentActiveCount = 0;

// Helper to strip non-serializable objects (like HTTP reqs) from being sent over IPC
function sendSafeProgress(eventSender, item) {
  if (!eventSender) return;
  const safeClone = { ...item };
  delete safeClone.reqs;
  delete safeClone.segmentsDownloadedSet;
  eventSender.send('download-progress', safeClone);
}

async function startHlsDownload(
  eventSender,
  { contentId, title, m3u8Url, posterUrl, subtitleTracks, quality = 'high' },
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
      status: 'DOWNLOADING',
      progress: 0,
      downloadedBytes: 0,
      segmentsTotal: 0,
      segmentsDownloaded: 0,
    };
    db.items.push(item);
  } else {
    item.status = 'DOWNLOADING';
  }

  if (!item.downloadedBytes) item.downloadedBytes = 0;

  // Register global in-memory reference to override cancel bugs!!
  activeDownloadsMap.set(contentId, item);
  item.reqs = []; // stores active http requests

  // Process subtitles
  if (subtitleTracks && Array.isArray(subtitleTracks)) {
    const processedTracks = [];
    for (let i = 0; i < subtitleTracks.length; i++) {
      const track = subtitleTracks[i];
      try {
        const ext = track.url.includes('.srt') ? '.srt' : '.vtt';
        const subName = `subtitle_${track.language.replace(/[^a-z0-9]/gi, '_') || i}${ext}`;
        const subDest = path.join(contentFolder, subName);

        if (!fs.existsSync(subDest)) {
          const subText = await fetchText(track.url);
          fs.writeFileSync(subDest, subText, 'utf8');
        }

        processedTracks.push({
          label: track.label,
          language: track.language,
          url: track.url,
          localPath: `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(subName)}`,
        });
      } catch (_err) {}
    }
    item.subtitleTracks = processedTracks;
  }

  // Initial Sync
  syncDbState(item);
  sendSafeProgress(eventSender, item);

  if (
    !m3u8Url ||
    m3u8Url === 'null' ||
    m3u8Url.startsWith('null') ||
    m3u8Url === 'undefined'
  ) {
    if (item.status !== 'CANCELLED') {
      item.status = 'FAILED';
      item.error = 'Invalid M3U8 URL provided';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
    }
    return;
  }

  try {
    // 1. Download Poster
    if (posterUrl && !item.posterUrl) {
      const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
      const posterDest = path.join(contentFolder, `poster${ext}`);
      if (!fs.existsSync(posterDest)) {
        await downloadFile(posterUrl, posterDest, null, item).catch(() => null); // Ignore cancel error silently
      }
      item.posterUrl = `offline-media://local/${encodeURIComponent(contentId)}/poster${ext}`;
    }

    if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);

    // 2. Determine if HLS or MP4
    const isMp4 =
      m3u8Url.includes('.mp4') ||
      m3u8Url.includes('/subject/play') ||
      m3u8Url.includes('?dl=1');

    if (isMp4) {
      item.segmentsTotal = 1;
      item.isMp4 = true;
      syncDbState(item);
      sendSafeProgress(eventSender, item);

      const localName = 'movie.mp4';
      const destPath = path.join(contentFolder, localName);

      let lastTime = Date.now();
      let bytesSinceLastTick = 0;

      if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        await downloadFile(
          m3u8Url,
          destPath,
          (bytes) => {
            item.downloadedBytes += bytes;
            bytesSinceLastTick += bytes;
            const now = Date.now();
            if (now - lastTime >= 1000) {
              item.speed = formatSpeed(bytesSinceLastTick);
              item.progress = 50;
              syncDbState(item);
              sendSafeProgress(eventSender, item);
              lastTime = now;
              bytesSinceLastTick = 0;
            }
          },
          item,
        );
      } else {
        const stat = fs.statSync(destPath);
        item.downloadedBytes = stat.size;
      }

      if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);

      item.segmentsDownloaded = 1;
      item.status = 'COMPLETED';
      item.progress = 100;
      item.localPlaylistPath = `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(localName)}`;
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }

    // 3. HLS LOGIC
    const masterText = await fetchText(m3u8Url);
    let targetPlaylistUrl = m3u8Url;
    const lines = masterText.split('\n');
    const playlists = [];
    let currentBandwidth = 0;

    // Quick check: is this already a media playlist?
    const isMediaPlaylist = lines.some((l) => l.startsWith('#EXTINF:'));

    if (!isMediaPlaylist) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF')) {
          const bwMatch = line.match(/BANDWIDTH=(\d+)/);
          if (bwMatch) currentBandwidth = parseInt(bwMatch[1], 10);
        } else if (line && !line.startsWith('#')) {
          playlists.push({
            url: resolveUrl(m3u8Url, line),
            bandwidth: currentBandwidth,
          });
        }
      }

      if (playlists.length > 0) {
        playlists.sort((a, b) => b.bandwidth - a.bandwidth);
        if (quality === 'low')
          targetPlaylistUrl = playlists[playlists.length - 1].url;
        else if (quality === 'medium')
          targetPlaylistUrl = playlists[Math.floor(playlists.length / 2)].url;
        else targetPlaylistUrl = playlists[0].url;
      }
    }

    const mediaText = isMediaPlaylist
      ? masterText
      : await fetchText(targetPlaylistUrl);
    const mediaLines = mediaText.split('\n');
    const segments = [];

    for (let i = 0; i < mediaLines.length; i++) {
      const line = mediaLines[i].trim();
      if (line && !line.startsWith('#')) {
        segments.push({
          originalUrl: resolveUrl(targetPlaylistUrl, line),
          localName: `segment_${segments.length}.ts`,
          lineIndex: i,
        });
      }
    }

    item.segmentsTotal = segments.length;
    syncDbState(item);
    sendSafeProgress(eventSender, item);

    const rewritenLines = [...mediaLines];
    let lastTime = Date.now();
    let bytesSinceLastTick = 0;

    const downloadSegment = async (segment) => {
      if (item.status === 'CANCELLED') return;
      const destPath = path.join(contentFolder, segment.localName);
      rewritenLines[segment.lineIndex] = segment.localName;

      if (fs.existsSync(destPath)) {
        const stat = fs.statSync(destPath);
        if (
          stat.size > 0 &&
          !item.segmentsDownloadedSet?.includes(segment.localName)
        ) {
          item.downloadedBytes += stat.size;
          item.segmentsDownloaded++;
          if (!item.segmentsDownloadedSet) item.segmentsDownloadedSet = [];
          item.segmentsDownloadedSet.push(segment.localName);
          return;
        }
      }

      await downloadFile(
        segment.originalUrl,
        destPath,
        (bytes) => {
          item.downloadedBytes += bytes;
          bytesSinceLastTick += bytes;
        },
        item,
      );

      item.segmentsDownloaded++;
      if (!item.segmentsDownloadedSet) item.segmentsDownloadedSet = [];
      item.segmentsDownloadedSet.push(segment.localName);
      item.progress = (item.segmentsDownloaded / item.segmentsTotal) * 100;

      const now = Date.now();
      if (now - lastTime > 1000) {
        const bytesPerSec = (bytesSinceLastTick / (now - lastTime)) * 1000;
        item.speed = formatSpeed(bytesPerSec);
        lastTime = now;
        bytesSinceLastTick = 0;
        syncDbState(item);
      }
      sendSafeProgress(eventSender, item);
    };

    item.segmentsDownloaded = 0;
    item.segmentsDownloadedSet = [];

    // Parallel processing loop that aborts instantly if cancelled
    await (async function runPool() {
      let index = 0;
      const active = new Set();
      return new Promise((resolve) => {
        const next = () => {
          if (item.status === 'CANCELLED') return resolve();
          if (index >= segments.length && active.size === 0) return resolve();
          while (active.size < CONCURRENCY_LIMIT && index < segments.length) {
            const seg = segments[index++];
            const p = downloadSegment(seg).catch(() => null); // Silently drop rejected cancel promises
            active.add(p);
            p.then(() => {
              active.delete(p);
              next();
            });
          }
        };
        next();
      });
    })();

    if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);

    fs.writeFileSync(
      path.join(contentFolder, 'local_playlist.m3u8'),
      rewritenLines.join('\n'),
    );

    item.status = 'COMPLETED';
    item.progress = 100;
    item.localPlaylistPath = `offline-media://local/${encodeURIComponent(contentId)}/local_playlist.m3u8`;
    item.speed = '';
    delete item.segmentsDownloadedSet;
    delete item.reqs;

    syncDbState(item);
    sendSafeProgress(eventSender, item);
  } catch (error) {
    if (error.message === 'CANCELLED_BY_USER' || item.status === 'CANCELLED') {
      return finalizeCancel(item, contentId);
    }
    item.status = 'FAILED';
    item.error = error.message;
    item.speed = '';
    syncDbState(item);
    sendSafeProgress(eventSender, item);
  } finally {
    activeDownloadsMap.delete(contentId);
  }
}

// Updates ONE target item safely into DB without trashing others
function syncDbState(updatedItem) {
  if (updatedItem.status === 'CANCELLED') return; // Cancel handles own cleanup
  const db = getDatabase();
  const idx = db.items.findIndex((i) => i.contentId === updatedItem.contentId);
  // Snapshot just safe serializable fields!
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

// Queue processor manages parallel limits defined by user config
function processQueue() {
  const maxActive = store.get('concurrentDownloads') || 1;
  while (currentActiveCount < maxActive && downloadQueue.length > 0) {
    const task = downloadQueue.shift();
    if (task.isCancelled) continue;

    currentActiveCount++;
    startHlsDownload(task.eventSender, task.args).finally(() => {
      currentActiveCount--;
      processQueue();
    });
  }
}

function setupDownloadManager() {
  ipcMain.on('start-download', (event, args) => {
    // Stage the item as QUEUED and sync DB immediately
    const db = getDatabase();
    let iter = db.items.find((i) => i.contentId === args.contentId);
    if (!iter) {
      iter = {
        contentId: args.contentId,
        title: args.title,
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

    // Enqueue
    downloadQueue.push({
      eventSender: event.sender,
      args,
      isCancelled: false,
      contentId: args.contentId,
    });
    processQueue();
  });

  ipcMain.on('cancel-download', (_event, contentId) => {
    // 1. Cancel active running tasks
    if (activeDownloadsMap.has(contentId)) {
      const activeItem = activeDownloadsMap.get(contentId);
      activeItem.status = 'CANCELLED';
      if (activeItem.reqs && Array.isArray(activeItem.reqs)) {
        activeItem.reqs.forEach((req) => {
          req?.destroy();
        });
      }
    }
    // 2. Clear out of queued tasks waiting
    const qIndex = downloadQueue.findIndex((q) => q.contentId === contentId);
    if (qIndex > -1) {
      downloadQueue[qIndex].isCancelled = true;
    }
    // 3. Purge from JSON right now
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

module.exports = { setupDownloadManager, startHlsDownload };

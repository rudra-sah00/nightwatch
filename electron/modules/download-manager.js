const { protocol, ipcMain, app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');

// Config
const CONCURRENCY_LIMIT = 5; // How many chunks to download in parallel

const VAULT_PATH = path.join(app.getPath('userData'), 'OfflineVault');
const DB_PATH = path.join(VAULT_PATH, 'downloads.json');

// Ensure vault exists
if (!fs.existsSync(VAULT_PATH)) {
  fs.mkdirSync(VAULT_PATH, { recursive: true });
}

function getDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    return { items: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (_e) {
    return { items: [] };
  }
}

function saveDatabase(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

/**
 * Fetch a raw HTTP/HTTPS text content
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
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
 * Downloads a binary file and tracks bytes
 */
function downloadFile(url, dest, onProgressBytes) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Handle redirect
          resolve(
            downloadFile(
              new URL(res.headers.location, url).href,
              dest,
              onProgressBytes,
            ),
          );
          return;
        }
        res.on('data', (chunk) => {
          if (onProgressBytes) onProgressBytes(chunk.length);
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

function resolveUrl(baseUrl, segmentUrl) {
  if (segmentUrl.startsWith('http')) return segmentUrl;
  const parsed = new URL(segmentUrl, baseUrl);
  return parsed.href;
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return `${parseFloat((bytesPerSec / k ** i).toFixed(1))} ${sizes[i]}`;
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
    // Keep existing downloaded bytes and segments for resuming
  }

  // Ensure missing keys
  if (!item.downloadedBytes) item.downloadedBytes = 0;

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
          localPath: `offline-media://${contentId}/${subName}`,
        });
      } catch (err) {
        console.error(`Failed to download subtitle ${track.language}`, err);
      }
    }
    item.subtitleTracks = processedTracks;
  }

  saveDatabase(db);
  if (eventSender) eventSender.send('download-progress', item);

  try {
    // 1. Download Poster
    if (posterUrl && !item.posterUrl) {
      try {
        const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
        const posterDest = path.join(contentFolder, `poster${ext}`);
        if (!fs.existsSync(posterDest)) {
          await downloadFile(posterUrl, posterDest);
        }
        item.posterUrl = `offline-media://${contentId}/poster${ext}`;
      } catch (e) {
        console.error('Poster download failed', e);
      }
    }

    // 2. Determine if HLS or MP4
    const isMp4 = m3u8Url.includes('.mp4') || m3u8Url.includes('/subject/play');

    if (isMp4) {
      // MP4 DOWNLOAD LOGIC
      item.segmentsTotal = 1;
      saveDatabase(db);
      if (eventSender) eventSender.send('download-progress', item);

      const localName = 'movie.mp4';
      const destPath = path.join(contentFolder, localName);

      let lastTime = Date.now();
      let bytesSinceLastTick = 0;

      if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        await downloadFile(m3u8Url, destPath, (bytes) => {
          item.downloadedBytes += bytes;
          bytesSinceLastTick += bytes;

          const now = Date.now();
          if (now - lastTime >= 1000) {
            item.speed = formatSpeed(bytesSinceLastTick);
            item.progress = 50; // Just an active indicator since total size might be unknown
            saveDatabase(db);
            if (eventSender) eventSender.send('download-progress', item);
            lastTime = now;
            bytesSinceLastTick = 0;
          }
        });
      } else {
        const stat = fs.statSync(destPath);
        item.downloadedBytes = stat.size;
      }

      item.segmentsDownloaded = 1;

      if (item.status === 'CANCELLED') {
        const currentDb = getDatabase();
        currentDb.items = currentDb.items.filter(
          (i) => i.contentId !== contentId,
        );
        saveDatabase(currentDb);
        return;
      }

      item.status = 'COMPLETED';
      item.progress = 100;
      item.localPlaylistPath = `offline-media://${contentId}/${localName}`;
      item.speed = '';
      delete item.segmentsDownloadedSet;
      saveDatabase(db);
      if (eventSender) eventSender.send('download-progress', item);

      return;
    }

    // HLS DOWNLOAD LOGIC
    const masterText = await fetchText(m3u8Url);
    let targetPlaylistUrl = m3u8Url;

    const lines = masterText.split('\n');
    const playlists = [];
    let currentBandwidth = 0;

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
      if (quality === 'low') {
        targetPlaylistUrl = playlists[playlists.length - 1].url;
      } else if (quality === 'medium') {
        targetPlaylistUrl = playlists[Math.floor(playlists.length / 2)].url;
      } else {
        targetPlaylistUrl = playlists[0].url;
      }
    }

    // 3. Fetch Media Playlist
    const mediaText = await fetchText(targetPlaylistUrl);
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
    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);

    const rewritenLines = [...mediaLines];

    // 4. Parallel Download Segments Process (with Speed Tracking & Pause/Resume)
    let lastTime = Date.now();
    let bytesSinceLastTick = 0;

    const downloadSegment = async (segment) => {
      if (item.status === 'CANCELLED') return;

      const destPath = path.join(contentFolder, segment.localName);
      rewritenLines[segment.lineIndex] = segment.localName;

      // PAUSE & RESUME: Skip if already fully downloaded previously (simple fast check)
      if (fs.existsSync(destPath)) {
        const stat = fs.statSync(destPath);
        if (
          stat.size > 0 &&
          !item.segmentsDownloadedSet?.includes(segment.localName)
        ) {
          // Was already downloaded in a previous session
          item.downloadedBytes += stat.size;
          item.segmentsDownloaded++;
          if (!item.segmentsDownloadedSet) item.segmentsDownloadedSet = [];
          item.segmentsDownloadedSet.push(segment.localName);
          return;
        }
      }

      // Fresh Download
      await downloadFile(segment.originalUrl, destPath, (bytes) => {
        item.downloadedBytes += bytes;
        bytesSinceLastTick += bytes;
      });

      item.segmentsDownloaded++;
      if (!item.segmentsDownloadedSet) item.segmentsDownloadedSet = [];
      item.segmentsDownloadedSet.push(segment.localName);

      item.progress = (item.segmentsDownloaded / item.segmentsTotal) * 100;

      // Speed calculation tick (every ~1s)
      const now = Date.now();
      if (now - lastTime > 1000) {
        const bytesPerSec = (bytesSinceLastTick / (now - lastTime)) * 1000;
        item.speed = formatSpeed(bytesPerSec);
        lastTime = now;
        bytesSinceLastTick = 0;

        // Sync to file less aggressively, but dispatch UI often
        saveDatabase(db);
      }

      if (eventSender) eventSender.send('download-progress', item);
    };

    // Better async pool logic
    async function runPool(segments) {
      let index = 0;
      const active = new Set();

      return new Promise((resolve, reject) => {
        const next = () => {
          if (item.status === 'CANCELLED') return resolve();
          if (index >= segments.length && active.size === 0) return resolve();

          while (active.size < CONCURRENCY_LIMIT && index < segments.length) {
            const segment = segments[index++];
            const p = downloadSegment(segment).catch(reject);
            active.add(p);
            p.then(() => {
              active.delete(p);
              next();
            });
          }
        };
        next();
      });
    }

    // Reset loop & use accurate pool
    item.segmentsDownloaded = 0;
    item.segmentsDownloadedSet = [];
    // We already skipped checking existing files inside downloadSegment, it will naturally fast-forward.

    await runPool(segments);

    if (item.status === 'CANCELLED') {
      fs.rmSync(contentFolder, { recursive: true, force: true });
      const currentDb = getDatabase();
      currentDb.items = currentDb.items.filter(
        (i) => i.contentId !== contentId,
      );
      saveDatabase(currentDb);
      return;
    }

    // Save rewritten playlist securely
    fs.writeFileSync(
      path.join(contentFolder, 'local_playlist.m3u8'),
      rewritenLines.join('\n'),
    );

    item.status = 'COMPLETED';
    item.progress = 100;
    item.localPlaylistPath = `offline-media://${contentId}/local_playlist.m3u8`;
    item.speed = ''; // Clear speed when done

    // Cleanup temporary tracking data
    delete item.segmentsDownloadedSet;

    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);
  } catch (error) {
    console.error('Download Error:', error);
    item.status = 'ERROR';
    item.error = error.message;
    item.speed = '';
    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);
  }
}

function setupDownloadManager() {
  ipcMain.on('start-download', (event, args) => {
    startHlsDownload(event.sender, args).catch(console.error);
  });

  ipcMain.on('cancel-download', (_event, contentId) => {
    const db = getDatabase();
    const item = db.items.find((i) => i.contentId === contentId);
    if (item) {
      item.status = 'CANCELLED';
      saveDatabase(db);
    }
  });

  ipcMain.handle('get-downloads', async () => {
    return getDatabase().items;
  });

  if (protocol.handle) {
    protocol.handle('offline-media', (request) => {
      const urlObj = new URL(request.url);
      const relativePath = decodeURIComponent(
        urlObj.hostname + urlObj.pathname,
      );
      const absolutePath = path.join(VAULT_PATH, relativePath);
      return net.fetch(`file://${absolutePath}`);
    });
  } else {
    protocol.registerFileProtocol('offline-media', (request, callback) => {
      const urlObj = new URL(request.url);
      const relativePath = decodeURIComponent(
        urlObj.hostname + urlObj.pathname,
      );
      const absolutePath = path.join(VAULT_PATH, relativePath);
      callback({ path: absolutePath });
    });
  }
}

module.exports = { setupDownloadManager, startHlsDownload };

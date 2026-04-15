const { protocol, ipcMain, app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');

// Use lowdb or electron-store to save metadata in the future. For now, an in-memory or simple JSON file is perfect.
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
  } catch (e) {
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
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

/**
 * Downloads a binary file
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Handle redirect
          resolve(downloadFile(res.headers.location, dest));
          return;
        }
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

async function startHlsDownload(
  eventSender,
  { contentId, title, m3u8Url, posterUrl },
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
      segmentsTotal: 0,
      segmentsDownloaded: 0,
    };
    db.items.push(item);
  } else {
    item.status = 'DOWNLOADING';
  }
  saveDatabase(db);

  if (eventSender) eventSender.send('download-progress', item);

  try {
    // 1. Download Poster
    if (posterUrl) {
      const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
      await downloadFile(posterUrl, path.join(contentFolder, `poster${ext}`));
      item.poster = `offline-media://${contentId}/poster${ext}`;
    }

    // 2. Fetch Master Playlist
    const masterText = await fetchText(m3u8Url);
    let targetPlaylistUrl = m3u8Url;

    // Simplistic Logic: If the m3u8 contains other m3u8 files, it's a master playlist.
    // We should parse it to find the highest bandwidth.
    const lines = masterText.split('\n');
    const playlists = [];
    let currentBandwidth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/);
        if (bwMatch) currentBandwidth = parseInt(bwMatch[1]);
      } else if (line && !line.startsWith('#')) {
        playlists.push({
          url: resolveUrl(m3u8Url, line),
          bandwidth: currentBandwidth,
        });
      }
    }

    if (playlists.length > 0) {
      // Sort by bandwidth descending
      playlists.sort((a, b) => b.bandwidth - a.bandwidth);
      targetPlaylistUrl = playlists[0].url; // Highest quality
    }

    // 3. Fetch Media Playlist
    const mediaText = await fetchText(targetPlaylistUrl);
    const mediaLines = mediaText.split('\n');
    const segments = [];

    for (let i = 0; i < mediaLines.length; i++) {
      const line = mediaLines[i].trim();
      // Ignore blank lines and EXT tags except EXT-X-KEY if DRM is involved. (DRM requires more logic)
      if (line && !line.startsWith('#')) {
        segments.push({
          originalUrl: resolveUrl(targetPlaylistUrl, line),
          localName: `segment_${segments.length}.ts`,
          lineIndex: i,
        });
      }
    }

    item.segmentsTotal = segments.length;
    item.segmentsDownloaded = 0;
    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);

    // Rewrite Media Playlist
    const newMediaText = mediaLines.join('\n');
    // We'll replace the lines directly
    const rewritenLines = [...mediaLines];

    // 4. Download Segments Process
    // Instead of downloading sequentially, batch them? Keep it sequential or small batches for stability.
    for (const segment of segments) {
      if (item.status === 'CANCELLED') break; // Allow cancellation

      await downloadFile(
        segment.originalUrl,
        path.join(contentFolder, segment.localName),
      );
      rewritenLines[segment.lineIndex] = segment.localName;

      item.segmentsDownloaded++;
      item.progress = Math.round(
        (item.segmentsDownloaded / item.segmentsTotal) * 100,
      );
      saveDatabase(db);
      if (eventSender) eventSender.send('download-progress', item);
    }

    if (item.status === 'CANCELLED') {
      fs.rmSync(contentFolder, { recursive: true, force: true });
      db.items = db.items.filter((i) => i.contentId !== contentId);
      saveDatabase(db);
      return;
    }

    // Save rewritten playlist
    fs.writeFileSync(
      path.join(contentFolder, 'local_playlist.m3u8'),
      rewritenLines.join('\n'),
    );

    item.status = 'COMPLETED';
    item.playlistPath = `offline-media://${contentId}/local_playlist.m3u8`;
    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);
  } catch (error) {
    console.error('Download Error:', error);
    item.status = 'ERROR';
    item.error = error.message;
    saveDatabase(db);
    if (eventSender) eventSender.send('download-progress', item);
  }
}

function setupDownloadManager() {
  ipcMain.on('start-download', (event, args) => {
    startHlsDownload(event.sender, args).catch(console.error);
  });

  ipcMain.on('cancel-download', (event, contentId) => {
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

  // Register Custom Protocol allowing CORS and bypassing web security limits
  // Requires electron version 25+ for protocol.handle or older protocol.registerFileProtocol
  if (protocol.handle) {
    protocol.handle('offline-media', (request) => {
      const urlObj = new URL(request.url);
      // offline-media://movie_123/local_playlist.m3u8
      const relativePath = decodeURIComponent(
        urlObj.hostname + urlObj.pathname,
      );
      const absolutePath = path.join(VAULT_PATH, relativePath);
      return net.fetch('file://' + absolutePath);
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

module.exports = { setupDownloadManager };

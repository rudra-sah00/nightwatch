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
const {
  fetchText,
  downloadFile,
  resolveUrl,
  formatSpeed,
} = require('../network');

const CONCURRENCY_LIMIT = 5;

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
      m3u8Url,
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

  activeDownloadsMap.set(contentId, item);
  item.reqs = [];

  // Download subtitle tracks (skipped if already on disk)
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
    // Download poster image (skip if already cached)
    if (posterUrl && !item.posterUrl) {
      try {
        const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
        const posterDest = path.join(contentFolder, `poster${ext}`);
        if (!fs.existsSync(posterDest)) {
          await downloadFile(posterUrl, posterDest, null, item, store).catch(
            () => null,
          );
        }
        item.posterUrl = `offline-media://local/${encodeURIComponent(contentId)}/poster${ext}`;
      } catch (err) {
        console.error(
          '[DownloadManager] Error processing poster URL:',
          err.message,
        );
      }
    }

    if (item.status === 'CANCELLED') return finalizeCancel(item, contentId);
    if (item.status === 'PAUSED') return true;

    // --- Fetch and parse the M3U8 playlist ---
    const masterText = await fetchText(m3u8Url);
    let targetPlaylistUrl = m3u8Url;
    const lines = masterText.split('\n');
    const playlists = [];
    let currentBandwidth = 0;

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
      } else if (line.startsWith('#EXT-X-KEY')) {
        // Handle AES-128 keys
        // Format: #EXT-X-KEY:METHOD=AES-128,URI="https://..."
        const uriMatch = line.match(/URI=["']([^"']+)["']/);
        if (uriMatch) {
          const keyUrl = resolveUrl(targetPlaylistUrl, uriMatch[1]);
          const keyName = `key_${i}.bin`;
          segments.push({
            originalUrl: keyUrl,
            localName: keyName,
            lineIndex: i,
            isKey: true,
          });
        }
      }
    }

    item.segmentsTotal = segments.length;

    // --- RESUME LOGIC: Scan disk to restore progress state ---
    // Instead of resetting to 0 every run, we check which segments
    // already exist on disk and restore byte counts from their actual sizes.
    // This is the core fix for "progress resets to 0% after pause/resume/restart".
    {
      let restoredBytes = 0;
      let restoredCount = 0;
      const restoredSet = [];

      for (const seg of segments) {
        if (seg.isKey) continue; // Keys don't count towards segment progress bar
        const destPath = path.join(contentFolder, seg.localName);
        if (fs.existsSync(destPath)) {
          const stat = fs.statSync(destPath);
          if (stat.size > 0) {
            restoredBytes += stat.size;
            restoredCount++;
            restoredSet.push(seg.localName);
          }
        }
      }

      item.downloadedBytes = restoredBytes;
      item.segmentsDownloaded = restoredCount;
      item.segmentsDownloadedSet = restoredSet;
      item.progress =
        segments.length > 0 ? (restoredCount / segments.length) * 100 : 0;
    }

    syncDbState(item);
    sendSafeProgress(eventSender, item);

    const rewritenLines = [...mediaLines];
    let lastTime = Date.now();
    let bytesSinceLastTick = 0;

    const downloadSegment = async (segment) => {
      if (item.status === 'CANCELLED') return;
      const destPath = path.join(contentFolder, segment.localName);
      if (segment.isKey) {
        rewritenLines[segment.lineIndex] = rewritenLines[
          segment.lineIndex
        ].replace(/URI=["'][^"']+["']/, `URI="${segment.localName}"`);
      } else {
        rewritenLines[segment.lineIndex] = segment.localName;
      }

      // Skip already-downloaded segments (restored from disk above)
      if (item.segmentsDownloadedSet?.includes(segment.localName)) {
        return;
      }

      await downloadFile(
        segment.originalUrl,
        destPath,
        (bytes) => {
          item.downloadedBytes += bytes;
          bytesSinceLastTick += bytes;
        },
        item,
        store,
      );

      if (!segment.isKey) {
        item.segmentsDownloaded++;
        if (!item.segmentsDownloadedSet) item.segmentsDownloadedSet = [];
        item.segmentsDownloadedSet.push(segment.localName);
        item.progress = (item.segmentsDownloaded / item.segmentsTotal) * 100;
      }

      const now = Date.now();
      if (now - lastTime > 1000) {
        const bytesPerSec = (bytesSinceLastTick / (now - lastTime)) * 1000;
        item.speed = formatSpeed(bytesPerSec);
        lastTime = now;
        bytesSinceLastTick = 0;
        // Persist progress so a crash/restart can resume from here
        syncDbState(item);
      }
      sendSafeProgress(eventSender, item);
    };

    // Concurrency pool
    await (async function runPool() {
      let index = 0;
      const active = new Set();
      return new Promise((resolve) => {
        const next = () => {
          if (item.status === 'CANCELLED' || item.status === 'PAUSED')
            return resolve();
          if (index >= segments.length && active.size === 0) return resolve();
          while (active.size < CONCURRENCY_LIMIT && index < segments.length) {
            const seg = segments[index++];
            const p = downloadSegment(seg).catch(() => null);
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
    if (item.status === 'PAUSED') {
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }

    // --- VERIFY COMPLETION ---
    // Ensure all segments are actually on disk before marking as COMPLETED.
    // If we missed segments due to network errors, mark as ERROR instead.
    const finalRestoredSet = [];
    for (const seg of segments) {
      if (seg.isKey) continue;
      if (fs.existsSync(path.join(contentFolder, seg.localName))) {
        finalRestoredSet.push(seg.localName);
      }
    }

    item.segmentsDownloaded = finalRestoredSet.length;
    item.progress = (finalRestoredSet.length / segments.length) * 100;

    if (finalRestoredSet.length < segments.length) {
      item.status = 'ERROR';
      item.error = `Download incomplete: ${segments.length - finalRestoredSet.length} segments failed.`;
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }

    // Write the final local m3u8 playlist only if complete
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
    if (error.message === 'PAUSED_BY_USER' || item.status === 'PAUSED') {
      item.speed = '';
      syncDbState(item);
      sendSafeProgress(eventSender, item);
      return;
    }
    item.status = 'FAILED';
    item.error = error.message;
    console.error('[startHlsDownload ERROR]', error);
    item.speed = '';
    syncDbState(item);
    sendSafeProgress(eventSender, item);
  } finally {
    activeDownloadsMap.delete(contentId);
  }
}

module.exports = { startHlsDownload };

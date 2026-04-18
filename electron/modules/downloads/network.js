const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');
const path = require('node:path');
const { XorStream } = require('./cipher');

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
    if (url.startsWith('//')) url = `https:${url}`;
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
          res.on('error', reject);
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        },
      )
      .on('error', reject);
  });
}

/**
 * Downloads a file from url → dest, optionally resuming from startOffset.
 *
 * @param {string}   url              - Remote URL to download
 * @param {string}   dest             - Local file path to write/append to
 * @param {Function} onProgressBytes  - Called with each chunk's byte count
 * @param {object}   activeItem       - The download DB item (checked for PAUSED/CANCELLED)
 * @param {object}   store            - electron-store instance (for speed limit)
 * @param {number}   startOffset      - Byte offset to resume from (sends Range header)
 * @param {Function} onTotalBytes     - Called once with the total file size (for accurate progress)
 */
function downloadFile(
  url,
  dest,
  onProgressBytes,
  activeItem = null,
  store,
  startOffset = 0,
  onTotalBytes = null,
) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest, {
      flags: startOffset > 0 ? 'a' : 'w',
    });

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...(startOffset > 0 ? { Range: `bytes=${startOffset}-` } : {}),
        },
      },
      (res) => {
        // Follow redirects — close current file handle before recursing
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          resolve(
            downloadFile(
              new URL(res.headers.location, url).href,
              dest,
              onProgressBytes,
              activeItem,
              store,
              startOffset,
              onTotalBytes,
            ),
          );
          return;
        }

        // Expose total file size so callers can compute accurate progress %.
        // For Range requests, Content-Range gives us TOTAL: "bytes X-Y/TOTAL"
        // For full downloads, Content-Length alone is the total.
        if (onTotalBytes) {
          const contentRange = res.headers['content-range'];
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) onTotalBytes(parseInt(match[1], 10));
          } else if (res.headers['content-length']) {
            const len = parseInt(res.headers['content-length'], 10);
            if (!Number.isNaN(len)) onTotalBytes(len + startOffset);
          }
        }

        res.on('data', (chunk) => {
          if (activeItem && activeItem.status === 'CANCELLED') {
            res.destroy();
            file.close();
            // Remove the partial file — cancel means start fresh
            fs.unlink(dest, () => {});
            return reject(new Error('CANCELLED_BY_USER'));
          }
          if (activeItem && activeItem.status === 'PAUSED') {
            res.destroy();
            // Keep the partial file on disk — resume will append from current size
            file.close();
            return reject(new Error('PAUSED_BY_USER'));
          }
          if (onProgressBytes) onProgressBytes(chunk.length);
          const speedLimitMB = store.get('downloadSpeedLimit') || 0;
          if (speedLimitMB > 0) {
            res.pause();
            const targetBytesPerSec = speedLimitMB * 1024 * 1024;
            const waitTimeMs = (chunk.length / targetBytesPerSec) * 1000;
            setTimeout(() => res.resume(), waitTimeMs);
          }
        });

        const ext = path.extname(dest).toLowerCase();
        if (ext === '.ts' || ext === '.mp4') {
          res.pipe(new XorStream(startOffset)).pipe(file);
        } else {
          res.pipe(file);
        }

        res.on('error', (err) => {
          console.error('[network.js] res error:', err);
          file.close();
          fs.unlink(dest, () => reject(err));
        });
        file.on('finish', () => {
          file.close(resolve);
        });
        file.on('error', (err) => {
          console.error('[network.js] file error:', err);
          file.close();
          fs.unlink(dest, () => reject(err));
        });
      },
    );

    req.on('error', (err) => {
      file.close();
      // Don't delete partial files for network errors — they can be resumed
      reject(err);
    });

    if (activeItem && !activeItem.reqs) activeItem.reqs = [];
    if (activeItem) activeItem.reqs.push(req);
  });
}

function resolveUrl(baseUrl, segmentUrl) {
  if (!segmentUrl) return baseUrl;
  if (segmentUrl.startsWith('http')) return segmentUrl;
  try {
    return new URL(segmentUrl, baseUrl).href;
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

module.exports = {
  fetchText,
  downloadFile,
  resolveUrl,
  formatSpeed,
};

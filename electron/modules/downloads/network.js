const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');

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

function downloadFile(url, dest, onProgressBytes, activeItem = null, store) {
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
              store,
            ),
          );
          return;
        }
        res.on('data', (chunk) => {
          if (activeItem && activeItem.status === 'CANCELLED') {
            res.destroy();
            file.close();
            fs.unlink(dest, () => {});
            return reject(new Error('CANCELLED_BY_USER'));
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
        res.pipe(file);
        res.on('error', (err) => {
          file.close();
          fs.unlink(dest, () => reject(err));
        });
        file.on('finish', () => file.close(resolve));
        file.on('error', (err) => {
          file.close();
          fs.unlink(dest, () => reject(err));
        });
      },
    );
    req.on('error', (err) => {
      fs.unlink(dest, () => reject(err));
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

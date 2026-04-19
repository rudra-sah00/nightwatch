const { ipcMain, BrowserWindow, net } = require('electron');
const log = require('electron-log');
const http = require('node:http');
const url = require('node:url');
const crypto = require('node:crypto');

let extractionWindow = null; // The "Winning" window
let proxyServer = null;
let proxyPort = 0;
let streamCookies = '';
let streamUrl = '';
const capturedKeys = new Map();
let _lastEventSender = null;

// Per-session random token — prevents other local processes from using the proxy
let proxyToken = crypto.randomBytes(16).toString('hex');

const RACER_PATHS = [
  '/stream/',
  '/cast/',
  '/watch/',
  '/casting/',
  '/player/',
  '/plus/',
];

function getCookieString() {
  return streamCookies || '';
}

function startProxyServer(_eventSender) {
  if (proxyServer) return proxyServer;

  proxyServer = http.createServer(async (req, res) => {
    // Add CORS for Next.js frontend
    const origin = req.headers.origin || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const reqUrl = url.parse(req.url, true);

    // Validate per-session token on every request
    if (reqUrl.query.token !== proxyToken) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    if (reqUrl.pathname === '/playlist.m3u8') {
      if (!streamUrl) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        return res.end('Initializing...');
      }

      try {
        const fetchUrl = streamUrl;
        const reqOpts = {
          headers: {
            Referer: 'https://funsday.cfd/',
            Cookie: getCookieString(),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        };

        const response = await net.fetch(fetchUrl, {
          ...reqOpts,
          bypassCustomProtocolHandlers: true,
        });

        const body = await response.text();

        if (!response.ok) {
          res.writeHead(response.status);
          return res.end(body);
        }

        const fetchOrigin = new URL(response.url || fetchUrl).origin;
        let m3u8Text = body;

        // Rewrite urls to our local proxy
        m3u8Text = m3u8Text.replace(/(https?:\/\/[^\s"',]+)/g, (match) => {
          return `http://localhost:${proxyPort}/proxy?token=${proxyToken}&url=${encodeURIComponent(match)}&ext=.ts`;
        });
        m3u8Text = m3u8Text.replace(/URI="(\/[^"]+)"/g, (_match, p) => {
          return `URI="http://localhost:${proxyPort}/proxy?token=${proxyToken}&url=${encodeURIComponent(fetchOrigin + p)}"`;
        });
        m3u8Text = m3u8Text.replace(/^(\/[^\s]+)$/gm, (_match, p) => {
          return `http://localhost:${proxyPort}/proxy?token=${proxyToken}&url=${encodeURIComponent(fetchOrigin + p)}&ext=.ts`;
        });

        response.headers.forEach((val, key) => {
          const k = key.toLowerCase();
          if (
            ![
              'set-cookie',
              'content-length',
              'access-control-allow-origin',
              'access-control-allow-credentials',
              'content-encoding',
              'transfer-encoding',
            ].includes(k)
          ) {
            res.setHeader(key, val);
          }
        });

        res.writeHead(response.status, {
          'Content-Type': 'application/vnd.apple.mpegurl',
        });
        res.end(m3u8Text);
      } catch (err) {
        res.writeHead(500);
        res.end(err.message);
      }
      return;
    }

    if (reqUrl.pathname === '/proxy') {
      const targetQueryUrl = reqUrl.query.url;
      if (!targetQueryUrl) {
        res.writeHead(400);
        return res.end('Missing url');
      }

      // Security: only proxy HTTP/HTTPS requests (block file://, data:, etc.)
      let parsedUrl;
      try {
        parsedUrl = new URL(targetQueryUrl);
      } catch (_e) {
        res.writeHead(400);
        return res.end('Invalid url');
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        res.writeHead(403);
        return res.end('Protocol not allowed');
      }

      const isKey = parsedUrl.pathname.toLowerCase().includes('/key/');

      // Proxy TS chunks, Keys or nested M3U8s
      try {
        const reqOpts = {
          headers: {
            Referer: 'https://funsday.cfd/',
            Cookie: getCookieString(),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        };

        const targetResponse = await net.fetch(targetQueryUrl, {
          ...reqOpts,
          bypassCustomProtocolHandlers: true,
        });

        targetResponse.headers.forEach((val, key) => {
          const k = key.toLowerCase();
          if (
            ![
              'set-cookie',
              'content-length',
              'access-control-allow-origin',
              'access-control-allow-credentials',
              'content-encoding',
              'transfer-encoding',
            ].includes(k)
          ) {
            res.setHeader(key, val);
          }
        });

        res.writeHead(targetResponse.status, {
          'Content-Type': isKey
            ? 'application/octet-stream'
            : targetQueryUrl.endsWith('.m3u8')
              ? 'application/vnd.apple.mpegurl'
              : 'video/MP2T',
        });

        const reader = targetResponse.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        }
        res.end();
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(err.message);
        } else {
          res.end(); // Premature end
        }
      }
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  proxyServer.listen(0, '127.0.0.1', () => {
    proxyPort = proxyServer.address().port;
  });

  // Auto-restart the proxy if it crashes
  proxyServer.on('error', (err) => {
    log.error('[live-bridge] Proxy server error, restarting...', err.message);
    proxyServer = null;
    proxyPort = 0;
    startProxyServer(_lastEventSender);
  });

  return proxyServer;
}

/**
 * Global cleanup for all racer windows
 */
let racerPool = [];
function cleanupRacers(exceptWindowId = null) {
  racerPool.forEach((win) => {
    if (!win.isDestroyed() && win.id !== exceptWindowId) {
      win.close();
    }
  });
  racerPool = racerPool.filter((win) => !win.isDestroyed());
}

function setupLiveBridge() {
  ipcMain.on(
    'start-live-bridge',
    async (event, { url: originalUrl, channelId }) => {
      _lastEventSender = event.sender;

      // Rotate proxy token for this session
      proxyToken = crypto.randomBytes(16).toString('hex');

      // Cleanup previous attempts
      cleanupRacers();
      if (extractionWindow && !extractionWindow.isDestroyed()) {
        extractionWindow.close();
      }
      extractionWindow = null;

      // State reset
      streamUrl = '';
      capturedKeys.clear();
      streamCookies = '';

      // ID extraction
      const match = originalUrl.match(/stream-(\d+)\.php/);
      const streamId = match ? match[1] : '51';

      log.info(
        `[live-bridge] Starting Parallel Racer for Stream ID: ${streamId}`,
      );

      // Ensure proxy server is running
      startProxyServer(event.sender);

      let hasResolved = false;

      // Create a racer for each path
      RACER_PATHS.forEach((path, index) => {
        setTimeout(() => {
          if (hasResolved) return;

          const racerUrl = `https://dlstreams.top${path}stream-${streamId}.php`;
          const partition = `persist:racer-${path.replace(/\//g, '')}-${streamId}`;

          log.info(`[live-bridge] [Racer ${index}] Spawning: ${racerUrl}`);

          const isDev = !require('electron').app.isPackaged;

          const win = new BrowserWindow({
            width: 1280,
            height: 720,
            show: isDev,
            skipTaskbar: !isDev,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              partition,
              autoplayPolicy: 'document-user-activation-required',
              backgroundThrottling: false,
            },
          });

          racerPool.push(win);

          // Remove the window from the pool as soon as it is destroyed so it
          // can be GC'd immediately rather than leaking until the next channel switch.
          win.on('closed', () => {
            const idx = racerPool.indexOf(win);
            if (idx !== -1) racerPool.splice(idx, 1);
          });

          // Network Interceptor
          win.webContents.session.webRequest.onBeforeRequest(
            { urls: ['*://*/*'] },
            (details, callback) => {
              const foundUrl = details.url;
              const type = details.resourceType || 'unknown';

              // Cancel non-essential traffic
              if (
                ['image', 'media', 'font', 'image/webp', 'image/jpeg'].includes(
                  type,
                ) ||
                (type === 'stylesheet' && !foundUrl.includes('mono.css'))
              ) {
                return callback({ cancel: true });
              }

              if (foundUrl.includes('mono.css')) {
                if (hasResolved) return callback({ cancel: true });

                log.info(`[live-bridge] [WINNER] ${path} resolved the stream!`);
                hasResolved = true;
                streamUrl = foundUrl;
                extractionWindow = win;

                // Immediately kill the losers
                cleanupRacers(win.id);

                // Capture Cookies and notify UI
                win.webContents.session.cookies
                  .get({ url: foundUrl })
                  .then((cookies) => {
                    streamCookies = cookies
                      .map((c) => `${c.name}=${c.value}`)
                      .join('; ');

                    // Guard: renderer may have navigated away during the async cookie fetch.
                    // Sending IPC to a destroyed webContents throws and can crash main.
                    if (!event.sender || event.sender.isDestroyed()) return;

                    const proxyM3u8 = `http://127.0.0.1:${proxyPort}/playlist.m3u8?token=${proxyToken}&t=${Date.now()}`;

                    event.sender.send('live-bridge-resolved', {
                      originalUrl,
                      channelId,
                      hlsUrl: proxyM3u8,
                      headers: {
                        Cookie: streamCookies,
                        Referer: racerUrl,
                      },
                    });

                    // Optimize winner (mute/pause/minimize)
                    setTimeout(() => {
                      if (win && !win.isDestroyed()) {
                        win.webContents.setAudioMuted(true);
                        try {
                          const pauseCode = `
                          setInterval(() => {
                            document.querySelectorAll('video, audio').forEach(m => {
                              m.pause();
                              m.removeAttribute('src');
                              m.load();
                            });
                          }, 2000);
                        `;
                          win.webContents.mainFrame.framesInSubtree.forEach(
                            (frame) => {
                              frame
                                .executeJavaScript(pauseCode)
                                .catch(() => {});
                            },
                          );
                        } catch (_e) {}
                      }
                    }, 1000);
                  });
              }

              callback({ cancel: false });
            },
          );

          win.loadURL(racerUrl).catch(() => {});
        }, index * 250); // Stagger by 250ms
      });

      // Safety timeout for the entire race
      setTimeout(() => {
        if (!hasResolved) {
          log.warn('[live-bridge] Race timed out. Cleaning up pool.');
          hasResolved = true; // prevent any late winner from sending stale IPC
          cleanupRacers();
          if (extractionWindow && !extractionWindow.isDestroyed()) {
            extractionWindow.close();
          }
          extractionWindow = null;
        }
      }, 60000);
    },
  );

  ipcMain.on('stop-live-bridge', () => {
    log.info('[live-bridge] Stopping all extraction processes.');
    cleanupRacers();
    if (extractionWindow && !extractionWindow.isDestroyed()) {
      extractionWindow.close();
      extractionWindow = null;
    }
    capturedKeys.clear();
    _lastEventSender = null;
    streamCookies = '';
    streamUrl = '';
  });
}

module.exports = { setupLiveBridge };

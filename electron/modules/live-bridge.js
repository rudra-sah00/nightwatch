const { ipcMain, BrowserWindow, net } = require('electron');
const http = require('node:http');
const _https = require('node:https');
const url = require('node:url');

let extractionWindow = null;
let proxyServer = null;
let proxyPort = 0;
let streamCookies = '';
let streamUrl = '';
let targetUrl = '';
let _navigateReferer = 'https://funsday.cfd/'; // Updated dynamically on each bridge start
let _channelIdState = null;
let _lastEventSender = null; // Stored for proxy crash recovery
const capturedKeys = new Map();

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
          return `http://localhost:${proxyPort}/proxy?url=${encodeURIComponent(match)}&ext=.ts`;
        });
        m3u8Text = m3u8Text.replace(/URI="(\/[^"]+)"/g, (_match, p) => {
          return `URI="http://localhost:${proxyPort}/proxy?url=${encodeURIComponent(fetchOrigin + p)}"`;
        });
        m3u8Text = m3u8Text.replace(/^(\/[^\s]+)$/gm, (_match, p) => {
          return `http://localhost:${proxyPort}/proxy?url=${encodeURIComponent(fetchOrigin + p)}&ext=.ts`;
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

      const parsedUrl = new URL(targetQueryUrl);
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

  // Auto-restart the proxy if it crashes (e.g. EADDRINUSE or uncaught ECONNRESET)
  proxyServer.on('error', (err) => {
    console.error(
      '[live-bridge] Proxy server error, restarting...',
      err.message,
    );
    proxyServer = null;
    proxyPort = 0;
    startProxyServer(_lastEventSender);
  });

  return proxyServer;
}

function setupLiveBridge() {
  ipcMain.on('start-live-bridge', async (event, { url, channelId }) => {
    _lastEventSender = event.sender;

    if (extractionWindow) {
      extractionWindow.close();
    }

    // Clear previous state
    streamUrl = '';
    targetUrl = url;
    _channelIdState = channelId;
    capturedKeys.clear();
    streamCookies = '';

    const navigateUrl = targetUrl.replace(
      /^https?:\/\/[^/]*daddylive[^/]*/i,
      'https://dlstreams.top',
    );

    // Derive Referer dynamically from the channel page being navigated to
    try {
      _navigateReferer = `${new URL(navigateUrl).origin}/`;
    } catch {
      _navigateReferer = 'https://funsday.cfd/';
    }

    // Ensure proxy server is running
    startProxyServer(event.sender);

    extractionWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:live-bridge',
        autoplayPolicy: 'document-user-activation-required',
        backgroundThrottling: false,
      },
    });

    const autoCloseTimeout = setTimeout(() => {
      if (extractionWindow && !extractionWindow.isDestroyed()) {
        extractionWindow.close();
      }
    }, 45000);

    let hasResolved = false;

    extractionWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const foundUrl = details.url;
        const type = details.resourceType || 'unknown';

        if (
          ['image', 'media', 'font', 'image/webp', 'image/jpeg'].includes(
            type,
          ) ||
          (type === 'stylesheet' && !foundUrl.includes('mono.css'))
        ) {
          return callback({ cancel: true });
        }

        if (foundUrl.includes('ad') || foundUrl.includes('track')) {
          return callback({ cancel: false });
        }

        if (foundUrl.includes('mono.css')) {
          streamUrl = foundUrl; // Set state for proxy

          clearTimeout(autoCloseTimeout);

          extractionWindow.webContents.session.cookies
            .get({ url: foundUrl })
            .then(async (cookies) => {
              if (streamUrl === url || hasResolved) return; // Prevent multiple emissions for same URL

              hasResolved = true;
              streamCookies = cookies
                .map((c) => `${c.name}=${c.value}`)
                .join('; ');

              // Instead of returning the raw HLS URL, return the local proxy URL!!!
              const proxyM3u8 = `http://127.0.0.1:${proxyPort}/playlist.m3u8?t=${Date.now()}`;

              event.sender.send('live-bridge-resolved', {
                originalUrl: url,
                channelId,
                hlsUrl: proxyM3u8,
                headers: {
                  Cookie: streamCookies,
                  Referer: navigateUrl,
                },
              });

              // Leave extractionWindow open so the proxy can use its session cache implicitly if needed
              setTimeout(() => {
                if (extractionWindow && !extractionWindow.isDestroyed()) {
                  extractionWindow.webContents.setAudioMuted(true);
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
                    extractionWindow.webContents.mainFrame.framesInSubtree.forEach(
                      (frame) => {
                        frame.executeJavaScript(pauseCode).catch(() => {});
                      },
                    );
                  } catch (_e) {}
                  extractionWindow.minimize();
                }
              }, 1000);
            })
            .catch(() => {});
        }

        callback({ cancel: false });
      },
    );

    try {
      await extractionWindow.webContents.session.clearCache();
      if (extractionWindow && !extractionWindow.isDestroyed()) {
        await extractionWindow.loadURL(navigateUrl);
      }
    } catch (_err) {}

    const currentWindow = extractionWindow;
    currentWindow.on('closed', () => {
      if (extractionWindow === currentWindow) {
        extractionWindow = null;
      }
    });
  });

  ipcMain.on('stop-live-bridge', () => {
    if (extractionWindow) {
      extractionWindow.close();
    }
  });
}

module.exports = { setupLiveBridge };

const { ipcMain, BrowserWindow } = require('electron');

let extractionWindow = null;

function setupLiveBridge() {
  ipcMain.on('start-live-bridge', (event, { url, channelId, referer }) => {
    if (extractionWindow) {
      extractionWindow.close();
    }

    extractionWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      show: false, // Headless
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Bypass CORS to read m3u8
        partition: 'persist:live-bridge',
      },
    });

    // Simple network interceptor to hunt for .m3u8 files
    extractionWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['*://*/*.m3u8*', '*://*/*.m3u8'] },
      (details, callback) => {
        const foundUrl = details.url;
        // Don't intercept ad/tracking m3u8s (basic heuristic)
        if (foundUrl.includes('ad') || foundUrl.includes('track')) {
          return callback({ cancel: false });
        }

        console.log('[LiveBridge] Found m3u8:', foundUrl);

        // Send it back to the Next.js React frontend
        event.sender.send('live-bridge-resolved', {
          originalUrl: url,
          channelId,
          hlsUrl: foundUrl,
        });

        callback({ cancel: false }); // Let it load, or cancel it once we get what we need.
      },
    );

    // Provide referer if needed for DaddyLive
    const extraHeaders = referer ? `Referer: ${referer}\n` : '';
    extractionWindow.loadURL(url, { extraHeaders });

    extractionWindow.on('closed', () => {
      extractionWindow = null;
    });
  });

  ipcMain.on('stop-live-bridge', () => {
    if (extractionWindow) {
      extractionWindow.close();
    }
  });
}

module.exports = { setupLiveBridge };

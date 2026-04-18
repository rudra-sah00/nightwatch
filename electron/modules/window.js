const {
  BrowserWindow,
  shell,
  session,
  TouchBar,
  app,
  net,
} = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar || {};
const windowStateKeeper = require('electron-window-state');

// Ensure native right-click menus are enabled
(async () => {
  const contextMenuModule = await import('electron-context-menu');
  const contextMenu = contextMenuModule.default || contextMenuModule;
  contextMenu({
    showSaveImageAs: true,
    showInspectElement: !app.isPackaged,
    showSearchWithGoogle: false,
  });
})();

class AppWindow {
  constructor() {
    this.mainWindow = null;
    this.isQuitting = false;
    this._devAppUrl = null; // Cached dev URL after port detection
  }

  // Probes available ports so the app loads even when Next.js moves off :3000
  async _detectDevPort() {
    if (this._devAppUrl) return this._devAppUrl;
    const candidatePorts = [3000, 3001, 3002, 3003, 3004];
    for (const port of candidatePorts) {
      try {
        const res = await net.fetch(`http://localhost:${port}`, {
          method: 'HEAD',
          bypassCustomProtocolHandlers: true,
        });
        // Accept any non-server-error response — Next.js returns 200 on the root
        if (res.status < 500) {
          this._devAppUrl = `http://localhost:${port}`;
          return this._devAppUrl;
        }
      } catch {
        // Port not listening yet, try next
      }
    }
    return 'http://localhost:3000'; // last-resort fallback
  }

  create() {
    const mainWindowState = windowStateKeeper({
      defaultWidth: 1280,
      defaultHeight: 800,
    });

    this.mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      autoHideMenuBar: true,
      minWidth: 800,
      minHeight: 540,

      // Frameless Window Customizations (macOS Traffic Lights + Win11 Snap Layouts)
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden', // 'hiddenInset' pushes macOS buttons slightly down for better centering, while Win uses 'hidden' with overlays.
      titleBarOverlay:
        process.platform === 'win32'
          ? {
              color: '#09090b', // Dark tailwind background matching Next.js
              symbolColor: '#ffffff', // White Windows symbols (X, □, -)
              height: 32, // Standard native height
            }
          : false, // Mac uses traffic lights automatically on 'hidden'

      show: false, // Prevents white flash via ready-to-show
      backgroundColor: '#09090b', // Matches dark mode themes
      webPreferences: {
        sandbox: true, // Enables OS-level Chromium sandboxing
        nodeIntegration: false,
        contextIsolation: true,
        spellcheck: true,
        backgroundThrottling: false, // CRITICAL: Prevents video/audio desync when app is minimized!
        devTools: !require('electron').app.isPackaged,
        // Securely inject desktop APIs to Nextjs React
        preload: require('node:path').join(__dirname, '../preload.js'),
      },
    });

    // Custom User Agent to inform Next.js that the user is running the Desktop App
    // (You can check this in Next.js via navigator.userAgent.includes('WatchRudraDesktop'))
    /* 
      DO NOT MODIFY USER AGENT: Cloudflare Turnstile explicitly blocks custom padded
      User Agents as "Bot" activity, preventing Electron logins. We use window.electronAPI instead.
      const defaultUserAgent = this.mainWindow.webContents.userAgent;
      this.mainWindow.webContents.userAgent = `${defaultUserAgent} WatchRudraDesktop/1.0.0`;
    */

    mainWindowState.manage(this.mainWindow);
    // Dynamic Media and Desktop permission handler
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        // Allowed desktop permissions (Removed screen sharing display-capture per request)
        const allowedPermissions = [
          'media',
          'camera',
          'microphone',
          'notifications',
          'clipboard-sanitized-write',
          'fullscreen', // ALLOW STREAMING PLAYERS TO FULLSCREEN
        ];
        if (allowedPermissions.includes(permission)) {
          callback(true);
        } else {
          callback(false);
        }
      },
    );

    const isDev =
      process.env.NODE_ENV === 'development' ||
      !require('electron').app.isPackaged;
    const PROD_URL = 'https://watch.rudrasahoo.live';

    if (isDev) {
      // Async port probe — do not block window creation
      this._detectDevPort().then((url) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.loadURL(url);
        }
      });
    } else {
      this.mainWindow.loadURL(PROD_URL);
    }

    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      // Prevent drag-and-drop local file exploits
      if (url.startsWith('file://')) {
        event.preventDefault();
        return;
      }

      if (
        !url.startsWith(isDev ? 'http://localhost' : PROD_URL) &&
        !url.startsWith('watch-rudra://')
      ) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    this.mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, _errorDescription) => {
        // DNS / Connection errors (-199 to -100): In dev, this usually means
        // Next.js hasn't started yet. Retry after a short delay.
        if (isDev && errorCode >= -199 && errorCode <= -100) {
          setTimeout(() => {
            this._detectDevPort().then((url) => {
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.loadURL(url);
              }
            });
          }, 2000);
        }
      },
    );

    this.mainWindow.once('ready-to-show', () => {
      // Premium Fade-in Transition (#12)
      this.mainWindow.setOpacity(0);
      this.mainWindow.show();

      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.1;
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.setOpacity(opacity);
        }
        if (opacity >= 1) clearInterval(fadeInterval);
      }, 30);

      // Only open DevTools automatically in local development builds
      if (!require('electron').app.isPackaged) {
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // Auto-reload on renderer crash (avoids blank white screen stuck state)
    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      if (details.reason !== 'clean-exit') {
        require('electron-log').warn(
          '[window] Renderer crashed:',
          details.reason,
          '— reloading',
        );
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.reload();
          }
        }, 1000);
      }
    });

    // --- AUTO-PICTURE-IN-PICTURE (PiP) EMITTERS ---
    // Let Next.js know when the user clicks away, so it can enter a mini-player
    this.mainWindow.on('blur', () => {
      this.mainWindow.webContents.send('window-blur');
    });

    this.mainWindow.on('focus', () => {
      this.mainWindow.webContents.send('window-focus');
    });

    // Minimize to tray on close for macOS (standard behavior), but quit on Windows/Linux
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        if (process.platform === 'darwin') {
          event.preventDefault();
          this.mainWindow.hide();
        } else {
          // Allow the window to close normally, which triggers window-all-closed and app.quit()
        }
      }
    });

    // --- MAC TOUCH BAR SETUP ---
    if (process.platform === 'darwin' && TouchBarButton) {
      const playPauseButton = new TouchBarButton({
        label: 'Play/Pause',
        backgroundColor: '#09090b',
        click: () =>
          this.mainWindow.webContents.send('media-command', 'MediaPlayPause'),
      });
      const micButton = new TouchBarButton({
        label: 'Toggle Mic',
        backgroundColor: '#780016',
        click: () =>
          this.mainWindow.webContents.send('media-command', 'toggle-ptt'),
      });

      const touchBar = new TouchBar({
        items: [
          playPauseButton,
          new TouchBarSpacer({ size: 'flexible' }),
          micButton,
        ],
      });
      this.mainWindow.setTouchBar(touchBar);
    }

    return this.mainWindow;
  }

  getInstance() {
    return this.mainWindow;
  }

  setQuitting(value) {
    this.isQuitting = value;
  }
}

module.exports = new AppWindow();

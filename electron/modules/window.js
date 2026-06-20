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
const { PROD_URL, PROD_URL_WWW } = require('./constants');

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
      icon: require('node:path').join(__dirname, '../build/icon.png'),

      // Frameless Window Customizations (macOS Traffic Lights + Custom Win Controls)
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: false,

      show: false, // Prevents white flash via ready-to-show
      backgroundColor: '#09090b', // Matches dark mode themes
      webPreferences: {
        sandbox: true, // Enables OS-level Chromium sandboxing
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        spellcheck: true,
        backgroundThrottling: true, // Enabled by default; disabled via IPC when media is playing
        devTools: !require('electron').app.isPackaged,
        // Securely inject desktop APIs to Nextjs React
        preload: require('node:path').join(__dirname, '../preload.js'),
      },
    });

    // Custom User Agent to inform Next.js that the user is running the Desktop App
    // (You can check this in Next.js via navigator.userAgent.includes('NightwatchDesktop'))
    /* 
      DO NOT MODIFY USER AGENT: Cloudflare Turnstile explicitly blocks custom padded
      User Agents as "Bot" activity, preventing Electron logins. We use window.electronAPI instead.
      const defaultUserAgent = this.mainWindow.webContents.userAgent;
      this.mainWindow.webContents.userAgent = `${defaultUserAgent} NightwatchDesktop/1.0.0`;
    */

    mainWindowState.manage(this.mainWindow);
    // Dynamic Media and Desktop permission handler
    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        // Only grant permissions to our own app origin
        const requestUrl = webContents.getURL();
        const isOwnOrigin =
          requestUrl.startsWith(PROD_URL) ||
          requestUrl.startsWith('http://localhost');

        const allowedPermissions = [
          'media',
          'camera',
          'microphone',
          'notifications',
          'clipboard-sanitized-write',
          'fullscreen',
        ];
        if (isOwnOrigin && allowedPermissions.includes(permission)) {
          callback(true);
        } else {
          callback(false);
        }
      },
    );

    const isDev =
      (process.env.NODE_ENV === 'development' ||
        !require('electron').app.isPackaged) &&
      !process.env.TEST_PROD;
    const effectiveProdUrl = process.env.TEST_PROD
      ? 'http://localhost:3000'
      : PROD_URL;

    const isInternalUrl = (url) =>
      url.startsWith(isDev ? 'http://localhost' : effectiveProdUrl) ||
      url.startsWith(PROD_URL_WWW) ||
      url.startsWith('nightwatch://');

    if (isDev) {
      // Async port probe — do not block window creation
      this._detectDevPort().then((url) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.loadURL(url);
        }
      });
    } else {
      // Production: load the remote app.
      this.mainWindow.loadURL(effectiveProdUrl);
    }

    // Forward Escape key to renderer even when an iframe has focus
    this.mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        this.mainWindow.webContents.send('global-escape-pressed');
      }
    });

    // Intercept window.open() / target="_blank" — open external links in default browser
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isInternalUrl(url)) {
        this.mainWindow.loadURL(url);
      } else {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      // Prevent drag-and-drop local file exploits
      if (url.startsWith('file://')) {
        event.preventDefault();
        return;
      }

      if (!isInternalUrl(url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // --- ESCALATING RECOVERY LADDER ---
    // Level 1: first load failure → simple retry after delay
    // Level 2: second failure → clear cache, reload from PROD_URL
    // Level 3+: stop retrying
    let loadFailures = 0;

    this.mainWindow.webContents.on(
      'did-fail-load',
      async (_event, errorCode, _errorDescription, _url, isMainFrame) => {
        if (!isMainFrame) return; // Ignore sub-resource failures

        if (isDev) {
          if (errorCode >= -199 && errorCode <= -100) {
            setTimeout(() => {
              this._detectDevPort().then((url) => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  this.mainWindow.loadURL(url);
                }
              });
            }, 2000);
          }
          return;
        }

        loadFailures++;
        const log = require('electron-log');
        log.warn(
          `[window] Load failed (attempt ${loadFailures}, code ${errorCode})`,
        );

        if (loadFailures <= 2) {
          // Retry after a short delay
          setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.loadURL(effectiveProdUrl);
            }
          }, 2000);
        } else if (loadFailures === 3) {
          // Clear cache and retry
          log.info('[window] Clearing cache for recovery');
          const ses = require('electron').session.defaultSession;
          try {
            await ses.clearCodeCaches({ urls: [] });
            await ses.clearCache();
          } catch (_e) {}
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.loadURL(effectiveProdUrl);
          }
        }
        // Level 4+: stop retrying
      },
    );

    // Reset failure counter on successful page load
    this.mainWindow.webContents.on('did-finish-load', () => {
      loadFailures = 0;
    });

    this.mainWindow.once('ready-to-show', () => {
      // Premium Fade-in Transition (#12)
      this.mainWindow.setOpacity(0);
      this.mainWindow.show();

      let opacity = 0;
      const fadeInterval = setInterval(() => {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          clearInterval(fadeInterval);
          return;
        }
        opacity += 0.1;
        this.mainWindow.setOpacity(opacity);
        if (opacity >= 1) clearInterval(fadeInterval);
      }, 30);

      // Only open DevTools automatically in local development builds
      if (!require('electron').app.isPackaged) {
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // --- RENDERER CRASH RECOVERY ---
    // Tracks consecutive crashes. After 3, clears all caches (auto-recovery).
    // Prevents infinite crash-reload loops that plagued macOS Tahoe.
    let rendererCrashes = 0;

    this.mainWindow.webContents.on(
      'render-process-gone',
      async (_event, details) => {
        if (details.reason === 'clean-exit') return;

        rendererCrashes++;
        const log = require('electron-log');
        log.warn(
          `[window] Renderer crashed: ${details.reason} (crash #${rendererCrashes})`,
        );

        if (rendererCrashes >= 3) {
          // Auto-recovery: nuke caches and reload fresh
          log.info('[window] 3 consecutive crashes — entering recovery mode');
          const ses = require('electron').session.defaultSession;
          try {
            await ses.clearStorageData({
              storages: ['serviceworkers', 'cachestorage'],
            });
            await ses.clearCodeCaches({ urls: [] });
            await ses.clearCache();
          } catch (_e) {}
          rendererCrashes = 0;
        }

        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.reload();
          }
        }, 1500);
      },
    );

    // --- STARTUP HEALTH CHECK ---
    // Tracks whether the page successfully loaded and rendered.
    // The 'app-ready' IPC from the React app resets the crash counter
    // in main.js. Here we just ensure did-finish-load resets loadFailures
    // and rendererCrashes so the escalation ladder works per-session.

    // --- NATIVE FULLSCREEN STATE TRACKING ---
    // macOS fires 'blur' on the BrowserWindow during the OS fullscreen animation.
    // Track fullscreen state so blur/focus handlers can guard against spurious events.
    let _isNativeFullscreen = false;
    // A small grace period after leaving fullscreen to absorb any trailing blur.
    let fullscreenExitGraceTimer = null;

    this.mainWindow.on('enter-full-screen', () => {
      _isNativeFullscreen = true;
      if (fullscreenExitGraceTimer) {
        clearTimeout(fullscreenExitGraceTimer);
        fullscreenExitGraceTimer = null;
      }
      this.mainWindow.webContents.send('window-fullscreen-changed', true);
    });

    this.mainWindow.on('leave-full-screen', () => {
      // Keep the flag set for a short grace period — the 'blur' from the OS
      // fullscreen exit animation may arrive up to ~200 ms after this event.
      fullscreenExitGraceTimer = setTimeout(() => {
        _isNativeFullscreen = false;
        fullscreenExitGraceTimer = null;
      }, 300);
      this.mainWindow.webContents.send('window-fullscreen-changed', false);
    });

    // --- AUTO-FOCUS/BLUR EMITTERS ---
    // Let Next.js know when the user clicks away or returns.
    this.mainWindow.on('blur', () => {
      if (this.callActive) return;
      this.mainWindow.webContents.send('window-blur');
    });

    this.mainWindow.on('focus', () => {
      this.mainWindow.webContents.send('window-focus');
    });

    // Minimize to tray on close for all platforms (standard behavior)
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
        // Clear Discord presence when hiding to tray
        try {
          const discord = require('./discord.js');
          discord.destroy();
        } catch (_e) {}
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

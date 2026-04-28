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
        spellcheck: true,
        backgroundThrottling: false, // CRITICAL: Prevents video/audio desync when app is minimized!
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
          requestUrl.startsWith('https://nightwatch.in') ||
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
    const PROD_URL = process.env.TEST_PROD
      ? 'http://localhost:3000'
      : 'https://nightwatch.in';
    const PROD_URL_WWW = 'https://www.nightwatch.in';

    const isInternalUrl = (url) =>
      url.startsWith(isDev ? 'http://localhost' : PROD_URL) ||
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
      // Production: load the remote app. On first visit (online) the Serwist
      // service worker installs and caches the full app shell. On subsequent
      // launches — even offline — the SW serves every route from cache.
      this.mainWindow.loadURL(PROD_URL);
    }

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
      // Prevent drag-and-drop local file exploits, but explicitly ALLOW our
      // internal offline bridge so it can actually load when disconnected.
      if (url.startsWith('file://')) {
        if (
          !url.endsWith('offline-bridge.html') &&
          !url.endsWith('offline.html')
        ) {
          event.preventDefault();
        }
        return; // Allow the bridge file to load, skip external browser check
      }

      if (!isInternalUrl(url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // --- ESCALATING RECOVERY LADDER ---
    // Level 0: did-finish-load → start health check timer
    // Level 1: first load failure → simple retry
    // Level 2: second failure → clear SW + cache, reload from PROD_URL
    // Level 3: third failure → load local offline bridge (stop retrying)
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

        if (loadFailures === 1) {
          // Level 1: Try the offline bridge (triggers SW fetch handler)
          const bridgePath = require('node:path').join(
            __dirname,
            '../build/offline-bridge.html',
          );
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.loadFile(bridgePath, {
              search: `url=${encodeURIComponent(PROD_URL)}`,
            });
          }
        } else if (loadFailures === 2) {
          // Level 2: SW is broken — nuke it and retry from network
          log.info('[window] Clearing SW + cache for recovery');
          const ses = require('electron').session.defaultSession;
          try {
            await ses.clearStorageData({
              storages: ['serviceworkers', 'cachestorage'],
            });
            await ses.clearCodeCaches({ urls: [] });
            await ses.clearCache();
          } catch (_e) {}
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.loadURL(PROD_URL);
          }
        } else {
          // Level 3: Nothing works — show local fallback, stop retrying
          const bridgePath = require('node:path').join(
            __dirname,
            '../build/offline-bridge.html',
          );
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.loadFile(bridgePath, {
              search: `url=${encodeURIComponent(PROD_URL)}&failed=1`,
            });
          }
        }
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
    // Without this guard, that spurious blur triggers Auto-PiP mid-transition,
    // causing a visible snap to the 480×270 PiP size before snapping back.
    let isNativeFullscreen = false;
    // A small grace period after leaving fullscreen to absorb any trailing blur.
    let fullscreenExitGraceTimer = null;

    this.mainWindow.on('enter-full-screen', () => {
      isNativeFullscreen = true;
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
        isNativeFullscreen = false;
        fullscreenExitGraceTimer = null;
      }, 300);
      this.mainWindow.webContents.send('window-fullscreen-changed', false);
    });

    // --- AUTO-PICTURE-IN-PICTURE (PiP) EMITTERS ---
    // Let Next.js know when the user clicks away, so it can enter a mini-player.
    // Guard: never fire while the native fullscreen transition is in progress.
    // Debounce: suppress rapid blur/focus pairs caused by PiP setBounds() animation.
    let pipDebounceTimer = null;

    this.mainWindow.on('blur', () => {
      if (isNativeFullscreen) return;
      if (this.callActive) return;
      if (pipDebounceTimer) clearTimeout(pipDebounceTimer);
      pipDebounceTimer = setTimeout(() => {
        this.mainWindow.webContents.send('window-blur');
      }, 150);
    });

    this.mainWindow.on('focus', () => {
      if (pipDebounceTimer) {
        clearTimeout(pipDebounceTimer);
        pipDebounceTimer = null;
      }
      // Delay focus event slightly so the PiP→fullsize resize animation
      // completes before the renderer repaints — prevents macOS traffic
      // light blinking caused by layout thrash during the animation.
      pipDebounceTimer = setTimeout(() => {
        this.mainWindow.webContents.send('window-focus');
        pipDebounceTimer = null;
      }, 100);
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

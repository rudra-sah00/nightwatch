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
      (webContents, permission, callback) => {
        // Only grant permissions to our own app origin
        const requestUrl = webContents.getURL();
        const isOwnOrigin =
          requestUrl.startsWith('https://watch.rudrasahoo.live') ||
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
      : 'https://watch.rudrasahoo.live';

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

      if (
        !url.startsWith(isDev ? 'http://localhost' : PROD_URL) &&
        !url.startsWith('watch-rudra://')
      ) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Track consecutive load failures so we don't loop forever
    let offlineRetries = 0;
    this.mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, _errorDescription) => {
        if (isDev) {
          // DNS / Connection errors in dev usually mean Next.js hasn't started yet.
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

        // Production offline handling.
        // Electron's BrowserWindow.loadURL() completely bypasses Service Workers
        // if the physical network adapter is disconnected (ERR_INTERNET_DISCONNECTED).
        // To fix this, we load a local bridge file. The bridge performs a
        // renderer-initiated location.replace(), which correctly triggers
        // the Service Worker to serve the cached app.
        const isNetworkError = errorCode >= -199 && errorCode <= -100;
        if (isNetworkError) {
          if (offlineRetries === 0) {
            offlineRetries++;
            const path = require('node:path');
            const bridgePath = path.join(
              __dirname,
              '../build/offline-bridge.html',
            );

            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.loadFile(bridgePath, {
                search: `url=${encodeURIComponent(PROD_URL)}`,
              });
            }
          } else if (offlineRetries === 1) {
            // The bridge's location.replace also failed (SW not installed).
            // Prevent fallback to chrome-error:// by reloading bridge with failed flag.
            offlineRetries++;
            const path = require('node:path');
            const bridgePath = path.join(
              __dirname,
              '../build/offline-bridge.html',
            );

            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.loadFile(bridgePath, {
                search: `url=${encodeURIComponent(PROD_URL)}&failed=1`,
              });
            }
          }
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
    this.mainWindow.on('blur', () => {
      if (isNativeFullscreen) return; // suppress — this blur is the OS animation
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

// Suppress EPIPE errors from electron-log when stdout pipe is closed
process.stdout?.on?.('error', () => {});
process.stderr?.on?.('error', () => {});

// --- GLOBAL CRASH HANDLERS ---
// Log fatal errors that would otherwise crash silently or show an unhelpful dialog
process.on('uncaughtException', (err) => {
  try {
    require('electron-log').error('[fatal] Uncaught exception:', err);
  } catch {
    /* ignore */
  }
});
process.on('unhandledRejection', (reason) => {
  try {
    require('electron-log').error('[fatal] Unhandled rejection:', reason);
  } catch {
    /* ignore */
  }
});

const { app, globalShortcut, BrowserWindow } = require('electron');
const _path = require('node:path');

// --- LOAD .env FOR ELECTRON MAIN PROCESS ---
// Next.js only loads .env for the renderer/server. The Electron main process
// needs its own loader so variables like DISCORD_CLIENT_ID are available.
(() => {
  const fs = require('node:fs');
  const envPath = _path.join(__dirname, '..', '.env');
  try {
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_e) {}
})();
/** @type {any} */
let store;

/**
 * electron-store v11 is ESM-only. Since electron/ is CJS, we use a two-phase approach:
 * Phase 1: Read config.json directly for synchronous startup needs (disable-gpu check).
 * Phase 2: Async-import the real electron-store before app.whenReady, so all IPC
 *          handlers use the real instance with full get/set/delete support.
 */
const _storeReady = (async () => {
  // Phase 1: Sync read for pre-ready config access
  const fs = require('node:fs');
  const path = require('node:path');
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const data = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : {};
    store = { get: (k) => data[k], set: () => {}, delete: () => {} };
  } catch {
    store = { get: () => undefined, set: () => {}, delete: () => {} };
  }

  // Phase 2: Load real electron-store (async import for ESM package)
  const { default: Store } = await import('electron-store');
  store = new Store();
})();

const AppWindow = require('./modules/window.js');
const { handleDeepLink } = require('./modules/deep-link.js');
const { setupTray } = require('./modules/tray.js');
const discordLogic = require('./modules/discord.js');
const { setupUpdater } = require('./modules/updater.js');
const { createSplash } = require('./modules/splash.js');
const { getAppVersion } = require('./modules/version.js');
const { PROD_URL } = require('./modules/constants.js');
const { registerIpcHandlers } = require('./modules/ipc-handlers.js');

// Import platform specific logic cleanly decoupled
const macOS = require('./platform/macos.js');
const windows = require('./platform/windows.js');
const linux = require('./platform/linux.js');

// --- 0. HARDWARE ACCELERATION TOGGLE (Crucial for weird GPU video green-screen bugs) ---
// If a user has a command line flag --disable-gpu or saves a local setting, we fall back to CPU video decoding.
if (
  process.argv.includes('--disable-gpu') ||
  store.get('disable-gpu') === true
) {
  app.disableHardwareAcceleration();
}

// --- 1. SINGLE INSTANCE LOCK ---
// Prevent multiple copies of the desktop app opening at the exact same time
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

// --- 1.5 HARDWARE ACCELERATION & VIDEO ENHANCEMENTS ---
// Forces Chromium to offload video streaming computation to the dedicated graphics card (GPU/VRAM)
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Saves memory by not copying video textures across backend/frontend process lines
app.commandLine.appendSwitch('enable-zero-copy');

// --- 2. DEEP LINK URL REGISTRATION ---
// Tells the Host OS that "nightwatch://" should be handled by this Electron binary
windows.registerProtocol();
linux.registerProtocol();

let internalAppIsQuitting = false;
let listenersBootstrapped = false;
let ipcCleanup = null;

const triggerDeepLink = (url) => handleDeepLink(url, AppWindow.getInstance());

const startElectronApp = async () => {
  // --- PENDING ASAR SWAP (Windows) ---
  // On Windows the running app.asar is file-locked, so ASAR updates are staged
  // as app.asar.pending. Apply the swap before anything reads from the ASAR.
  if (app.isPackaged) {
    const _fs = require('node:fs');
    const asarPath = _path.join(_path.dirname(app.getAppPath()), 'app.asar');
    const pendingPath = `${asarPath}.pending`;
    if (_fs.existsSync(pendingPath)) {
      try {
        _fs.renameSync(pendingPath, asarPath);
        app.relaunch();
        app.exit(0);
        return;
      } catch (err) {
        require('electron-log').error('[asar-swap] Failed:', err);
        _fs.rmSync(pendingPath, { force: true });
      }
    }
  }

  // --- CLI ESCAPE HATCH: --clear-cache ---
  // Allows users to nuke all cached data if the app is stuck.
  // Usage: Nightwatch.app --clear-cache (or Nightwatch.exe --clear-cache)
  const { session } = require('electron');
  const ses = session.defaultSession;

  if (process.argv.includes('--clear-cache')) {
    const _fs = require('node:fs');
    require('electron-log').info(
      '[cache] --clear-cache flag detected, purging all caches',
    );
    await ses.clearStorageData();
    await ses.clearCache();
    await ses.clearCodeCaches({ urls: [] });
    for (const dir of [
      'GPUCache',
      'DawnGraphiteCache',
      'DawnWebGPUCache',
      'Code Cache',
    ]) {
      const p = _path.join(app.getPath('userData'), dir);
      try {
        _fs.rmSync(p, { recursive: true, force: true });
      } catch (_e) {}
    }
  }

  // --- VERSION-GATED CACHE PURGE ---
  // On version change: clear SW registrations, CacheStorage, HTTP cache,
  // and V8 code cache. This is the Discord/VS Code pattern — a clean slate
  // per version so stale SW precache manifests or old JS bytecode can't
  // cause reload loops or white screens.
  const currentVersion = getAppVersion();
  const lastClearedVersion = store.get('sw-cleared-version');
  if (lastClearedVersion !== currentVersion) {
    try {
      await ses.clearStorageData({
        storages: ['serviceworkers', 'cachestorage'],
      });
      await ses.clearCodeCaches({ urls: [] });
      await ses.clearCache();
      store.set('sw-cleared-version', currentVersion);
    } catch (_e) {}
  }

  // SCOPED CORS FIX: Only intercept our internal backend API requests.

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  let backendOrigin;
  try {
    backendOrigin = new URL(backendUrl).origin;
  } catch {
    backendOrigin = 'http://localhost:4000';
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only modify headers for our backend — leave third-party CDN/Cloudflare headers untouched
    const isBackendRequest =
      details.url.startsWith(backendOrigin) ||
      details.url.includes('/api/stream/') ||
      details.url.includes('/api/');

    // CSP for our own app pages (nightwatch.in or localhost)
    const isAppPage =
      details.url.startsWith(PROD_URL) ||
      details.url.startsWith('http://localhost');

    // Strip out any existing CORS headers to prevent duplicate header conflicts
    const cleanedHeaders = { ...details.responseHeaders };
    const corsKeys = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-headers',
      'access-control-allow-methods',
    ];
    for (const key of Object.keys(cleanedHeaders)) {
      if (corsKeys.includes(key.toLowerCase())) {
        delete cleanedHeaders[key];
      }
    }

    // Inject Content-Security-Policy on our own HTML pages
    if (isAppPage && details.resourceType === 'mainFrame') {
      cleanedHeaders['Content-Security-Policy'] = [
        [
          "default-src 'self' https://nightwatch.in https://*.nightwatch.in",
          "script-src 'self' 'unsafe-inline' https://nightwatch.in https://*.nightwatch.in https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://nightwatch.in https://*.nightwatch.in https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          "connect-src 'self' https: wss: ws: http://localhost:*",
          "frame-src 'self' https://challenges.cloudflare.com http://localhost:9000 https://*.nightwatch.in",
          "worker-src 'self' blob:",
        ].join('; '),
      ];
    }

    if (isBackendRequest) {
      // Derive the exact origin making the request (avoids wildcard-credentials conflict)
      let requestOrigin = 'http://localhost:3000';
      const rawOrigin =
        details.requestHeaders?.Origin || details.requestHeaders?.origin;
      if (rawOrigin) {
        requestOrigin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
      } else if (details.referrer) {
        try {
          requestOrigin = new URL(details.referrer).origin;
        } catch {
          /* keep default */
        }
      }

      return callback({
        responseHeaders: {
          ...cleanedHeaders,
          // 1. Backend API Requests:
          // Match the backend's exact CORS implementation. Dynamically echo the origin
          // so `withCredentials=true` works everywhere, including localhost:3004.
          'Access-Control-Allow-Origin': [requestOrigin],
          'Access-Control-Allow-Credentials': ['true'],
          'Access-Control-Allow-Headers': [
            'Content-Type',
            'Authorization',
            'Cookie',
            'x-csrf-token',
          ],
          'Access-Control-Allow-Methods': [
            'GET',
            'POST',
            'PATCH',
            'DELETE',
            'OPTIONS',
          ],
        },
      });
    }

    // 2. Third-Party CDNs (TMDB images, streaming segments, etc.):
    // Only force CORS for known media/image CDNs that lack native CORS headers.
    // Other third-party resources keep their original headers to preserve same-origin security.
    const CORS_ALLOWED_HOSTS = [
      'image.tmdb.org',
      'i.imgur.com',
      'img.youtube.com',
      '.akamaized.net',
      '.cloudfront.net',
      '.googlevideo.com',
      'cdn.nightwatch.in',
    ];
    const needsCorsOverride = CORS_ALLOWED_HOSTS.some((host) =>
      host.startsWith('.')
        ? details.url.includes(host)
        : details.url.includes(`//${host}`),
    );

    if (needsCorsOverride) {
      callback({
        responseHeaders: {
          ...cleanedHeaders,
          'Access-Control-Allow-Origin': ['*'],
        },
      });
    } else {
      callback({ responseHeaders: cleanedHeaders });
    }
  });

  await macOS.setupMacOS();

  // --- WINDOWS & LINUX MINIMAL MENU (Enables Reload Shortcuts) ---
  if (process.platform !== 'darwin') {
    const { Menu } = require('electron');
    const menuTemplate = [
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          ...(app.isPackaged
            ? []
            : [
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
              ]),
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  }

  // Initialize Background Auto Updater with Discord-style Splash Screen
  const finishLaunch = () => {
    if (internalAppIsQuitting) return; // Prevent spawning zombie windows if user hit CMD+Q early

    // Force universal OS About Panels to show the live ASAR Javascript bundle version
    // instead of the outdated read-only version tied to the C++ native `.exe` or `.app` wrapper.
    try {
      const currentVersion = getAppVersion();
      app.setAboutPanelOptions({
        applicationName: 'Nightwatch',
        applicationVersion: currentVersion,
        version: currentVersion,
        copyright: '© 2026 Nightwatch Labs',
      });

      // NOTE: Do NOT patch Info.plist at runtime. Writing to Info.plist
      // invalidates the macOS code signature, causing SIGKILL crashes
      // (termination namespace: CODESIGNING, indicator: Invalid Page).
      // The About panel version is already set correctly via
      // app.setAboutPanelOptions() above, which is the safe approach.
    } catch (_e) {}

    // Create main UI Chromium window
    AppWindow.create();

    // Allow clicking on discord/slack links to focus the window on mac
    macOS.handleMacOSDeepLink(triggerDeepLink);
    macOS.preventDefaultQuit(); // Standard mac dock behavior

    // Start Tray Icon capabilities
    setupTray(AppWindow.getInstance(), (quitState) =>
      AppWindow.setQuitting(quitState),
    );

    // Process Windows Jump List arguments (--play-pause)
    if (process.platform === 'win32') {
      const win = AppWindow.getInstance();
      if (win) {
        if (process.argv.includes('--play-pause')) {
          win.webContents.once('did-finish-load', () => {
            win.webContents.send('media-command', 'MediaPlayPause');
          });
        }
      }
    }
  };

  if (app.isPackaged) {
    const splash = createSplash();

    setupUpdater(splash, () => {
      // Guard: splash may already be destroyed if the user force-closed it
      // (Windows task manager, macOS Force Quit) — never let that block launch.
      try {
        if (!splash.isDestroyed()) splash.close();
      } catch (err) {
        require('electron-log').warn('[main] splash.close() failed:', err);
      }
      try {
        finishLaunch();
      } catch (err) {
        require('electron-log').error('[main] finishLaunch() threw:', err);
      }
    });
  } else {
    // Skip updater in development for speed
    finishLaunch();
  }

  // --- GLOBAL OS PUSH-TO-TALK (PTT) / MEDIA KEYS ---
  // CommandOrControl+Shift+M lets a user mute the mic globally even if playing a fullscreen game.
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    const mainWindow = AppWindow.getInstance();
    if (mainWindow) {
      mainWindow.webContents.send('media-command', 'toggle-ptt');
    }
  });

  // Automatically reopen closed window when clicking dock icon if it's minimized
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) AppWindow.create();
    else {
      const win = AppWindow.getInstance();
      win.show();
      // Reconnect Discord presence when window is restored
      try {
        discordLogic.connect();
      } catch (_e) {}
    }
  });

  // Guard: only register IPC handlers once. On macOS the user can close all
  // windows (app stays in dock) and reopen via AppWindow.create() — without
  // this flag every dock-reopen would stack another copy of each handler,
  // causing duplicate Discord updates, double keep-awake toggles, etc.
  if (listenersBootstrapped) return;
  listenersBootstrapped = true;

  // --- REGISTER ALL IPC HANDLERS ---
  const cleanupIpc = registerIpcHandlers({ store, AppWindow, discordLogic });

  // Store cleanup function for before-quit
  ipcCleanup = cleanupIpc;
};

// Lifecycle Start hook — wait for both app ready AND store loaded
app
  .whenReady()
  .then(() => _storeReady)
  .then(startElectronApp);

// Prevent app from quitting when all windows are closed (tray keeps it alive)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, keep the app running in the tray
    // Users can quit via tray → "Quit Now"
  }
});

// Re-route additional instance attempts or windows URL arguments cleanly
windows.setupWindows(triggerDeepLink, () => AppWindow.getInstance());
linux.setupLinux(triggerDeepLink, () => AppWindow.getInstance());

// Lifecycle Cleanup hook
app.on('before-quit', () => {
  internalAppIsQuitting = true;
  AppWindow.setQuitting(true);
  try {
    if (ipcCleanup) ipcCleanup();
  } catch (_e) {}
  try {
    if (discordLogic && typeof discordLogic.destroy === 'function') {
      discordLogic.destroy();
    }
  } catch (_e) {}
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  // Clean up splash screen temp file
  try {
    const os = require('node:os');
    const splashPath = _path.join(os.tmpdir(), 'nightwatch-splash.html');
    require('node:fs').rmSync(splashPath, { force: true });
  } catch (_e) {}
});

// --- WINDOWS JUMP LIST (#13) ---
if (process.platform === 'win32') {
  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--play-pause',
      iconPath: process.execPath,
      iconIndex: 0,
      title: 'Play / Pause Video',
      description: 'Toggle playback',
    },
  ]);
}

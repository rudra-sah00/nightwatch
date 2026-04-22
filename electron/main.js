const {
  app,
  globalShortcut,
  BrowserWindow,
  ipcMain,
  clipboard,
  powerSaveBlocker,
  Notification,
  nativeImage,
} = require('electron');
const _path = require('node:path');
const Sentry = require('@sentry/electron/main');
const Store = require('electron-store');
const { protocol } = require('electron');

// --- PROTOCOL PRIVILEGES ---
// Ensure offline-media is treated securely like https (fixes CORS + Video tags)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'offline-media',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: false, // DO NOT let SW intercept (breaks fetch)
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// --- 0. INITIALIZE CRASH REPORTING ---
// Catches native C++ crashes (V8 Out of Memory, renderer crashes, etc.)
Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.VITE_SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    '',
  environment: app.isPackaged ? 'production' : 'development',
});

// --- 0.1. LOCAL SETTINGS STORAGE ---
// Allows the React app to read/write native JSON config bypassing localStorage limits
const store = new Store();

const AppWindow = require('./modules/window.js');
const { handleDeepLink } = require('./modules/deep-link.js');
const { setupTray } = require('./modules/tray.js');
const discordLogic = require('./modules/discord.js');
const { setupUpdater } = require('./modules/updater.js');
const { createSplash } = require('./modules/splash.js');
const { getAppVersion } = require('./modules/version.js');
const { setupLiveBridge } = require('./modules/live-bridge.js');
const {
  setupOfflineMediaProtocol,
  setupDownloadManager,
} = require('./modules/download-manager.js');

// Share the single electron-store instance with the download state module
require('./modules/downloads/state').setStore(store);

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
// Tells the Host OS that "watch-rudra://" should be handled by this Electron binary
windows.registerProtocol();
linux.registerProtocol();

let internalAppIsQuitting = false;
// Prevents IPC handlers from being registered more than once if the main
// window is destroyed and recreated (e.g. macOS dock reopen via app.on('activate')).
let listenersBootstrapped = false;
// ID for the active powerSaveBlocker so it can be cleaned up on quit
let globalPowerBlockerId = -1;

const triggerDeepLink = (url) => handleDeepLink(url, AppWindow.getInstance());

const startElectronApp = async () => {
  // Register offline-media:// protocol handler FIRST — before splash or main window.
  // This ensures downloaded HLS/MP4 content is playable the instant the React app loads.
  setupOfflineMediaProtocol();

  // Bust stale service worker cache after app updates. The old SW serves
  // cached HTML/JS indefinitely in Electron — clearing it once per version
  // forces a fresh fetch from Vercel on next load.
  const { session } = require('electron');
  const currentVersion = getAppVersion();
  const lastClearedVersion = store.get('sw-cleared-version');
  if (lastClearedVersion !== currentVersion) {
    try {
      await session.defaultSession.clearStorageData({
        storages: ['serviceworkers'],
      });
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
          // so `withCredentials=true` works everywhere, including offline-media:// or localhost:3004.
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

    // 2. Third-Party CDNs (TMDB images, DaddyLive TS fragments, etc.):
    // We force `*` so that the desktop Player and Image tags don't throw CORS failures
    // when hitting arbitrary CDNs that lack native CORS headers.
    callback({
      responseHeaders: {
        ...cleanedHeaders,
        'Access-Control-Allow-Origin': ['*'],
      },
    });
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
        applicationName: 'Watch Rudra',
        applicationVersion: currentVersion,
        version: currentVersion,
        copyright: '© Watch Rudra',
      });
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

    // Setup Live Bridge for Headless Premium Channels
    setupLiveBridge();

    // Setup Offline Download Manager for HLS segments
    setupDownloadManager();

    // Process Windows Jump List arguments (--open-downloads, --play-pause)
    if (process.platform === 'win32') {
      const win = AppWindow.getInstance();
      if (win) {
        if (process.argv.includes('--open-downloads')) {
          win.webContents.once('did-finish-load', () => {
            win.webContents.send('navigate', '/downloads');
          });
        }
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
      // Discard any PiP bounds saved from a previous session — monitor layout
      // may have changed while the window was hidden, so restoring stale coords
      // would snap the window to the wrong position or off-screen.
      prePipBounds = null;
    }
  });

  // Guard: only register IPC handlers once. On macOS the user can close all
  // windows (app stays in dock) and reopen via AppWindow.create() — without
  // this flag every dock-reopen would stack another copy of each handler,
  // causing duplicate Discord updates, double keep-awake toggles, etc.
  if (listenersBootstrapped) return;
  listenersBootstrapped = true;

  // IPC Event listener for React letting us know the user changed rooms!
  ipcMain.on('update-discord-status', (_event, presenceData) => {
    discordLogic.setActivity(presenceData);
  });

  // Native Clipboard API
  ipcMain.on('copy-to-clipboard', (_event, text) => {
    clipboard.writeText(text);
  });

  // Keep screen awake while watching media!
  // -1 = no active blocker (0 is a valid Electron blocker ID, so don't use it as sentinel)
  ipcMain.on('toggle-keep-awake', (_event, keepAwake) => {
    if (keepAwake && globalPowerBlockerId === -1) {
      globalPowerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    } else if (!keepAwake && globalPowerBlockerId !== -1) {
      powerSaveBlocker.stop(globalPowerBlockerId);
      globalPowerBlockerId = -1;
    }
  });

  // --- SMART POWER & BANDWIDTH SAVER ---
  // If the user folds their laptop or locks their PC, forcefully pause the movie and show Away on Discord!
  const triggerSleepPause = () => {
    const win = AppWindow.getInstance();
    if (win) {
      // We send 'MediaPlayPause' because if it's playing, it will pause.
      // (Note: To be entirely safe, we realistically just want to PAUSE. But standard play/pause hardware key is robust).
      win.webContents.send('media-command', 'MediaPlayPause');
      discordLogic.setActivity({
        details: 'Away (System Locked)',
        state: 'AFK from Watch Party',
      });
    }
  };

  const { powerMonitor } = require('electron');
  powerMonitor.on('suspend', triggerSleepPause);
  powerMonitor.on('lock-screen', triggerSleepPause);

  const triggerResume = () => {
    discordLogic.setActivity({
      details: 'Back Online',
      state: 'Browsing Homepage',
    });
  };
  powerMonitor.on('resume', triggerResume);
  powerMonitor.on('unlock-screen', triggerResume);

  // --- TRUE PICTURE-IN-PICTURE OS SNAP ---
  let prePipBounds = null;
  let _pipTransitioning = false;
  ipcMain.on('set-pip', (_event, isEnabled, opacityLevel = 1.0) => {
    const win = AppWindow.getInstance();
    if (!win) return;

    // Lock to prevent blur/focus events from re-triggering PiP during animation
    _pipTransitioning = true;
    setTimeout(() => {
      _pipTransitioning = false;
    }, 600);

    // Remove from taskbar when in PiP mode (feels more like a native overlay)
    win.setSkipTaskbar(isEnabled);

    const { screen } = require('electron');

    if (isEnabled) {
      // macOS: 'screen-saver' level renders above ALL fullscreen spaces and apps.
      // Windows/Linux: 'pop-up-menu' renders above normal apps but below system UI.
      // 'floating' (old value) does NOT penetrate macOS fullscreen spaces — that's the bug.
      const alwaysOnTopLevel =
        process.platform === 'darwin' ? 'screen-saver' : 'pop-up-menu';
      win.setAlwaysOnTop(true, alwaysOnTopLevel);

      // Also tell macOS to show this window on ALL fullscreen spaces + the desktop
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }

      // Hide MacOS Traffic Lights (Red/Yellow/Green window buttons) for a seamless 16:9 rectangle
      if (process.platform === 'darwin') win.setWindowButtonVisibility(false);

      // Ghost Mode Transparency
      if (opacityLevel < 1.0 && process.platform !== 'linux') {
        win.setOpacity(opacityLevel);
      }

      // Calculate Bottom-Right Corner of current monitor
      // Save bounds before we modify them so we can restore them later
      if (!prePipBounds) prePipBounds = win.getBounds();
      const winBounds = prePipBounds;
      const currentScreen = screen.getDisplayNearestPoint({
        x: winBounds.x,
        y: winBounds.y,
      });
      const { x, y, width, height } = currentScreen.workArea;

      const pipWidth = 480;
      const pipHeight = Math.round(pipWidth * (9 / 16));
      const padding = 24;

      // Ensure 16:9 aspect ratio and snap
      win.setAspectRatio(16 / 9);

      // CRITICAL: Electron clamps setBounds() to the window's minWidth/minHeight
      // (set to 800×540 in window.js). Without unlocking the minimum size first,
      // the 480×270 PIP target is silently ignored and the window stays huge.
      win.setMinimumSize(0, 0);

      win.setBounds(
        {
          x: Math.round(x + width - pipWidth - padding),
          y: Math.round(y + height - pipHeight - padding),
          width: pipWidth,
          height: pipHeight,
        },
        true,
      ); // Animate transition

      // Tell React to hide sidebars and make video true full-bleed
      win.webContents.send('pip-mode-changed', true);
    } else {
      win.setAlwaysOnTop(false);
      win.setOpacity(1.0);

      // Restore normal workspace visibility
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(false);
      }

      win.setAspectRatio(0); // unlock aspect ratio

      // Restore minimum size constraints before expanding the window back
      win.setMinimumSize(800, 540);

      if (prePipBounds) {
        win.setBounds(prePipBounds, true);
        prePipBounds = null;
      } else {
        win.setSize(1280, 800, true);
        win.center();
      }

      // Show traffic lights AFTER resize animation to prevent blinking
      if (process.platform === 'darwin') {
        setTimeout(() => {
          if (win && !win.isDestroyed()) win.setWindowButtonVisibility(true);
        }, 400);
      }

      win.webContents.send('pip-mode-changed', false);
    }
  });

  // Dock & Taskbar Badges: E.g., showing a little '3' for 3 unread party chats
  ipcMain.on('set-badge', (_event, badgeCount) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(badgeCount > 0 ? String(badgeCount) : '');
      // Bounce the dock icon if they get an important invite while minimized!
      if (badgeCount > 0) app.dock.bounce('informational');
    } else {
      // Windows / Linux Taskbar Red Badging
      const win = AppWindow.getInstance();
      if (win)
        win.setOverlayIcon(
          badgeCount > 0 ? AppWindow.trayImage : null,
          badgeCount > 0 ? `${badgeCount} unread` : '',
        );
    }
  });

  // Native Keyboard Media Keys Registration
  const mediaKeys = [
    'MediaPlayPause',
    'MediaNextTrack',
    'MediaPreviousTrack',
    'MediaStop',
  ];

  mediaKeys.forEach((key) => {
    globalShortcut.register(key, () => {
      const win = AppWindow.getInstance();
      // Send the hardware press event to the Next.js React app
      if (win) win.webContents.send('media-command', key);
    });
  });

  // Trigger Actionable Native Desktop Notifications (e.g. for Party Invites or Chat)
  ipcMain.on('show-notification', (_event, payload) => {
    if (Notification.isSupported()) {
      const { title, body, actions, replyPlaceholder, closeButtonText } =
        payload;

      const notification = new Notification({
        title,
        body,
        actions,
        replyPlaceholder,
        closeButtonText,
      });

      // Forward native click/action events back to Next.js
      notification.on('click', () => {
        AppWindow.getInstance()?.show();
        AppWindow.getInstance()?.webContents.send(
          'notification-click',
          payload,
        );
      });

      notification.on('action', (_event, index) => {
        if (actions?.[index]) {
          AppWindow.getInstance()?.show();
          AppWindow.getInstance()?.webContents.send('notification-action', {
            ...payload,
            actionSelected: actions[index].type,
          });
        }
      });

      notification.on('reply', (_event, reply) => {
        AppWindow.getInstance()?.webContents.send('notification-reply', {
          ...payload,
          reply,
        });
      });

      notification.show();
    }
  });

  // Allow users to configure the app to launch quietly when their OS Boots
  ipcMain.on('set-run-on-boot', (_event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true, // Only show in tray when automatically booting
      path: app.getPath('exe'),
    });
  });

  // --- LOCAL CONFIG STORE ---
  // Only allow the renderer to access specific keys (prevent reading internal settings)
  const ALLOWED_STORE_KEYS = new Set([
    'runOnBoot',
    'concurrentDownloads',
    'downloadSpeedLimit',
    'watch_rudra_auth',
    'disable-gpu',
  ]);
  ipcMain.handle('store-get', (_event, key) => {
    if (!ALLOWED_STORE_KEYS.has(key)) return undefined;
    return store.get(key);
  });
  ipcMain.on('store-set', (_event, key, value) => {
    if (!ALLOWED_STORE_KEYS.has(key)) return;
    store.set(key, value);
  });
  ipcMain.on('store-delete', (_event, key) => {
    if (!ALLOWED_STORE_KEYS.has(key)) return;
    store.delete(key);
  });

  // --- REAL APP VERSION (ASAR-aware) ---
  // app.getVersion() returns the native binary's compile-time version and is NOT
  // updated by electron-asar-hot-updater. We always read from package.json inside
  // the ASAR so React sees the correct version after a hot update.
  ipcMain.handle('get-app-version', () => getAppVersion());

  // --- NATIVE THEMING ---
  const { nativeTheme } = require('electron');
  ipcMain.on('set-native-theme', (_event, theme) => {
    nativeTheme.themeSource = theme; // 'light', 'dark', or 'system'
    const win = AppWindow.getInstance();
    if (win) {
      win.setBackgroundColor(theme === 'light' ? '#ffffff' : '#09090b');
    }
  });

  // --- WINDOWS TASKBAR MEDIA CONTROLS ---
  if (process.platform === 'win32') {
    const win = AppWindow.getInstance();
    if (win) {
      // Setup small media buttons underneath the taskbar thumbnail preview
      try {
        // Create 16x16 icons from the app icon for thumbnail buttons
        const iconPath = _path.join(__dirname, 'build', 'icon.png');
        const baseIcon = require('node:fs').existsSync(iconPath)
          ? nativeImage
              .createFromPath(iconPath)
              .resize({ width: 16, height: 16 })
          : nativeImage.createEmpty();

        const thumbButtons = [
          {
            tooltip: 'Previous',
            icon: baseIcon,
            flags: ['enabled'],
            click: () =>
              win.webContents.send('media-command', 'MediaPreviousTrack'),
          },
          {
            tooltip: 'Play/Pause',
            icon: baseIcon,
            flags: ['enabled'],
            click: () =>
              win.webContents.send('media-command', 'MediaPlayPause'),
          },
          {
            tooltip: 'Next',
            icon: baseIcon,
            flags: ['enabled'],
            click: () =>
              win.webContents.send('media-command', 'MediaNextTrack'),
          },
        ];
        win.setThumbarButtons(thumbButtons);
      } catch (_e) {}
    }
  }
};

// Lifecycle Start hook
app.whenReady().then(startElectronApp);

// Re-route additional instance attempts or windows URL arguments cleanly
windows.setupWindows(triggerDeepLink, () => AppWindow.getInstance());
linux.setupLinux(triggerDeepLink, () => AppWindow.getInstance());

// Lifecycle Cleanup hook
app.on('before-quit', () => {
  internalAppIsQuitting = true;
  AppWindow.setQuitting(true);
  try {
    const { powerSaveBlocker } = require('electron');
    if (globalPowerBlockerId !== -1) {
      powerSaveBlocker.stop(globalPowerBlockerId);
      globalPowerBlockerId = -1;
    }
  } catch (_e) {}
  try {
    if (discordLogic && typeof discordLogic.destroy === 'function') {
      discordLogic.destroy();
    }
  } catch (_e) {}
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// --- WINDOWS JUMP LIST (#13) ---
if (process.platform === 'win32') {
  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--open-downloads',
      iconPath: process.execPath,
      iconIndex: 0,
      title: 'Open Downloads',
      description: 'View offline media',
    },
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

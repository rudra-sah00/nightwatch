// require('v8-compile-cache');
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
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// --- 0. INITIALIZE CRASH REPORTING ---
// Catches native C++ crashes (V8 Out of Memory, renderer crashes, etc.)
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',
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
const { setupLiveBridge } = require('./modules/live-bridge.js');
const {
  setupOfflineMediaProtocol,
  setupDownloadManager,
} = require('./modules/download-manager.js');

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

const triggerDeepLink = (url) => handleDeepLink(url, AppWindow.getInstance());

const startElectronApp = async () => {
  // Register offline-media:// protocol handler FIRST — before splash or main window.
  // This ensures downloaded HLS/MP4 content is playable the instant the React app loads.
  setupOfflineMediaProtocol();

  // SCOPED CORS FIX: Only intercept our internal backend API requests.
  // Returning `*` globally breaks withCredentials (browser spec forbids wildcard +
  // credentials). We now return the exact requesting origin so cookies work.
  const { session } = require('electron');

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
      const fs = require('node:fs');
      const pkgPath = _path.join(app.getAppPath(), 'package.json');
      let currentVersion = app.getVersion();
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        currentVersion = pkg.version || app.getVersion();
      }
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
  };

  if (app.isPackaged) {
    const splash = createSplash();

    setupUpdater(splash, () => {
      if (!splash.isDestroyed()) {
        splash.close();
      }
      finishLaunch();
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
    else AppWindow.getInstance().show();
  });

  // Start Discord RPC silently in background

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
  let powerBlockerId = -1;
  ipcMain.on('toggle-keep-awake', (_event, keepAwake) => {
    if (keepAwake && powerBlockerId === -1) {
      powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    } else if (!keepAwake && powerBlockerId !== -1) {
      powerSaveBlocker.stop(powerBlockerId);
      powerBlockerId = -1;
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
  ipcMain.on('set-pip', (_event, isEnabled, opacityLevel = 1.0) => {
    const win = AppWindow.getInstance();
    if (!win) return;

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
        win.setWindowButtonVisibility(true);
      }

      win.setAspectRatio(0); // unlock aspect ratio
      if (prePipBounds) {
        win.setBounds(prePipBounds, true);
        prePipBounds = null;
      } else {
        win.setSize(1280, 800, true);
        win.center();
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
  ipcMain.handle('store-get', (_event, key) => store.get(key));
  ipcMain.on('store-set', (_event, key, value) => store.set(key, value));
  ipcMain.on('store-delete', (_event, key) => store.delete(key));

  // --- REAL APP VERSION (ASAR-aware) ---
  // app.getVersion() returns the native binary's compile-time version and is NOT
  // updated by electron-asar-hot-updater. We always read from package.json inside
  // the ASAR so React sees the correct version after a hot update.
  ipcMain.handle('get-app-version', () => {
    try {
      const fs = require('node:fs');
      const pkgPath = _path.join(app.getAppPath(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg.version || app.getVersion();
      }
    } catch (_e) {}
    return app.getVersion();
  });

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
        const thumbButtons = [
          {
            tooltip: 'Previous',
            icon: nativeImage.createEmpty(), // Replace with real asset when ready
            flags: ['enabled'],
            click: () =>
              win.webContents.send('media-command', 'MediaPreviousTrack'),
          },
          {
            tooltip: 'Play/Pause',
            icon: nativeImage.createEmpty(),
            flags: ['enabled'],
            click: () =>
              win.webContents.send('media-command', 'MediaPlayPause'),
          },
          {
            tooltip: 'Next',
            icon: nativeImage.createEmpty(),
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

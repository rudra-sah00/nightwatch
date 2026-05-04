const {
  app,
  ipcMain,
  clipboard,
  powerSaveBlocker,
  Notification,
  nativeImage,
  globalShortcut,
} = require('electron');
const _path = require('node:path');
const log = require('electron-log');
const { PROD_URL } = require('./constants');
const { getAppVersion } = require('./version');

/**
 * Registers all IPC handlers between the renderer (preload) and main process.
 *
 * Extracted from main.js for readability. Called once after the main window is
 * created — guarded by `listenersBootstrapped` in main.js to prevent duplicates.
 *
 * @param {object} deps - Shared dependencies from main.js
 * @param {object} deps.store - electron-store instance
 * @param {object} deps.AppWindow - AppWindow singleton
 * @param {object} deps.discordLogic - Discord RPC integration
 */
function registerIpcHandlers({ store, AppWindow, discordLogic }) {
  let globalPowerBlockerId = -1;

  // --- STARTUP HEALTH CHECK ---
  ipcMain.on('app-ready', () => {
    store.set('consecutive-crashes', 0);
    log.info('[health] App ready — crash counter reset');
  });

  // --- OPEN EXTERNAL URL ---
  ipcMain.on('open-external', (_event, url) => {
    const { shell } = require('electron');
    if (
      typeof url === 'string' &&
      (url.startsWith('http://') || url.startsWith('https://'))
    ) {
      shell.openExternal(url);
    }
  });

  // --- CLEAR CACHE & RELOAD ---
  ipcMain.on('clear-cache-reload', async () => {
    const ses = require('electron').session.defaultSession;
    try {
      await ses.clearStorageData({
        storages: ['serviceworkers', 'cachestorage'],
      });
      await ses.clearCodeCaches({ urls: [] });
      await ses.clearCache();
    } catch (_e) {}
    const win = AppWindow.getInstance();
    if (win && !win.isDestroyed()) {
      win.loadURL(app.isPackaged ? PROD_URL : 'http://localhost:3000');
    }
  });

  // --- DISCORD RICH PRESENCE ---
  ipcMain.on('update-discord-status', (_event, presenceData) => {
    discordLogic.setActivity(presenceData);
  });
  ipcMain.on('clear-discord-status', () => {
    discordLogic.clearActivity();
  });

  // --- CLIPBOARD ---
  ipcMain.on('copy-to-clipboard', (_event, text) => {
    clipboard.writeText(text);
  });

  // --- KEEP AWAKE + BACKGROUND THROTTLING ---
  ipcMain.on('toggle-keep-awake', (_event, keepAwake) => {
    if (keepAwake && globalPowerBlockerId === -1) {
      globalPowerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    } else if (!keepAwake && globalPowerBlockerId !== -1) {
      powerSaveBlocker.stop(globalPowerBlockerId);
      globalPowerBlockerId = -1;
    }
    const win = AppWindow.getInstance();
    if (win && !win.isDestroyed()) {
      win.webContents.setBackgroundThrottling(!keepAwake);
    }
  });

  // --- CALL-ACTIVE FLAG ---
  ipcMain.on('set-call-active', (_event, active) => {
    AppWindow.callActive = !!active;
  });

  // --- POWER MONITOR ---
  const { powerMonitor } = require('electron');
  powerMonitor.on('suspend', () => {
    const win = AppWindow.getInstance();
    if (win) {
      win.webContents.send('media-command', 'MediaPlayPause');
      discordLogic.setActivity({
        details: 'Away (System Locked)',
        state: 'AFK from Watch Party',
      });
    }
  });
  powerMonitor.on('lock-screen', () => {
    const win = AppWindow.getInstance();
    if (win) {
      win.webContents.send('media-command', 'MediaPlayPause');
      discordLogic.setActivity({
        details: 'Away (System Locked)',
        state: 'AFK from Watch Party',
      });
    }
  });
  powerMonitor.on('resume', () => {
    discordLogic.setActivity({
      details: 'Back Online',
      state: 'Browsing Homepage',
    });
  });
  powerMonitor.on('unlock-screen', () => {
    discordLogic.setActivity({
      details: 'Back Online',
      state: 'Browsing Homepage',
    });
  });

  // --- PICTURE-IN-PICTURE ---
  let prePipBounds = null;
  ipcMain.on('set-pip', (_event, isEnabled, opacityLevel = 1.0) => {
    const win = AppWindow.getInstance();
    if (!win) return;

    win.setSkipTaskbar(isEnabled);
    const { screen } = require('electron');

    if (isEnabled) {
      const alwaysOnTopLevel =
        process.platform === 'darwin' ? 'screen-saver' : 'pop-up-menu';
      win.setAlwaysOnTop(true, alwaysOnTopLevel);
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        win.setWindowButtonVisibility(false);
      }
      if (opacityLevel < 1.0 && process.platform !== 'linux') {
        win.setOpacity(opacityLevel);
      }
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
      win.setAspectRatio(16 / 9);
      win.setMinimumSize(0, 0);
      win.setBounds(
        {
          x: Math.round(x + width - pipWidth - padding),
          y: Math.round(y + height - pipHeight - padding),
          width: pipWidth,
          height: pipHeight,
        },
        true,
      );
      win.webContents.send('pip-mode-changed', true);
    } else {
      win.setAlwaysOnTop(false);
      win.setOpacity(1.0);
      if (process.platform === 'darwin') {
        win.setVisibleOnAllWorkspaces(false);
      }
      win.setAspectRatio(0);
      win.setMinimumSize(800, 540);
      if (prePipBounds) {
        win.setBounds(prePipBounds, true);
        prePipBounds = null;
      } else {
        win.setSize(1280, 800, true);
        win.center();
      }
      if (process.platform === 'darwin') {
        setTimeout(() => {
          if (win && !win.isDestroyed()) win.setWindowButtonVisibility(true);
        }, 400);
      }
      win.webContents.send('pip-mode-changed', false);
    }
  });

  // --- DOCK & TASKBAR BADGES ---
  ipcMain.on('set-badge', (_event, badgeCount) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(badgeCount > 0 ? String(badgeCount) : '');
      if (badgeCount > 0) app.dock.bounce('informational');
    } else {
      const win = AppWindow.getInstance();
      if (win)
        win.setOverlayIcon(
          badgeCount > 0 ? AppWindow.trayImage : null,
          badgeCount > 0 ? `${badgeCount} unread` : '',
        );
    }
  });

  // --- MEDIA KEYS ---
  for (const key of [
    'MediaPlayPause',
    'MediaNextTrack',
    'MediaPreviousTrack',
    'MediaStop',
  ]) {
    globalShortcut.register(key, () => {
      const win = AppWindow.getInstance();
      if (win) win.webContents.send('media-command', key);
    });
  }

  // --- NOTIFICATIONS ---
  ipcMain.on('show-notification', (_event, payload) => {
    if (!Notification.isSupported()) return;
    const { title, body, actions, replyPlaceholder, closeButtonText } = payload;
    const notification = new Notification({
      title,
      body,
      actions,
      replyPlaceholder,
      closeButtonText,
    });
    notification.on('click', () => {
      AppWindow.getInstance()?.show();
      AppWindow.getInstance()?.webContents.send('notification-click', payload);
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
  });

  // --- RUN ON BOOT ---
  ipcMain.on('set-run-on-boot', (_event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      path: app.getPath('exe'),
    });
  });

  // --- LOCAL CONFIG STORE ---
  const ALLOWED_STORE_KEYS = new Set([
    'runOnBoot',
    'concurrentDownloads',
    'downloadSpeedLimit',
    'nightwatch_auth',
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

  // --- VERSION ---
  ipcMain.handle('get-app-version', () => getAppVersion());

  // --- FULLSCREEN ---
  ipcMain.handle('toggle-fullscreen', () => {
    const win = AppWindow.getInstance();
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  // --- CUSTOM WINDOW CONTROLS ---
  ipcMain.on('window-minimize', () => {
    const win = AppWindow.getInstance();
    if (win) win.minimize();
  });
  ipcMain.on('window-maximize', () => {
    const win = AppWindow.getInstance();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });
  ipcMain.on('window-close', () => {
    const win = AppWindow.getInstance();
    if (win) win.close();
  });

  // --- NATIVE THEMING ---
  const { nativeTheme } = require('electron');
  ipcMain.on('set-native-theme', (_event, theme) => {
    nativeTheme.themeSource = theme;
    const win = AppWindow.getInstance();
    if (win) {
      win.setBackgroundColor(theme === 'light' ? '#ffffff' : '#09090b');
    }
  });

  // --- WINDOWS TASKBAR MEDIA CONTROLS ---
  if (process.platform === 'win32') {
    const win = AppWindow.getInstance();
    if (win) {
      try {
        const iconPath = _path.join(__dirname, '../build', 'icon.png');
        const baseIcon = require('node:fs').existsSync(iconPath)
          ? nativeImage
              .createFromPath(iconPath)
              .resize({ width: 16, height: 16 })
          : nativeImage.createEmpty();
        win.setThumbarButtons([
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
        ]);
      } catch (_e) {}
    }
  }

  // Return cleanup function for before-quit
  return () => {
    if (globalPowerBlockerId !== -1) {
      powerSaveBlocker.stop(globalPowerBlockerId);
      globalPowerBlockerId = -1;
    }
  };
}

module.exports = { registerIpcHandlers };

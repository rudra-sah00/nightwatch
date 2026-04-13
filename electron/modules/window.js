const { BrowserWindow, shell, session, TouchBar } = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar || {};
const windowStateKeeper = require('electron-window-state');

// Ensure native right-click menus are enabled
(async () => {
  const contextMenuModule = await import('electron-context-menu');
  const contextMenu = contextMenuModule.default || contextMenuModule;
  contextMenu({
    showSaveImageAs: true,
    showInspectElement: true,
    showSearchWithGoogle: false,
  });
})();

class AppWindow {
  constructor() {
    this.mainWindow = null;
    this.isQuitting = false;
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
        devTools: process.env.NODE_ENV === 'development', // Lock down debugger in production
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
        ];
        if (allowedPermissions.includes(permission)) {
          callback(true);
        } else {
          console.warn(`Denied unwanted permission request: ${permission}`);
          callback(false);
        }
      },
    );

    // Catch network crashes and swap to the beautiful Offline failure screen natively
    const isDev =
      process.env.NODE_ENV === 'development' ||
      !require('electron').app.isPackaged;
    const APP_URL = isDev
      ? 'http://localhost:3000'
      : 'https://watch.rudrasahoo.live';

    // Prevent new untracked windows from spawning! Lock internal links to the MAIN electron window wrapper
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(APP_URL)) {
        this.mainWindow.loadURL(url);
        return { action: 'deny' }; // Block OS from creating an unstyled pop-up popup
      }
      // Send Discord, GitHub, external links to default OS browser
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      // Prevent drag-and-drop local file exploits
      if (url.startsWith('file://')) {
        event.preventDefault();
        return;
      }

      // Allow internal links and deep links routing, send everything else to Mac/Windows
      if (!url.startsWith(APP_URL) && !url.startsWith('watch-rudra://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    this.mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription) => {
        // DNS / Connection errors usually fall within the -100 range in Chromium
        if (errorCode >= -199 && errorCode <= -100) {
          console.warn('Network crash detected:', errorDescription);
          this.mainWindow.loadFile(
            require('node:path').join(__dirname, '../offline.html'),
          );
        }
      },
    );

    this.mainWindow.loadURL(APP_URL);

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
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
        label: '⏯ Play/Pause',
        backgroundColor: '#09090b',
        click: () =>
          this.mainWindow.webContents.send('media-command', 'MediaPlayPause'),
      });
      const micButton = new TouchBarButton({
        label: '🎙️ Toggle Mic',
        backgroundColor: '#780016', // Neo-Red warning
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

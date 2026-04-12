const { BrowserWindow, shell, session } = require('electron');
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
      titleBarStyle: 'hidden', // Required for both Mac and Win native overlays
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
    const defaultUserAgent = this.mainWindow.webContents.userAgent;
    this.mainWindow.webContents.userAgent = `${defaultUserAgent} WatchRudraDesktop/1.0.0`;

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

    // Sandbox URL safety: Open external links like Discord in OS Browser, not the App
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://watch.rudrasahoo.live')) {
        return { action: 'allow' };
      }
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
      if (
        !url.startsWith('https://watch.rudrasahoo.live') &&
        !url.startsWith('watch-rudra://')
      ) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Instead of localhost, point the compiled app to the live deployed server
    // Catch network crashes and swap to the beautiful Offline failure screen natively!
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

    this.mainWindow.loadURL('https://watch.rudrasahoo.live');

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Minimize to tray on close, instead of quitting the application completely
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
      return false;
    });

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

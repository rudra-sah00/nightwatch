const { Tray, Menu, nativeImage, app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

let appTray = null;

function setupTray(mainWindow, setQuittingCallback) {
  try {
    // Determine the icon source dynamically based on build vs dev output roots
    const rootDir =
      process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '..', '..')
        : path.join(__dirname, '..');

    // macOS needs a 18x18 PNG (36x36 @2x Retina) — .ico looks blurry on Retina displays.
    // Windows & Linux use .ico for proper taskbar rendering.
    const trayIconFile =
      process.platform === 'darwin'
        ? path.resolve(rootDir, 'public', 'tray-icon.png')
        : path.resolve(rootDir, 'public', 'favicon.ico');

    // Fallback to favicon.ico if tray-icon.png doesn't exist yet
    const resolvedIcon = fs.existsSync(trayIconFile)
      ? trayIconFile
      : path.resolve(rootDir, 'public', 'favicon.ico');

    const image = fs.existsSync(resolvedIcon)
      ? nativeImage.createFromPath(resolvedIcon)
      : nativeImage.createEmpty();

    // Mark as template image on macOS so it auto-adapts to light/dark menu bar
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }

    appTray = new Tray(image);
    appTray.setToolTip('Watch Rudra - Live Desktop');

    const contextMenuTemplate = Menu.buildFromTemplate([
      {
        label: 'Show Interface',
        click: () => {
          if (mainWindow) {
            mainWindow.restore();
            mainWindow.show();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Play / Pause Video',
        click: () =>
          mainWindow?.webContents.send('media-command', 'MediaPlayPause'),
      },
      {
        label: 'Toggle Microphone (PTT)',
        click: () =>
          mainWindow?.webContents.send('media-command', 'toggle-ptt'),
      },
      { type: 'separator' },
      {
        label: 'About Watch Rudra',
        click: () => app.showAboutPanel(),
      },
      {
        label: 'Quit Now',
        click: () => {
          setQuittingCallback(true);
          app.quit();
        },
      },
    ]);

    appTray.setContextMenu(contextMenuTemplate);

    // Single click → show window on all platforms
    appTray.on('click', () => {
      if (mainWindow) {
        mainWindow.restore();
        mainWindow.show();
      }
    });

    // macOS: double-click also shows window (matches OS conventions)
    if (process.platform === 'darwin') {
      appTray.on('double-click', () => {
        if (mainWindow) {
          mainWindow.restore();
          mainWindow.show();
        }
      });
    }
  } catch (_err) {}
}

module.exports = { setupTray };

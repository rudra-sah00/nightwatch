const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('node:path');
const log = require('electron-log');

let appTray = null;

function setupTray(mainWindow, setQuittingCallback) {
  try {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    let image = nativeImage.createFromPath(iconPath);

    if (process.platform === 'darwin') {
      // macOS menu bar needs 18x18 (36x36 @2x) template image
      image = image.resize({ width: 18, height: 18 });
      image.setTemplateImage(true);
    } else {
      // Windows/Linux tray needs 16x16 or 32x32
      image = image.resize({ width: 32, height: 32 });
    }

    appTray = new Tray(image);
    appTray.setToolTip('Nightwatch');

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
        label: 'About Nightwatch',
        click: () => app.showAboutPanel(),
      },
      {
        label: 'Check for Updates...',
        click: () => {
          try {
            const { autoUpdater } = require('electron-updater');
            autoUpdater.checkForUpdatesAndNotify();
          } catch (_e) {
            log.warn('[tray] Update check failed');
          }
        },
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

    appTray.on('click', () => {
      if (mainWindow) {
        mainWindow.restore();
        mainWindow.show();
      }
    });

    if (process.platform === 'darwin') {
      appTray.on('double-click', () => {
        if (mainWindow) {
          mainWindow.restore();
          mainWindow.show();
        }
      });
    }
  } catch (err) {
    log.warn('[tray] Failed to create system tray icon:', err.message);
  }
}

module.exports = { setupTray };

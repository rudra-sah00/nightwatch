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
    const trayIconFile = path.resolve(rootDir, 'public', 'favicon.ico');

    const image = fs.existsSync(trayIconFile)
      ? nativeImage.createFromPath(trayIconFile)
      : nativeImage.createEmpty();

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
        label: '⏯ Play/Pause Video',
        click: () =>
          mainWindow?.webContents.send('media-command', 'MediaPlayPause'),
      },
      {
        label: '🎙️ Toggle Microphone (PTT)',
        click: () =>
          mainWindow?.webContents.send('media-command', 'toggle-ptt'),
      },
      { type: 'separator' },
      {
        label: 'Quit Now',
        click: () => {
          setQuittingCallback(true);
          app.quit();
        },
      },
    ]);

    appTray.setContextMenu(contextMenuTemplate);

    // Clicking tray icon shows the main window directly
    appTray.on('click', () => {
      if (mainWindow) {
        mainWindow.restore();
        mainWindow.show();
      }
    });
  } catch (err) {
    console.warn('System tray load issue: ', err);
  }
}

module.exports = { setupTray };

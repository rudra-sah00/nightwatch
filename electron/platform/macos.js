const { systemPreferences, app, Menu } = require('electron');

async function _setupMacOS() {
  if (process.platform === 'darwin') {
    try {
      // Prompt for critical macOS media access before loading any web views
      await systemPreferences.askForMediaAccess('camera');
      await systemPreferences.askForMediaAccess('microphone');
      console.log('macOS Media Permissions Granted');
    } catch (err) {
      console.warn('macOS media permission setup error:', err);
    }

    // Setup Custom macOS Application Menu
    const menuTemplate = [
      {
        label: app.name,
        submenu: [
          { role: 'about', label: 'About Watch Rudra' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide Watch Rudra' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit Watch Rudra' },
        ],
      },
      {
        label: 'File',
        submenu: [{ role: 'close' }],
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
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  }
}

function _handleMacOSDeepLink(_url, handleDeepLinkCallback) {
  app.on('open-url', (event, openUrl) => {
    event.preventDefault();
    handleDeepLinkCallback(openUrl);
  });
}

function _preventDefaultQuit() {
  app.on('window-all-closed', () => {
    // On macOS, applications typically stay active in the dock even when all windows are closed.
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = {
  setupMacOS: _setupMacOS,
  handleMacOSDeepLink: _handleMacOSDeepLink,
  preventDefaultQuit: _preventDefaultQuit,
};

const { app } = require('electron');
const path = require('node:path');

function setupWindows(handleDeepLinkCallback, mainWindow) {
  if (process.platform !== 'win32') return;

  // Single Instance Lock handling specifically for Windows Deep Links via command arg
  app.on('second-instance', (_event, commandLine) => {
    // If the user launched a second arg via a URL deep link, catch it
    const url = commandLine.find((arg) => arg.startsWith('watch-rudra://'));
    if (url) handleDeepLinkCallback(url);

    // Keep only one primary instance running
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('watch-rudra', process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient('watch-rudra');
  }
}

module.exports = {
  setupWindows,
  registerProtocol,
};

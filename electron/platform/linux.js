const { app } = require('electron');
const path = require('node:path');

/**
 * Linux-specific setup for single-instance handling and deep links.
 * Works similarly to Windows by checking command line arguments on second-instance.
 */
function _setupLinux(handleDeepLinkCallback, getMainWindow) {
  if (process.platform !== 'linux') return;

  app.on('second-instance', (_event, commandLine) => {
    // If the user launched a second instance with a watch-rudra:// URL, catch it
    const url = commandLine.find((arg) => arg.startsWith('watch-rudra://'));
    if (url) handleDeepLinkCallback(url);

    // Focus the existing window
    const mainWindow = getMainWindow ? getMainWindow() : null;
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Registers the protocol client for the Linux desktop environment.
 */
function _registerProtocol() {
  if (process.platform !== 'linux') return;

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
  setupLinux: _setupLinux,
  registerProtocol: _registerProtocol,
};

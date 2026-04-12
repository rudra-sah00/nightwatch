const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function setupUpdater() {
  // Logger setup for debugging update issues in production
  const log = require('electron-log');
  log.transports.file.level = 'info';
  autoUpdater.logger = log;

  // We want the app to automatically download the update in the background
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    log.info('Update available. Downloading...');
  });

  autoUpdater.on('update-downloaded', (_info) => {
    // When finished downloading, prompt the user if they want to install it now or later
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message:
          'A new version of Watch Rudra has been downloaded. Restart the application to apply the updates?',
        buttons: ['Restart Now', 'Later'],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
  });

  // Start the background check for updates when the app opens
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    log.warn('Could not check for updates:', err);
  }
}

module.exports = { setupUpdater };

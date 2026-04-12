const { autoUpdater } = require('electron-updater');
const { autoUpdater: asarUpdater } = require('electron-asar-hot-updater');
const { dialog } = require('electron');
const log = require('electron-log');

function setupUpdater() {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    log.info('Update available. Downloading...');
  });

  autoUpdater.on('update-downloaded', (_info) => {
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
    log.warn('Could not check for full updates:', err);
  }

  // Setup ASAR Hot Updater
  try {
    // You will need to host a simple update.json on your server or GitHub Pages:
    // { "name": "watch-rudra", "version": "1.15.19", "asar": "https://url.watch-rudra.com/app.asar", "info": "Fixes" }
    asarUpdater.setFeedURL(
      'https://raw.githubusercontent.com/rudra-sah00/watch-rudra/main/update.json',
    );
    asarUpdater
      .checkForUpdates()
      .then((res) => {
        log.info('ASAR Hot Updater checked. Status:', res);
      })
      .catch((err) => {
        log.warn('ASAR Hot Updater warning/no-update:', err);
      });
  } catch (err) {
    log.warn('Could not check for hot updates:', err);
  }
}

module.exports = { setupUpdater };

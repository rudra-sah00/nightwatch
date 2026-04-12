const { autoUpdater } = require('electron-updater');
const { autoUpdater: asarUpdater } = require('electron-asar-hot-updater');
const log = require('electron-log');

function setupUpdater(splashWindow, onComplete) {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  let updateFinished = false;
  let asarChecked = false;

  const finish = () => {
    if (updateFinished) return;
    updateFinished = true;
    setTimeout(onComplete, 1000); // 1s buffer so user sees it finishes
  };

  const sendStatus = (text, percent) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('updater-message', text);
      if (percent !== undefined) {
        splashWindow.webContents.send('updater-progress', percent);
      }
    }
  };

  sendStatus('Checking for updates...', 10);

  // ---------- NATIVE UPDATER ----------
  autoUpdater.on('update-available', () => {
    sendStatus('Core update incoming...', 30);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatus(
      `Downloading engine ${Math.floor(progressObj.percent)}%...`,
      progressObj.percent,
    );
  });

  autoUpdater.on('update-not-available', () => {
    // If native doesn't need updating, check ASAR
    checkAsarUpdater();
  });

  autoUpdater.on('update-downloaded', () => {
    sendStatus('Installing updates...', 100);
    // Silent restart for native update
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 2000);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    checkAsarUpdater();
  });

  // ---------- ASAR HOT UPDATER ----------
  const checkAsarUpdater = () => {
    if (asarChecked) return;
    asarChecked = true;
    sendStatus('Checking resources...', 80);

    try {
      asarUpdater.setFeedURL(
        'https://raw.githubusercontent.com/rudra-sah00/watch-rudra/main/update.json',
      );
      // Monkey patch the logger of asar updater to track progress because it handles its own download
      // For now we just await the promise
      asarUpdater
        .checkForUpdates()
        .then((res) => {
          log.info('ASAR checked:', res);
          // It automatically prompts/restarts or returns null if no update.
          // Since it doesn't give fine-grained progress hooks cleanly to UI yet:
          sendStatus('Ready to launch!', 100);
          finish();
        })
        .catch((err) => {
          log.warn('ASAR update error/no-update:', err);
          sendStatus('Starting Watch Rudra...', 100);
          finish();
        });
    } catch (err) {
      log.warn('ASAR catch:', err);
      sendStatus('Loading local files...', 100);
      finish();
    }
  };

  // Kickoff Native Updater first
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    checkAsarUpdater();
  }
}

module.exports = { setupUpdater };

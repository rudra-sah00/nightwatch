const { autoUpdater } = require('electron-updater');
const { autoUpdater: asarUpdater } = require('electron-asar-hot-updater');
const { net } = require('electron');
const log = require('electron-log');

function setupUpdater(splashWindow, onComplete) {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  let updateFinished = false;
  let safetyTimer = null;
  let hardDeadlineTimer = null;
  let asarChecked = false;

  const finish = () => {
    if (updateFinished) return;
    updateFinished = true;
    if (safetyTimer) clearTimeout(safetyTimer);
    if (hardDeadlineTimer) clearTimeout(hardDeadlineTimer);
    // Delay slightly so the progress bar reaches 100% visually before close.
    setTimeout(() => {
      try {
        onComplete();
      } catch (err) {
        log.error('[updater] onComplete threw — launching anyway:', err);
      }
    }, 1000);
  };

  // Absolute hard deadline — guarantees the app always launches even if every
  // updater event silently hangs (captive-portal Wi-Fi, firewall, proxy, etc.).
  hardDeadlineTimer = setTimeout(() => {
    log.warn('[updater] Hard deadline reached (20 s) — forcing launch.');
    finish();
  }, 20_000);

  const sendStatus = (text, percent) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('updater-message', text);
      if (percent !== undefined) {
        splashWindow.webContents.send('updater-progress', percent);
      }
    }
  };

  // --- INSTANT OFFLINE CHECK ---
  // If there's no network at all, skip the updater immediately.
  if (!net.isOnline()) {
    log.info('[updater] Device is offline — skipping update check instantly.');
    sendStatus('Starting Watch Rudra...', 100);
    finish();
    return;
  }

  // --- SAFETY TIMEOUT (online but slow/unreachable server) ---
  // 12 s is enough for slow connections; the hard deadline at 20 s is the backstop.
  safetyTimer = setTimeout(() => {
    log.warn(
      '[updater] Safety timeout reached — skipping update check (slow/offline?).',
    );
    finish();
  }, 12_000);

  sendStatus('Checking for updates...', 10);

  // ---------- NATIVE UPDATER ----------
  autoUpdater.on('update-available', (info) => {
    // Prevent the fast-launch timers from killing the splash screen during a large download
    if (safetyTimer) clearTimeout(safetyTimer);
    if (hardDeadlineTimer) clearTimeout(hardDeadlineTimer);

    if (splashWindow && !splashWindow.isDestroyed() && info.version) {
      splashWindow.webContents.send('updater-version', info.version);
    }
    sendStatus('Downloading update please...', 30);

    // Without this, a stalled/slow download after clearing both timers above
    // hangs the splash screen forever. 5 minutes is generous for any binary size.
    hardDeadlineTimer = setTimeout(
      () => {
        log.warn(
          '[updater] Download deadline (5 min) — forcing launch without update.',
        );
        finish();
      },
      5 * 60 * 1000,
    );
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatus(
      `Downloading update please... ${Math.floor(progressObj.percent)}%`,
      progressObj.percent,
    );
  });

  autoUpdater.on('update-not-available', () => {
    checkAsarUpdater();
  });

  autoUpdater.on('update-downloaded', () => {
    // If finish() already ran (download deadline fired), the user is already in the app.
    // Don't interrupt their session — autoInstallOnAppQuit will handle it on next quit.
    if (updateFinished) {
      log.info(
        '[updater] Update downloaded after launch — will install on next quit.',
      );
      return;
    }
    sendStatus('Installing updates...', 100);
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
      asarUpdater
        .checkForUpdates()
        .then((res) => {
          log.info('ASAR checked:', res);
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
  } catch (_e) {
    checkAsarUpdater();
  }
}

module.exports = { setupUpdater };

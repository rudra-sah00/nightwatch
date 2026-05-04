const { autoUpdater } = require('electron-updater');
const { app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createGunzip } = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const log = require('electron-log');
const { getAppVersion } = require('./version');

const GH_OWNER = 'rudra-sah00';
const GH_REPO = 'nightwatch';
const ASAR_ASSET_NAME = 'app.asar.gz';
const ASAR_CHECKSUM_NAME = 'app.asar.gz.sha256';

/**
 * Fetches the latest GitHub Release and returns its version, app.asar.gz URL,
 * and optional SHA-256 checksum URL.
 */
async function fetchLatestAsarInfo() {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`;
  const res = await net.fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Nightwatch-Desktop',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();
  const version = release.tag_name?.replace(/^v/, '');
  const asset = release.assets?.find((a) => a.name === ASAR_ASSET_NAME);
  const checksumAsset = release.assets?.find(
    (a) => a.name === ASAR_CHECKSUM_NAME,
  );
  return {
    version,
    asarUrl: asset?.browser_download_url || null,
    checksumUrl: checksumAsset?.browser_download_url || null,
  };
}

/**
 * Downloads a gzipped ASAR from url, decompresses it, and writes to destPath.
 * Reports progress via onProgress(percent).
 */
async function downloadAndDecompress(url, destPath, onProgress) {
  const res = await net.fetch(url, {
    headers: { 'User-Agent': 'Nightwatch-Desktop' },
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const total = Number.parseInt(res.headers.get('content-length') || '0', 10);
  let downloaded = 0;

  // Convert web ReadableStream → Node Readable so we can pipe through gunzip
  const webStream = res.body;
  const nodeStream = Readable.fromWeb(webStream);

  // Track download progress
  const tracker = new (require('node:stream').Transform)({
    transform(chunk, _encoding, cb) {
      downloaded += chunk.length;
      if (total > 0 && onProgress) {
        onProgress(Math.floor((downloaded / total) * 100));
      }
      cb(null, chunk);
    },
  });

  const gunzip = createGunzip();
  const output = fs.createWriteStream(destPath);

  await pipeline(nodeStream, tracker, gunzip, output);
}

/**
 * Returns true if remote semver > local semver.
 */
function isNewer(remote, local) {
  if (!remote || !local) return false;
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

/**
 * Two-layer update system:
 *
 * Layer 1 — Native binary (electron-updater):
 *   Full .dmg/.exe/.AppImage for Electron version bumps or native module changes.
 *
 * Layer 2 — ASAR differential (GitHub Releases API):
 *   Downloads only the gzipped app.asar (~154MB vs 584MB raw, vs 292MB full DMG).
 *   Swaps the ASAR in place and relaunches. No hardcoded versions.
 */
function setupUpdater(splashWindow, onComplete) {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  let updateFinished = false;
  let safetyTimer = null;
  let hardDeadlineTimer = null;

  const finish = () => {
    if (updateFinished) return;
    updateFinished = true;
    if (safetyTimer) clearTimeout(safetyTimer);
    if (hardDeadlineTimer) clearTimeout(hardDeadlineTimer);
    setTimeout(() => {
      try {
        onComplete();
      } catch (err) {
        log.error('[updater] onComplete threw — launching anyway:', err);
      }
    }, 1000);
  };

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

  const sendVersion = (version) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('updater-version', version);
    }
  };

  if (!net.isOnline()) {
    log.info('[updater] Device is offline — skipping update check.');
    sendStatus('Starting Nightwatch...', 100);
    finish();
    return;
  }

  safetyTimer = setTimeout(() => {
    log.warn('[updater] Safety timeout (12 s) — skipping update check.');
    finish();
  }, 12_000);

  sendStatus('Checking for updates...', 10);

  // ==================== LAYER 2: ASAR DIFFERENTIAL ====================
  const checkAsarUpdate = async () => {
    sendStatus('Checking resources...', 60);
    try {
      const {
        version: remoteVersion,
        asarUrl,
        checksumUrl,
      } = await fetchLatestAsarInfo();
      const localVersion = getAppVersion();

      log.info(
        `[asar-updater] Local: ${localVersion}, Remote: ${remoteVersion}, Asset: ${asarUrl ? 'yes' : 'no'}`,
      );

      if (!asarUrl || !isNewer(remoteVersion, localVersion)) {
        log.info('[asar-updater] No ASAR update needed.');
        sendStatus('Starting Nightwatch...', 100);
        finish();
        return;
      }

      // macOS: ASAR hot-swap invalidates the code signature, causing
      // Gatekeeper SIGKILL. Only allow ASAR updates on Windows/Linux.
      if (process.platform === 'darwin') {
        log.info(
          '[asar-updater] Skipping ASAR swap on macOS (preserves code signature). Use native updater.',
        );
        sendStatus('Starting Nightwatch...', 100);
        finish();
        return;
      }

      // Clear safety timers — we're downloading
      if (safetyTimer) clearTimeout(safetyTimer);
      if (hardDeadlineTimer) clearTimeout(hardDeadlineTimer);

      sendVersion(remoteVersion);
      sendStatus('Downloading update...', 65);

      // Download deadline (3 min for ~154MB gzipped)
      hardDeadlineTimer = setTimeout(() => {
        log.warn('[asar-updater] Download deadline (3 min) — forcing launch.');
        finish();
      }, 180_000);

      const asarPath = path.join(path.dirname(app.getAppPath()), 'app.asar');
      const tempPath = `${asarPath}.update`;

      await downloadAndDecompress(asarUrl, tempPath, (percent) => {
        const scaled = 65 + Math.floor(percent * 0.3); // 65% → 95%
        sendStatus(`Downloading update... ${percent}%`, scaled);
      });

      // Verify integrity if a checksum file was published alongside the ASAR
      if (checksumUrl) {
        try {
          const csRes = await net.fetch(checksumUrl, {
            headers: { 'User-Agent': 'Nightwatch-Desktop' },
          });
          if (csRes.ok) {
            const expectedHash = (await csRes.text()).trim().split(/\s/)[0];
            const fileHash = crypto
              .createHash('sha256')
              .update(fs.readFileSync(tempPath))
              .digest('hex');
            if (fileHash !== expectedHash) {
              throw new Error(
                `Checksum mismatch: expected ${expectedHash}, got ${fileHash}`,
              );
            }
            log.info('[asar-updater] SHA-256 checksum verified.');
          }
        } catch (csErr) {
          log.error('[asar-updater] Checksum verification failed:', csErr);
          fs.rmSync(tempPath, { force: true });
          sendStatus('Starting Nightwatch...', 100);
          finish();
          return;
        }
      }

      // Swap: on Windows the running ASAR is locked, stage as .pending
      if (process.platform === 'win32') {
        const pendingPath = `${asarPath}.pending`;
        fs.renameSync(tempPath, pendingPath);
        log.info('[asar-updater] Staged for next launch (Windows).');
      } else {
        fs.renameSync(tempPath, asarPath);
        log.info('[asar-updater] ASAR swapped. Restarting...');
      }

      sendStatus('Update installed — restarting...', 100);
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1500);
    } catch (err) {
      log.warn('[asar-updater] Failed:', err);
      // Clean up partial download
      try {
        const asarPath = path.join(path.dirname(app.getAppPath()), 'app.asar');
        fs.rmSync(`${asarPath}.update`, { force: true });
      } catch (_e) {}
      sendStatus('Starting Nightwatch...', 100);
      finish();
    }
  };

  // ==================== LAYER 1: NATIVE BINARY ====================
  autoUpdater.on('update-available', (info) => {
    if (safetyTimer) clearTimeout(safetyTimer);
    if (hardDeadlineTimer) clearTimeout(hardDeadlineTimer);

    sendVersion(info.version);
    sendStatus('Downloading update please...', 30);

    hardDeadlineTimer = setTimeout(
      () => {
        log.warn('[updater] Download deadline (5 min) — forcing launch.');
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
    checkAsarUpdate();
  });

  autoUpdater.on('update-downloaded', () => {
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
    log.error('[updater] Native updater error:', err);
    checkAsarUpdate();
  });

  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    log.error('[updater] checkForUpdates threw:', err);
    checkAsarUpdate();
  }
}

module.exports = { setupUpdater };

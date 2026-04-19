const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Reads the real app version from package.json inside the ASAR bundle.
 * app.getVersion() returns the native binary's compiled version, which is
 * NOT updated by electron-asar-hot-updater. This function always returns
 * the live JS bundle version.
 */
function getAppVersion() {
  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.version || app.getVersion();
    }
  } catch (_e) {}
  return app.getVersion();
}

module.exports = { getAppVersion };

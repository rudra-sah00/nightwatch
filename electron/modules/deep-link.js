const { PROD_DOMAIN } = require('./constants');
const ALLOWED_HOST = PROD_DOMAIN;

function handleDeepLink(url, mainWindow) {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();

  // Standard deep links: map nightwatch://path to https://nightwatch.in/path
  const secureUrl = url.replace('nightwatch://', `https://${ALLOWED_HOST}/`);

  try {
    const parsed = new URL(secureUrl);
    if (parsed.hostname !== ALLOWED_HOST || parsed.protocol !== 'https:') {
      console.error('[deep-link] Blocked disallowed URL:', secureUrl);
      return;
    }
  } catch (_e) {
    console.error('[deep-link] Malformed deep link URL:', url);
    return;
  }

  mainWindow.loadURL(secureUrl);
}

module.exports = { handleDeepLink };

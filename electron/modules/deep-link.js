const ALLOWED_HOST = 'nightwatch.in';

// Extracts nightwatch:// link variables to the web view properly
function handleDeepLink(url, mainWindow) {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    // Map nightwatch://party/123 to https://nightwatch.in/party/123
    const secureUrl = url.replace('nightwatch://', `https://${ALLOWED_HOST}/`);

    // Validate the resulting URL points to our domain only
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
}

module.exports = { handleDeepLink };

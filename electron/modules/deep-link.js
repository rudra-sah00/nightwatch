const ALLOWED_HOST = 'nightwatch.in';

function handleDeepLink(url, mainWindow) {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();

  // Auth callback: nightwatch://auth/callback?code=CODE
  // Send to renderer for token exchange instead of navigating
  if (url.startsWith('nightwatch://auth/callback')) {
    try {
      const parsed = new URL(url.replace('nightwatch://', 'https://x/'));
      const code = parsed.searchParams.get('code');
      if (code) {
        mainWindow.webContents.send('desktop-auth-callback', code);
        return;
      }
    } catch (_e) {}
  }

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

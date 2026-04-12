// Extracts watch-rudra:// link variables to the web view properly
function handleDeepLink(url, mainWindow) {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    // Map watch-rudra://party/123 to https://watch.rudrasahoo.live/party/123
    const secureUrl = url.replace('watch-rudra://', 'https://watch.rudrasahoo.live/');
    mainWindow.loadURL(secureUrl);
  }
}

module.exports = { handleDeepLink };
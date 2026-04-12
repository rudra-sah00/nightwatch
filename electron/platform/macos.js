const { systemPreferences, app, session } = require('electron');

async function setupMacOS() {
  if (process.platform === 'darwin') {
    try {
      // Prompt for critical macOS media access before loading any web views
      await systemPreferences.askForMediaAccess('camera');
      await systemPreferences.askForMediaAccess('microphone');
      console.log('macOS Media Permissions Granted');
    } catch (err) {
      console.warn('macOS media permission setup error:', err);
    }
  }
}

function handleMacOSDeepLink(url, handleDeepLinkCallback) {
  app.on('open-url', (event, openUrl) => {
    event.preventDefault();
    handleDeepLinkCallback(openUrl);
  });
}

function preventDefaultQuit() {
  app.on('window-all-closed', function () {
    // On macOS, applications typically stay active in the dock even when all windows are closed.
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = {
  setupMacOS,
  handleMacOSDeepLink,
  preventDefaultQuit
};

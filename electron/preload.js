const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Pass Discord Rich Presence updates from React Next.js to the Main Backend Node Process
  updateDiscordPresence: (presenceData) => {
    ipcRenderer.send('update-discord-status', presenceData);
  },

  // Let Next.js invoke desktop system features, like copying magic invite links via native copy
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),

  // --- LOCAL DESKTOP CONFIG STORE (electron-store JSON) ---
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.send('store-set', key, value),
  storeDelete: (key) => ipcRenderer.send('store-delete', key),

  // Sync React Native Theme with Electron Window Frame
  setNativeTheme: (theme) => ipcRenderer.send('set-native-theme', theme),

  // Toggle Picture-in-Picture mode (Always on Top) with optional opacity (0.7 = 70% safe transparent!)
  setPictureInPicture: (isEnabled, opacityLevel = 1.0) =>
    ipcRenderer.send('set-pip', isEnabled, opacityLevel),

  // Set an unread chat count overlay badge on the Windows Taskbar / Mac Dock (and bounce the icon)
  setUnreadBadge: (badgeCount) => ipcRenderer.send('set-badge', badgeCount),

  // Keep screen awake while a Watch Party stream is playing (prevents lock screens!)
  setKeepAwake: (shouldKeepAwake) =>
    ipcRenderer.send('toggle-keep-awake', shouldKeepAwake),

  // Listener to hide CSS when the Native Window shrinks down to a PiP block
  onPipModeChanged: (callback) => {
    const subscription = (_event, isPip) => callback(isPip);
    ipcRenderer.on('pip-mode-changed', subscription);
    return () => ipcRenderer.removeListener('pip-mode-changed', subscription);
  },

  // Used by the offline.html screen to instruct the main backend to map back to Next.js
  retryConnection: () => ipcRenderer.send('retry-connection'),

  // Native Desktop Notifications (e.g., Party Invites)
  showNotification: (payload) => ipcRenderer.send('show-notification', payload),

  onNotificationAction: (callback) => {
    const subscription = (_event, payload) => callback(payload);
    ipcRenderer.on('notification-action', subscription);
    return () =>
      ipcRenderer.removeListener('notification-action', subscription);
  },

  onNotificationClick: (callback) => {
    const clickSub = (_event, payload) => callback(payload);
    ipcRenderer.on('notification-click', clickSub);
    return () => ipcRenderer.removeListener('notification-click', clickSub);
  },

  // Configure app to launch on system startup silently
  setRunOnBoot: (isEnabled) => ipcRenderer.send('set-run-on-boot', isEnabled),

  // Listen for Native Hardware Media Keys
  onMediaCommand: (callback) => {
    const subscription = (_event, command) => callback(command);
    ipcRenderer.on('media-command', subscription);
    return () => ipcRenderer.removeListener('media-command', subscription);
  },

  // Listen for Window Auto-PiP Triggers (Blur/Focus)
  onWindowBlur: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('window-blur', subscription);
    return () => ipcRenderer.removeListener('window-blur', subscription);
  },

  onWindowFocus: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('window-focus', subscription);
    return () => ipcRenderer.removeListener('window-focus', subscription);
  },

  // --- LIVE HLS EXTRACTOR BRIDGE (DaddyLive) ---
  startLiveBridge: (config) => ipcRenderer.send('start-live-bridge', config),
  stopLiveBridge: () => ipcRenderer.send('stop-live-bridge'),
  onLiveBridgeResolved: (callback) => {
    const subscription = (_event, result) => callback(result);
    ipcRenderer.on('live-bridge-resolved', subscription);
    return () =>
      ipcRenderer.removeListener('live-bridge-resolved', subscription);
  },

  // --- OFFLINE HLS DOWNLOADER ---
  startDownload: (config) => ipcRenderer.send('start-download', config),
  cancelDownload: (contentId) => ipcRenderer.send('cancel-download', contentId),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  onDownloadProgress: (callback) => {
    const sub = (_event, state) => callback(state);
    ipcRenderer.on('download-progress', sub);
    return () => ipcRenderer.removeListener('download-progress', sub);
  },
});

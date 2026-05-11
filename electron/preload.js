const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Pass Discord Rich Presence updates from React Next.js to the Main Backend Node Process
  updateDiscordPresence: (presenceData) => {
    ipcRenderer.send('update-discord-status', presenceData);
  },
  clearDiscordPresence: () => {
    ipcRenderer.send('clear-discord-status');
  },

  // Let Next.js invoke desktop system features, like copying magic invite links via native copy
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),

  // --- LOCAL DESKTOP CONFIG STORE (electron-store JSON) ---
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.send('store-set', key, value),
  storeDelete: (key) => ipcRenderer.send('store-delete', key),

  // Returns the true version from package.json inside the ASAR bundle.
  // Use this instead of process.env.npm_package_version or any hardcoded value,
  // because app.getVersion() is frozen at native binary build time.
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

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
  setCallActive: (active) => ipcRenderer.send('set-call-active', active),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // Listener to hide CSS when the Native Window shrinks down to a PiP block
  onPipModeChanged: (callback) => {
    ipcRenderer.removeAllListeners('pip-mode-changed');
    const subscription = (_event, isPip) => callback(isPip);
    ipcRenderer.on('pip-mode-changed', subscription);
    return () => ipcRenderer.removeListener('pip-mode-changed', subscription);
  },

  // Native Desktop Notifications (e.g., Party Invites)
  showNotification: (payload) => ipcRenderer.send('show-notification', payload),

  onNotificationAction: (callback) => {
    ipcRenderer.removeAllListeners('notification-action');
    const subscription = (_event, payload) => callback(payload);
    ipcRenderer.on('notification-action', subscription);
    return () =>
      ipcRenderer.removeListener('notification-action', subscription);
  },

  onNotificationClick: (callback) => {
    ipcRenderer.removeAllListeners('notification-click');
    const clickSub = (_event, payload) => callback(payload);
    ipcRenderer.on('notification-click', clickSub);
    return () => ipcRenderer.removeListener('notification-click', clickSub);
  },

  // Configure app to launch on system startup silently
  setRunOnBoot: (isEnabled) => ipcRenderer.send('set-run-on-boot', isEnabled),

  // Listen for Native Hardware Media Keys
  onMediaCommand: (callback) => {
    ipcRenderer.removeAllListeners('media-command');
    const subscription = (_event, command) => callback(command);
    ipcRenderer.on('media-command', subscription);
    return () => ipcRenderer.removeListener('media-command', subscription);
  },

  // Listen for Window Auto-PiP Triggers (Blur/Focus)
  onWindowBlur: (callback) => {
    ipcRenderer.removeAllListeners('window-blur');
    const subscription = () => callback();
    ipcRenderer.on('window-blur', subscription);
    return () => ipcRenderer.removeListener('window-blur', subscription);
  },

  onWindowFocus: (callback) => {
    ipcRenderer.removeAllListeners('window-focus');
    const subscription = () => callback();
    ipcRenderer.on('window-focus', subscription);
    return () => ipcRenderer.removeListener('window-focus', subscription);
  },

  // Toggle native OS fullscreen on the BrowserWindow
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  // Fired when the native OS fullscreen state changes (enter or leave).
  // React uses this to guard blur→PiP so a fullscreen transition never
  // accidentally triggers the mini-player.
  onWindowFullscreenChanged: (callback) => {
    ipcRenderer.removeAllListeners('window-fullscreen-changed');
    const subscription = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window-fullscreen-changed', subscription);
    return () =>
      ipcRenderer.removeListener('window-fullscreen-changed', subscription);
  },

  // Fired when Escape is pressed anywhere (including inside iframes)
  onGlobalEscape: (callback) => {
    ipcRenderer.removeAllListeners('global-escape-pressed');
    const subscription = () => callback();
    ipcRenderer.on('global-escape-pressed', subscription);
    return () =>
      ipcRenderer.removeListener('global-escape-pressed', subscription);
  },

  // --- OFFLINE HLS DOWNLOADER ---
  startDownload: (config) => ipcRenderer.send('start-download', config),
  cancelDownload: (contentId) => ipcRenderer.send('cancel-download', contentId),
  pauseDownload: (contentId) => ipcRenderer.send('pause-download', contentId),
  resumeDownload: (contentId) => ipcRenderer.send('resume-download', contentId),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners('download-progress');
    const sub = (_event, state) => callback(state);
    ipcRenderer.on('download-progress', sub);
    return () => ipcRenderer.removeListener('download-progress', sub);
  },

  // --- HEALTH & RECOVERY ---
  // React app calls this after hydration to confirm successful boot.
  signalReady: () => ipcRenderer.send('app-ready'),
  // Offline bridge calls this to nuke caches and retry from network.
  clearCacheAndReload: () => ipcRenderer.send('clear-cache-reload'),
  // Open URL in the default OS browser (bypasses setWindowOpenHandler)
  openExternal: (url) => ipcRenderer.send('open-external', url),
});

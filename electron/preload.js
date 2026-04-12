const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Pass Discord Rich Presence updates from React Next.js to the Main Backend Node Process
  updateDiscordPresence: (details, state) => {
    ipcRenderer.send('update-discord-status', { details, state });
  },

  // Let Next.js invoke desktop system features, like copying magic invite links via native copy
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),

  // --- LOCAL DESKTOP CONFIG STORE (electron-store JSON) ---
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.send('store-set', key, value),
  storeDelete: (key) => ipcRenderer.send('store-delete', key),

  // Toggle Picture-in-Picture mode (Always on Top) with optional opacity (0.7 = 70% safe transparent!)
  setPictureInPicture: (isEnabled, opacityLevel = 1.0) => ipcRenderer.send('set-pip', isEnabled, opacityLevel),

  // Set an unread chat count overlay badge on the Windows Taskbar / Mac Dock (and bounce the icon)
  setUnreadBadge: (badgeCount) => ipcRenderer.send('set-badge', badgeCount),

  // Keep screen awake while a Watch Party stream is playing (prevents lock screens!)
  setKeepAwake: (shouldKeepAwake) => ipcRenderer.send('toggle-keep-awake', shouldKeepAwake),

  // Used by the offline.html screen to instruct the main backend to map back to Next.js
  retryConnection: () => ipcRenderer.send('retry-connection'),

  // Native Desktop Notifications (e.g., Party Invites)
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Configure app to launch on system startup silently
  setRunOnBoot: (isEnabled) => ipcRenderer.send('set-run-on-boot', isEnabled),

  // Listen for Native Hardware Media Keys
  onMediaCommand: (callback) => {
    ipcRenderer.on('media-command', (_event, command) => callback(command));
  }
});

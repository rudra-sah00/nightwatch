// Type definitions for the Desktop App (ElectronIPC bridge) 
// These types allow safe auto-completion when programming React in Next.js

export interface ElectronAPI {
  /** Updates the user's playing status directly in Discord */
  updateDiscordPresence: (details: string, state: string) => void;
  
  /** Securely copies a string to the user's OS clipboard natively */
  copyToClipboard: (text: string) => void;
  
  /** Retrieve a user setting locally stored in the OS (%APPDATA% or Application Support) */
  storeGet: (key: string) => Promise<any>;
  
  /** Save a user setting locally bypassing browser localStorage limits */
  storeSet: (key: string, value: any) => void;
  
  /** Delete a locally stored user setting */
  storeDelete: (key: string) => void;

  /** Toggles Picture-in-Picture mode. OpacityLevel 1.0 = Solid. 0.7 = 30% See-Through (Ghost mode) */
  setPictureInPicture: (isEnabled: boolean, opacityLevel?: number) => void;
  
  /** Sets a red unread badge icon on the Mac Dock/Windows Taskbar when a user gets invited to a party */
  setUnreadBadge: (badgeCount: number) => void;

  /** Prevents the OS from going to sleep or locking the screen while a video is playing */
  setKeepAwake: (shouldKeepAwake: boolean) => void;
  
  /** Triggers a native system notification popup (e.g. for Party Invites or Chat messages) */
  showNotification: (title: string, body: string) => void;
  
  /** Sets the app to run silently in the background when the user turns on their computer */
  setRunOnBoot: (isEnabled: boolean) => void;
  
  /** Only used by the fallback offline error page */
  retryConnection: () => void;
  
  /** Connects React hardware Media key events (Play, Pause, Next Track) */
  onMediaCommand: (callback: (command: 'MediaPlayPause' | 'MediaNextTrack' | 'MediaPreviousTrack' | 'MediaStop') => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

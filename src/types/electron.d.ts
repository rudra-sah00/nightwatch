// Type definitions for the Desktop App (ElectronIPC bridge)
// These types allow safe auto-completion when programming React in Next.js

export interface DownloadItem {
  contentId: string;
  title: string;
  posterUrl?: string;
  filesize?: number;
  downloadedBytes: number;
  progress: number;
  quality?: string; // e.g. "high", "medium", "low"
  speed?: string; // e.g. "2.4 MB/s"
  isMp4?: boolean;
  status:
    | 'QUEUED'
    | 'DOWNLOADING'
    | 'COMPLETED'
    | 'PAUSED'
    | 'FAILED'
    | 'CANCELLED';
  error?: string;
  showData?: unknown;
  localPlaylistPath?: string;
  subtitleTracks?: {
    label: string;
    language: string;
    url: string;
    localPath?: string;
  }[];
  createdAt: number;
}

export interface ElectronAPI {
  /** Updates the user's playing status directly in Discord */
  updateDiscordPresence: (presence: {
    details?: string;
    state?: string;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    partySize?: number;
    partyMax?: number;
    startTimestamp?: number;
    endTimestamp?: number;
    instance?: boolean;
  }) => void;

  /** Securely copies a string to the user's OS clipboard natively */
  copyToClipboard: (text: string) => void;

  /** Retrieve a user setting locally stored in the OS (%APPDATA% or Application Support) */
  storeGet: (key: string) => Promise<unknown>;

  /** Save a user setting locally bypassing browser localStorage limits */
  storeSet: (key: string, value: unknown) => void;

  /** Delete a locally stored user setting */
  storeDelete: (key: string) => void;

  /** Sets the native electron window frame theme to avoid white flashes and keep context menus aligned */
  setNativeTheme: (theme: 'light' | 'dark' | 'system') => void;

  /** Toggles Picture-in-Picture mode. OpacityLevel 1.0 = Solid. 0.7 = 30% See-Through (Ghost mode) */
  setPictureInPicture: (isEnabled: boolean, opacityLevel?: number) => void;

  /** Sets a red unread badge icon on the Mac Dock/Windows Taskbar when a user gets invited to a party */
  setUnreadBadge: (badgeCount: number) => void;

  /** Prevents the OS from going to sleep or locking the screen while a video is playing */
  setKeepAwake: (shouldKeepAwake: boolean) => void;

  /** Tells React when Native PiP forces the window to shrink, allowing us to hide CSS menus. */
  onPipModeChanged: (callback: (isPipMode: boolean) => void) => () => void;

  /** Triggers a native system notification popup (e.g. for Party Invites or Chat messages) */
  showNotification: (payload: {
    title: string;
    body: string;
    actions?: { type: string; text: string }[];
    replyPlaceholder?: string;
    closeButtonText?: string;
    [key: string]: unknown;
  }) => void;
  onNotificationAction: (callback: (payload: unknown) => void) => () => void;
  onNotificationClick: (callback: (payload: unknown) => void) => () => void;

  /** Sets the app to run silently in the background when the user turns on their computer */
  setRunOnBoot: (isEnabled: boolean) => void;

  /** Only used by the fallback offline error page */
  retryConnection: () => void;

  /** Connects React hardware Media key events (Play, Pause, Next Track). Returns an unsubscribe function. */
  onMediaCommand: (
    callback: (
      command:
        | 'MediaPlayPause'
        | 'MediaNextTrack'
        | 'MediaPreviousTrack'
        | 'MediaStop'
        | 'toggle-ptt',
    ) => void,
  ) => () => void;

  /** Toggles native OS fullscreen on the main window */
  toggleFullscreen: () => void;

  /** Tells React when Native OS Fullscreen state changes. */
  onFullscreenChanged: (
    callback: (isFullScreen: boolean) => void,
  ) => () => void;

  /** Tells React when the window has lost focus (good for Auto-PiP) */
  onWindowBlur: (callback: () => void) => () => void;

  /** Tells React when the window has regained focus */
  onWindowFocus: (callback: () => void) => () => void;

  /** Fired when the OS native fullscreen state changes on the Electron window.
   *  Use this to guard blur→PiP so a fullscreen animation never accidentally
   *  triggers the mini-player. */
  onWindowFullscreenChanged: (
    callback: (isFullscreen: boolean) => void,
  ) => () => void;

  /** Start native desktop download process for videos */
  startDownload: (params: {
    contentId: string;
    title: string;
    m3u8Url: string;
    posterUrl?: string;
    subtitleTracks?: { label: string; language: string; url: string }[];
    quality?: 'low' | 'medium' | 'high';
    metadata?: unknown;
  }) => void;

  /** Cancel an ongoing download */
  cancelDownload: (contentId: string) => void;
  /** Pause an ongoing download */
  pauseDownload: (contentId: string) => void;
  /** Resume a paused download */
  resumeDownload: (contentId: string) => void;
  getDownloads: () => Promise<DownloadItem[]>;

  /** Subscriber to listen for download progression updates payload */
  onDownloadProgress: (callback: (item: DownloadItem) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

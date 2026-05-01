/**
 * Electron Bridge — unified API for desktop native features.
 *
 * Every component imports `{ desktopBridge, isDesktop }` from here.
 * The actual implementation lives in `electron/preload.js` which exposes `window.electronAPI`.
 * When running outside Electron, all bridge methods are safe no-ops.
 *
 * @module electron-bridge
 */

/**
 * Represents a single offline download managed by the Electron main process.
 */
export interface DownloadItem {
  /** Unique identifier for the content being downloaded. */
  contentId: string;
  /** Human-readable title of the download. */
  title: string;
  /** Optional poster/thumbnail URL for display. */
  posterUrl?: string;
  /** Total file size in bytes, if known. */
  filesize?: number;
  /** Number of bytes downloaded so far. */
  downloadedBytes: number;
  /** Download progress as a 0–1 fraction. */
  progress: number;
  /** Selected quality label (e.g. "1080p"). */
  quality?: string;
  /** Current download speed as a human-readable string. */
  speed?: string;
  /** Whether the download is a single MP4 file rather than HLS segments. */
  isMp4?: boolean;
  /** Current lifecycle status of the download. */
  status:
    | 'QUEUED'
    | 'DOWNLOADING'
    | 'COMPLETED'
    | 'PAUSED'
    | 'FAILED'
    | 'CANCELLED';
  /** Error message when status is `FAILED`. */
  error?: string;
  /** Arbitrary show/series metadata attached to the download. */
  showData?: unknown;
  /** Local filesystem path to the downloaded HLS playlist. */
  localPlaylistPath?: string;
  /** Subtitle tracks associated with this download. */
  subtitleTracks?: {
    label: string;
    language: string;
    url: string;
    localPath?: string;
  }[];
  /** Unix timestamp (ms) when the download was created. */
  createdAt: number;
}

/** Callback returned by event listeners to unsubscribe. */
type UnlistenFn = () => void;

const isElectronEnv = typeof window !== 'undefined' && 'electronAPI' in window;

// Capacitor detection — true when running inside the native iOS/Android shell
const isCapacitorEnv =
  typeof window !== 'undefined' &&
  window.Capacitor?.isNativePlatform?.() === true;

/**
 * `true` when the app is running inside the Electron desktop shell.
 * Evaluated once at module load time — safe for top-level guards.
 */
export const isDesktop = isElectronEnv;

/**
 * `true` when the app is running inside the Capacitor native mobile shell.
 * Evaluated once at module load time.
 */
export const isMobile = isCapacitorEnv;

/**
 * Runtime check for the Electron environment.
 * Unlike {@link isDesktop}, this re-evaluates on every call — useful inside
 * effects that may run before the module-level constant is set.
 *
 * @returns `true` if `window.electronAPI` exists.
 */
export function checkIsDesktop(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Runtime check for the Capacitor native environment.
 * Unlike {@link isMobile}, this re-evaluates on every call.
 *
 * @returns `true` if Capacitor reports a native platform.
 */
export function checkIsMobile(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

const api = () =>
  (
    window as unknown as {
      electronAPI: Record<string, (...args: unknown[]) => unknown>;
    }
  ).electronAPI;

const noop = () => {};
const noopAsync = async () => {};
const noopListen = () => noop;

function createBridge() {
  if (!isElectronEnv) {
    return {
      updateDiscordPresence: noop as (p: Record<string, unknown>) => void,
      clearDiscordPresence: noop as () => void,
      copyToClipboard: noop as (t: string) => void,
      storeGet: async (_k: string): Promise<unknown> => undefined,
      storeSet: noop as (k: string, v: unknown) => void,
      storeDelete: noop as (k: string) => void,
      getAppVersion: async () => '',
      setNativeTheme: noop as (t: string) => void,
      setPictureInPicture: noop as (e: boolean, o?: number) => void,
      setUnreadBadge: noop as (c: number) => void,
      setKeepAwake: noop as (k: boolean) => void,
      setCallActive: noop as (active: boolean) => void,
      windowMinimize: noop,
      windowMaximize: noop,
      windowClose: noop,
      onPipModeChanged: noopListen as (
        cb: (isPip: boolean) => void,
      ) => UnlistenFn,
      showNotification: noop as (p: {
        title: string;
        body: string;
        [k: string]: unknown;
      }) => void,
      onNotificationAction: noopListen as (
        cb: (p: unknown) => void,
      ) => UnlistenFn,
      onNotificationClick: noopListen as (
        cb: (p: unknown) => void,
      ) => UnlistenFn,
      setRunOnBoot: noop as (e: boolean) => void,
      retryConnection: noop,
      onMediaCommand: noopListen as (cb: (cmd: string) => void) => UnlistenFn,
      toggleFullscreen: noopAsync,
      onFullscreenChanged: noopListen as (
        cb: (fs: boolean) => void,
      ) => UnlistenFn,
      onWindowBlur: noopListen as (cb: () => void) => UnlistenFn,
      onWindowFocus: noopListen as (cb: () => void) => UnlistenFn,
      onWindowFullscreenChanged: noopListen as (
        cb: (fs: boolean) => void,
      ) => UnlistenFn,
      startDownload: noop as (p: Record<string, unknown>) => void,
      cancelDownload: noop as (id: string) => void,
      pauseDownload: noop as (id: string) => void,
      resumeDownload: noop as (id: string) => void,
      getDownloads: async (): Promise<DownloadItem[]> => [],
      onDownloadProgress: noopListen as (
        cb: (item: DownloadItem) => void,
      ) => UnlistenFn,
      readOfflineFile: async (_path: string): Promise<Uint8Array> =>
        new Uint8Array(),
      getOfflineMediaBase: async (): Promise<string> => '',
      signalReady: noop,
    };
  }

  // Electron-backed implementations — delegates to window.electronAPI from preload.js
  const e = api();
  return {
    updateDiscordPresence: (p: Record<string, unknown>) =>
      e.updateDiscordPresence(p),
    clearDiscordPresence: () => e.clearDiscordPresence(),
    copyToClipboard: (t: string) => e.copyToClipboard(t),
    storeGet: (k: string) => e.storeGet(k) as Promise<unknown>,
    storeSet: (k: string, v: unknown) => e.storeSet(k, v),
    storeDelete: (k: string) => e.storeDelete(k),
    getAppVersion: () => e.getAppVersion() as Promise<string>,
    setNativeTheme: (t: string) => e.setNativeTheme(t),
    setPictureInPicture: (enabled: boolean, opacity = 1.0) =>
      e.setPictureInPicture(enabled, opacity),
    setUnreadBadge: (c: number) => e.setUnreadBadge(c),
    setKeepAwake: (k: boolean) => e.setKeepAwake(k),
    setCallActive: (active: boolean) => e.setCallActive(active),
    windowMinimize: () => e.windowMinimize(),
    windowMaximize: () => e.windowMaximize(),
    windowClose: () => e.windowClose(),
    onPipModeChanged: (cb: (isPip: boolean) => void) =>
      e.onPipModeChanged(cb) as UnlistenFn,
    showNotification: (p: {
      title: string;
      body: string;
      [k: string]: unknown;
    }) => e.showNotification(p),
    onNotificationAction: (cb: (p: unknown) => void) =>
      e.onNotificationAction(cb) as UnlistenFn,
    onNotificationClick: (cb: (p: unknown) => void) =>
      e.onNotificationClick(cb) as UnlistenFn,
    setRunOnBoot: (enabled: boolean) => e.setRunOnBoot(enabled),
    retryConnection: () => window.location.reload(),
    onMediaCommand: (cb: (cmd: string) => void) =>
      e.onMediaCommand(cb) as UnlistenFn,
    toggleFullscreen: async () => {},
    onFullscreenChanged: (cb: (fs: boolean) => void) =>
      e.onWindowFullscreenChanged(cb) as UnlistenFn,
    onWindowBlur: (cb: () => void) => e.onWindowBlur(cb) as UnlistenFn,
    onWindowFocus: (cb: () => void) => e.onWindowFocus(cb) as UnlistenFn,
    onWindowFullscreenChanged: (cb: (fs: boolean) => void) =>
      e.onWindowFullscreenChanged(cb) as UnlistenFn,
    startDownload: (p: Record<string, unknown>) => e.startDownload(p),
    cancelDownload: (id: string) => e.cancelDownload(id),
    pauseDownload: (id: string) => e.pauseDownload(id),
    resumeDownload: (id: string) => e.resumeDownload(id),
    getDownloads: () => e.getDownloads() as Promise<DownloadItem[]>,
    onDownloadProgress: (cb: (item: DownloadItem) => void) =>
      e.onDownloadProgress(cb) as UnlistenFn,
    readOfflineFile: async (_path: string): Promise<Uint8Array> =>
      new Uint8Array(),
    getOfflineMediaBase: async (): Promise<string> => '',
    signalReady: () => e.signalReady(),
  };
}

/**
 * Singleton bridge to Electron desktop native APIs.
 *
 * When running outside Electron every method is a safe no-op (or returns a
 * sensible default like an empty array / empty string). This lets UI code call
 * bridge methods unconditionally without platform guards.
 *
 * Methods cover: Discord Rich Presence, clipboard, persistent key-value store,
 * native theme, Picture-in-Picture, window controls, notifications, media keys,
 * fullscreen, offline downloads, and more.
 */
export const desktopBridge = createBridge();

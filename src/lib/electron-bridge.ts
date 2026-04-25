// Electron Bridge — unified API for desktop native features.
// Every component imports { desktopBridge, isDesktop } from here.
// The actual implementation is in electron/preload.js which exposes window.electronAPI.

export interface DownloadItem {
  contentId: string;
  title: string;
  posterUrl?: string;
  filesize?: number;
  downloadedBytes: number;
  progress: number;
  quality?: string;
  speed?: string;
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

type UnlistenFn = () => void;

const isElectronEnv = typeof window !== 'undefined' && 'electronAPI' in window;

export const isDesktop = isElectronEnv;
export const isMobile = false;

export function checkIsDesktop(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

export function checkIsMobile(): boolean {
  return false;
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
      startLiveBridge: noop as (c: { url: string; channelId: string }) => void,
      stopLiveBridge: noop,
      onLiveBridgeResolved: noopListen as (
        cb: (r: unknown) => void,
      ) => UnlistenFn,
      readOfflineFile: async (_path: string): Promise<Uint8Array> =>
        new Uint8Array(),
      getOfflineMediaBase: async (): Promise<string> => '',
    };
  }

  // Electron-backed implementations — delegates to window.electronAPI from preload.js
  const e = api();
  return {
    updateDiscordPresence: (p: Record<string, unknown>) =>
      e.updateDiscordPresence(p),
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
    startLiveBridge: (c: { url: string; channelId: string }) =>
      e.startLiveBridge(c),
    stopLiveBridge: () => e.stopLiveBridge(),
    onLiveBridgeResolved: (cb: (r: unknown) => void) =>
      e.onLiveBridgeResolved(cb) as UnlistenFn,
    readOfflineFile: async (_path: string): Promise<Uint8Array> =>
      new Uint8Array(),
    getOfflineMediaBase: async (): Promise<string> => '',
  };
}

export const desktopBridge = createBridge();

// Tauri v2 Bridge — unified API for desktop and mobile native features.
// Every component imports { desktopBridge, isDesktop, isMobile } from here.

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

const isTauriEnv =
  typeof window !== 'undefined' &&
  ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

export const isTauri = isTauriEnv;
export const isDesktop = isTauriEnv;
export const isMobile =
  isTauriEnv &&
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Use this in useState initializers to correctly detect Tauri at hydration time */
export function checkIsDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  );
}

/** Check if running inside Tauri on a mobile device */
export function checkIsMobile(): boolean {
  return (
    checkIsDesktop() &&
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

// --- internal helpers (lazy-loaded so browser builds never pull Tauri code) ---

async function invoke<T = void>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

async function listen<T>(
  event: string,
  cb: (payload: T) => void,
): Promise<UnlistenFn> {
  const { listen: tauriListen } = await import('@tauri-apps/api/event');
  return tauriListen<T>(event, (e) => cb(e.payload));
}

const noop = () => {};
const noopAsync = async () => {};
const noopListen = () => noop;

// --- bridge factory ---

function createBridge() {
  if (!isTauriEnv) {
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
      getOfflineMediaBase: async (): Promise<string> => 'offline-media://local',
    };
  }

  // --- Tauri-backed implementations ---

  // Event listeners return sync unsubscribe fns. We store the async unlisten
  // promise and call it when the returned fn is invoked.
  function makeSyncListener<T>(event: string) {
    return (callback: (payload: T) => void): UnlistenFn => {
      let unlisten: UnlistenFn | null = null;
      listen<T>(event, callback)
        .then((u) => {
          unlisten = u;
        })
        .catch(() => {});
      return () => {
        unlisten?.();
      };
    };
  }

  return {
    updateDiscordPresence(presence: Record<string, unknown>) {
      invoke('set_discord_activity', {
        details: (presence.details as string) || '',
        state: (presence.state as string) || '',
        largeImageKey: (presence.largeImageKey as string) || 'watchrudra_logo',
      }).catch(() => {});
    },

    copyToClipboard(text: string) {
      import('@tauri-apps/plugin-clipboard-manager')
        .then((m) => m.writeText(text))
        .catch(() => {});
    },

    async storeGet(key: string): Promise<unknown> {
      try {
        const { load } = await import('@tauri-apps/plugin-store');
        const store = await load('store.json');
        return await store.get(key);
      } catch {
        return undefined;
      }
    },

    storeSet(key: string, value: unknown) {
      import('@tauri-apps/plugin-store')
        .then(async (m) => {
          const store = await m.load('store.json');
          await store.set(key, value);
          await store.save();
        })
        .catch(() => {});
    },

    storeDelete(key: string) {
      import('@tauri-apps/plugin-store')
        .then(async (m) => {
          const store = await m.load('store.json');
          await store.delete(key);
          await store.save();
        })
        .catch(() => {});
    },

    async getAppVersion(): Promise<string> {
      try {
        return await invoke<string>('get_app_version');
      } catch {
        return '';
      }
    },

    setNativeTheme(theme: string) {
      invoke('set_native_theme', { theme }).catch(() => {});
    },

    setPictureInPicture(isEnabled: boolean, opacityLevel = 1.0) {
      invoke('set_pip', { enabled: isEnabled, opacity: opacityLevel }).catch(
        () => {},
      );
    },

    setUnreadBadge(badgeCount: number) {
      invoke('set_badge', { count: badgeCount }).catch(() => {});
    },

    setKeepAwake(shouldKeepAwake: boolean) {
      invoke('toggle_keep_awake', { keepAwake: shouldKeepAwake }).catch(
        () => {},
      );
    },

    onPipModeChanged: makeSyncListener<boolean>('pip-mode-changed'),

    showNotification(payload: {
      title: string;
      body: string;
      [k: string]: unknown;
    }) {
      import('@tauri-apps/plugin-notification')
        .then((m) => {
          m.sendNotification({ title: payload.title, body: payload.body });
        })
        .catch(() => {});
    },

    onNotificationAction: makeSyncListener<unknown>('notification-action'),
    onNotificationClick: makeSyncListener<unknown>('notification-click'),

    setRunOnBoot(isEnabled: boolean) {
      invoke('set_run_on_boot', { enabled: isEnabled }).catch(() => {});
    },

    retryConnection() {
      window.location.reload();
    },

    onMediaCommand: makeSyncListener<string>('media-command'),

    async toggleFullscreen() {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.setFullscreen(!(await win.isFullscreen()));
      } catch {}
    },

    onFullscreenChanged: makeSyncListener<boolean>('window-fullscreen-changed'),
    onWindowBlur: makeSyncListener<void>('window-blur'),
    onWindowFocus: makeSyncListener<void>('window-focus'),
    onWindowFullscreenChanged: makeSyncListener<boolean>(
      'window-fullscreen-changed',
    ),

    startDownload(params: Record<string, unknown>) {
      invoke('start_download', {
        config: {
          content_id: params.contentId,
          title: params.title || '',
          provider: ((params.contentId as string) || '').split(':')[0] || 's1',
          hls_url: params.m3u8Url || null,
          mp4_url: (params.m3u8Url as string)?.includes('.mp4')
            ? params.m3u8Url
            : null,
          thumbnail_url: params.posterUrl || null,
          trailer_url: null,
        },
      }).catch(() => {});
    },

    cancelDownload(contentId: string) {
      invoke('cancel_download', { contentId }).catch(() => {});
    },

    pauseDownload(contentId: string) {
      invoke('pause_download', { contentId }).catch(() => {});
    },

    resumeDownload(contentId: string) {
      invoke('resume_download', { contentId }).catch(() => {});
    },

    async getDownloads(): Promise<DownloadItem[]> {
      try {
        const items = await invoke<Record<string, unknown>[]>('get_downloads');
        return (items || []).map((i) => ({
          contentId: (i.content_id as string) || '',
          title: (i.title as string) || '',
          status: (
            (i.status as string) || 'QUEUED'
          ).toUpperCase() as DownloadItem['status'],
          progress: (i.progress as number) || 0,
          downloadedBytes: (i.downloaded_bytes as number) || 0,
          posterUrl: i.poster_url as string | undefined,
          speed: '',
          createdAt: 0,
        }));
      } catch {
        return [];
      }
    },

    onDownloadProgress: makeSyncListener<DownloadItem>('download-progress'),

    startLiveBridge(config: { url: string; channelId: string }) {
      invoke('start_live_bridge', config).catch(() => {});
    },

    stopLiveBridge() {
      invoke('stop_live_bridge').catch(() => {});
    },

    onLiveBridgeResolved: makeSyncListener<unknown>('live-bridge-resolved'),

    async readOfflineFile(path: string): Promise<Uint8Array> {
      try {
        const data = await invoke<number[]>('read_offline_file', { path });
        return new Uint8Array(data);
      } catch {
        return new Uint8Array();
      }
    },

    /** Get the base URL for offline media files.
     *  Desktop: "offline-media://local" (custom protocol)
     *  Mobile: "http://127.0.0.1:{port}" (local HTTP server) */
    async getOfflineMediaBase(): Promise<string> {
      try {
        return await invoke<string>('get_offline_media_base');
      } catch {
        return 'offline-media://local';
      }
    },
  };
}

export const desktopBridge = createBridge();

// --- Offline media URL resolution ---

let _offlineMediaBase: string | null = null;

/**
 * Resolves an `offline-media://local/...` URL to the correct platform URL.
 * - Desktop: returns as-is (custom protocol handles it)
 * - Mobile: rewrites to `http://127.0.0.1:{port}/...` (local HTTP server)
 * - Browser: returns as-is (noop, won't be used)
 */
export async function resolveOfflineUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('offline-media://')) return url;
  if (!isTauriEnv) return url;

  if (!_offlineMediaBase) {
    _offlineMediaBase = await desktopBridge.getOfflineMediaBase();
  }

  // "offline-media://local/contentId/file.ts" → "{base}/contentId/file.ts"
  const path = url
    .replace('offline-media://local/', '')
    .replace('offline-media://', '');
  return `${_offlineMediaBase}/${path}`;
}

/** Synchronous check — returns true if the URL needs async resolution on mobile */
export function isOfflineMediaUrl(url: string): boolean {
  return !!url && url.startsWith('offline-media://');
}

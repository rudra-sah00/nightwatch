/**
 * Electron Bridge — unified API for desktop native features.
 *
 * Every component imports `{ desktopBridge, isDesktop }` from here.
 * The actual implementation lives in `electron/preload.js` which exposes `window.electronAPI`.
 * When running outside Electron, all bridge methods are safe no-ops.
 *
 * @module electron-bridge
 */

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

/**
 * `true` when the app is running on an Android TV device.
 * Set by the native MainActivity via `window.__ANDROID_TV__ = true`.
 */
export const isTV =
  typeof window !== 'undefined' && window.__ANDROID_TV__ === true;

/**
 * Runtime check for Android TV environment.
 * Re-evaluates on every call — useful in effects that run before module init.
 */
export function checkIsTV(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__ANDROID_TV__ === true) return true;
  return localStorage.getItem('__ANDROID_TV__') === 'true';
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
      setUnreadBadge: noop as (c: number) => void,
      setKeepAwake: noop as (k: boolean) => void,
      setCallActive: noop as (active: boolean) => void,
      windowMinimize: noop,
      windowMaximize: noop,
      windowClose: noop,
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
    setUnreadBadge: (c: number) => e.setUnreadBadge(c),
    setKeepAwake: (k: boolean) => e.setKeepAwake(k),
    setCallActive: (active: boolean) => e.setCallActive(active),
    windowMinimize: () => e.windowMinimize(),
    windowMaximize: () => e.windowMaximize(),
    windowClose: () => e.windowClose(),
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
    toggleFullscreen: async () => {
      await e.toggleFullscreen();
    },
    onFullscreenChanged: (cb: (fs: boolean) => void) =>
      e.onWindowFullscreenChanged(cb) as UnlistenFn,
    onWindowBlur: (cb: () => void) => e.onWindowBlur(cb) as UnlistenFn,
    onWindowFocus: (cb: () => void) => e.onWindowFocus(cb) as UnlistenFn,
    onWindowFullscreenChanged: (cb: (fs: boolean) => void) =>
      e.onWindowFullscreenChanged(cb) as UnlistenFn,
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
 * native theme, window controls, notifications, media keys,
 * fullscreen, offline downloads, and more.
 */
export const desktopBridge = createBridge();

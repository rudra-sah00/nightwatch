/**
 * Mobile Bridge — unified API for Capacitor native features.
 *
 * Mirrors the `electron-bridge.ts` pattern so components can use either bridge
 * interchangeably. All methods delegate to the corresponding Capacitor plugin.
 *
 * @module mobile-bridge
 */

import { App } from '@capacitor/app';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Badge } from '@capawesome/capacitor-badge';

/**
 * `true` when the app is running inside a Capacitor native shell (iOS / Android).
 * Evaluated once at module load time.
 */
export const isMobileNative = Capacitor.isNativePlatform();

/**
 * Singleton bridge exposing every Capacitor native capability used by the app.
 *
 * Categories: Splash Screen, Status Bar, Clipboard, Haptics, Keep Awake,
 * Screen Orientation, Network, Share, Badge, Preferences (key-value store),
 * Keyboard, and App Lifecycle.
 *
 * Event-listener methods return an unlisten function for cleanup.
 */
export const mobileBridge = {
  // --- Splash Screen ---
  /** Hide the native splash screen. */
  hideSplash: () => SplashScreen.hide(),
  /** Show the native splash screen. */
  showSplash: () => SplashScreen.show(),

  // --- Status Bar ---
  /** Set the status bar to dark (light content) style. */
  setStatusBarDark: () => StatusBar.setStyle({ style: Style.Dark }),
  /** Set the status bar to light (dark content) style. */
  setStatusBarLight: () => StatusBar.setStyle({ style: Style.Light }),
  /** Hide the native status bar. */
  hideStatusBar: () => StatusBar.hide(),
  /** Show the native status bar. */
  showStatusBar: () => StatusBar.show(),

  // --- Clipboard ---
  /** Write {@link text} to the system clipboard. */
  copyToClipboard: (text: string) => Clipboard.write({ string: text }),
  /** Read the current clipboard text value. */
  readClipboard: () => Clipboard.read().then((r) => r.value),

  // --- Haptics ---
  /**
   * Trigger an impact haptic feedback.
   * @param style - Intensity: `'light'`, `'medium'` (default), or `'heavy'`.
   */
  hapticImpact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    return Haptics.impact({ style: map[style] });
  },
  /**
   * Trigger a notification-style haptic feedback.
   * @param type - `'success'` (default), `'warning'`, or `'error'`.
   */
  hapticNotification: (type: 'success' | 'warning' | 'error' = 'success') => {
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    return Haptics.notification({ type: map[type] });
  },
  /** Trigger a simple vibration. */
  hapticVibrate: () => Haptics.vibrate(),

  // --- Keep Awake ---
  /**
   * Toggle the device screen keep-awake lock.
   * @param keep - `true` to prevent sleep, `false` to allow it.
   */
  setKeepAwake: (keep: boolean) =>
    keep ? KeepAwake.keepAwake() : KeepAwake.allowSleep(),

  // --- Screen Orientation ---
  /** Lock the screen to landscape orientation. */
  lockLandscape: () => ScreenOrientation.lock({ orientation: 'landscape' }),
  /** Lock the screen to portrait orientation. */
  lockPortrait: () => ScreenOrientation.lock({ orientation: 'portrait' }),
  /** Unlock screen orientation to follow the device sensor. */
  unlockOrientation: () => ScreenOrientation.unlock(),

  // --- Network ---
  /** Get the current network connection status. */
  getNetworkStatus: () => Network.getStatus(),
  /**
   * Subscribe to network status changes.
   * @param cb - Called with `{ connected, connectionType }` on every change.
   * @returns An unlisten function to remove the listener.
   */
  onNetworkChange: (
    cb: (status: { connected: boolean; connectionType: string }) => void,
  ) => {
    const handle = Network.addListener('networkStatusChange', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },

  // --- Share ---
  /**
   * Open the native share sheet.
   * @param opts - Share payload with optional `title`, `text`, and `url`.
   */
  share: (opts: { title?: string; text?: string; url?: string }) =>
    Share.share(opts),

  // --- Badge ---
  /**
   * Set the app icon badge count.
   * @param count - Number to display on the badge.
   */
  setBadge: (count: number) => Badge.set({ count }),
  /** Clear the app icon badge. */
  clearBadge: () => Badge.clear(),

  // --- Preferences (key-value store, like electron-store) ---
  /**
   * Read a value from the native key-value store.
   * @param key - Storage key.
   * @returns The stored string value, or `null` if not found.
   */
  storeGet: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  /**
   * Write a value to the native key-value store.
   * @param key - Storage key.
   * @param value - String value to persist.
   */
  storeSet: (key: string, value: string) => Preferences.set({ key, value }),
  /**
   * Delete a key from the native key-value store.
   * @param key - Storage key to remove.
   */
  storeDelete: (key: string) => Preferences.remove({ key }),

  // --- Keyboard ---
  /** Programmatically hide the software keyboard. */
  hideKeyboard: () => Keyboard.hide(),
  /**
   * Subscribe to keyboard show events.
   * @param cb - Called with `{ keyboardHeight }` when the keyboard appears.
   * @returns An unlisten function.
   */
  onKeyboardShow: (cb: (info: { keyboardHeight: number }) => void) => {
    const handle = Keyboard.addListener('keyboardWillShow', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  /**
   * Subscribe to keyboard hide events.
   * @param cb - Called when the keyboard is dismissed.
   * @returns An unlisten function.
   */
  onKeyboardHide: (cb: () => void) => {
    const handle = Keyboard.addListener('keyboardWillHide', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },

  // --- App Lifecycle ---
  /**
   * Subscribe to app foreground/background state changes.
   * @param cb - Called with `{ isActive }` when the app state changes.
   * @returns An unlisten function.
   */
  onAppStateChange: (cb: (state: { isActive: boolean }) => void) => {
    const handle = App.addListener('appStateChange', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  /**
   * Subscribe to the hardware back button press (Android).
   * @param cb - Called when the back button is pressed.
   * @returns An unlisten function.
   */
  onBackButton: (cb: () => void) => {
    const handle = App.addListener('backButton', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  /** Terminate the native app process. */
  exitApp: () => App.exitApp(),
};

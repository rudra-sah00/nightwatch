// Mobile Bridge — unified API for Capacitor native features.
// Mirrors the electron-bridge.ts pattern so components can use either.

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

export const isMobileNative = Capacitor.isNativePlatform();

export const mobileBridge = {
  // --- Splash Screen ---
  hideSplash: () => SplashScreen.hide(),
  showSplash: () => SplashScreen.show(),

  // --- Status Bar ---
  setStatusBarDark: () => StatusBar.setStyle({ style: Style.Dark }),
  setStatusBarLight: () => StatusBar.setStyle({ style: Style.Light }),
  hideStatusBar: () => StatusBar.hide(),
  showStatusBar: () => StatusBar.show(),

  // --- Clipboard ---
  copyToClipboard: (text: string) => Clipboard.write({ string: text }),
  readClipboard: () => Clipboard.read().then((r) => r.value),

  // --- Haptics ---
  hapticImpact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    return Haptics.impact({ style: map[style] });
  },
  hapticNotification: (type: 'success' | 'warning' | 'error' = 'success') => {
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    return Haptics.notification({ type: map[type] });
  },
  hapticVibrate: () => Haptics.vibrate(),

  // --- Keep Awake ---
  setKeepAwake: (keep: boolean) =>
    keep ? KeepAwake.keepAwake() : KeepAwake.allowSleep(),

  // --- Screen Orientation ---
  lockLandscape: () => ScreenOrientation.lock({ orientation: 'landscape' }),
  lockPortrait: () => ScreenOrientation.lock({ orientation: 'portrait' }),
  unlockOrientation: () => ScreenOrientation.unlock(),

  // --- Network ---
  getNetworkStatus: () => Network.getStatus(),
  onNetworkChange: (
    cb: (status: { connected: boolean; connectionType: string }) => void,
  ) => {
    const handle = Network.addListener('networkStatusChange', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },

  // --- Share ---
  share: (opts: { title?: string; text?: string; url?: string }) =>
    Share.share(opts),

  // --- Badge ---
  setBadge: (count: number) => Badge.set({ count }),
  clearBadge: () => Badge.clear(),

  // --- Preferences (key-value store, like electron-store) ---
  storeGet: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  storeSet: (key: string, value: string) => Preferences.set({ key, value }),
  storeDelete: (key: string) => Preferences.remove({ key }),

  // --- Keyboard ---
  hideKeyboard: () => Keyboard.hide(),
  onKeyboardShow: (cb: (info: { keyboardHeight: number }) => void) => {
    const handle = Keyboard.addListener('keyboardWillShow', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  onKeyboardHide: (cb: () => void) => {
    const handle = Keyboard.addListener('keyboardWillHide', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },

  // --- App Lifecycle ---
  onAppStateChange: (cb: (state: { isActive: boolean }) => void) => {
    const handle = App.addListener('appStateChange', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  onBackButton: (cb: () => void) => {
    const handle = App.addListener('backButton', cb);
    return () => {
      handle.then((h) => h.remove());
    };
  },
  exitApp: () => App.exitApp(),
};

import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.nightwatch.in',
  appName: 'Nightwatch',
  webDir: 'public',
  backgroundColor: '#000000',
  server: {
    url: isDev
      ? process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000'
      : 'https://www.nightwatch.in',
    cleartext: isDev,
    // Allow navigation and XHR/fetch to these origins (CDNs for HLS streams)
    allowNavigation: ['nightwatch.in', '*.nightwatch.in', 'localhost:*', '*'],
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '99440023345-oojcjkc66bksspt27f1adpbq5lh02pg0.apps.googleusercontent.com',
      iosClientId:
        '99440023345-b4aomde426cgkhb4p4dukm6ccg4jgn9p.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    Keyboard: {
      resize: KeyboardResize.None,
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
  ios: {
    preferredContentMode: 'mobile',
    // Allow inline video playback (no forced fullscreen)
    allowsLinkPreview: false,
  },
};

export default config;

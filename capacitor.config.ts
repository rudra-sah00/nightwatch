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
      : 'https://nightwatch.in',
    cleartext: isDev,
    // Allow navigation and XHR/fetch to these origins (CDNs for HLS streams)
    allowNavigation: ['nightwatch.in', '*.nightwatch.in', 'localhost:*', '*'],
  },
  plugins: {
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

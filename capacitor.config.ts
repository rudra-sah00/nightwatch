import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.nightwatch.in',
  appName: 'Nightwatch',
  webDir: 'public',
  server: {
    url: isDev
      ? process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000'
      : 'https://nightwatch.in',
    cleartext: isDev,
    allowNavigation: ['nightwatch.in', '*.nightwatch.in', 'localhost:*'],
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
    },
  },
};

export default config;

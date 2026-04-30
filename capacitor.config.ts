import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.nightwatch.in',
  appName: 'Nightwatch',
  webDir: 'public',
  server: {
    // Production: load the deployed app (same as Electron)
    // Local dev: set CAPACITOR_DEV=true to use localhost
    url: isDev
      ? process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000'
      : 'https://nightwatch.in',
    cleartext: isDev, // Only allow HTTP in dev
  },
};

export default config;

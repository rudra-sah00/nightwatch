import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nightwatch.in',
  appName: 'Nightwatch',
  // Point the WebView at your running Next.js server (same approach as Electron).
  // For local dev, use your machine's LAN IP so the iOS/Android emulator can reach it.
  // For production, point to your deployed URL.
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: true, // Allow HTTP for local dev
  },
  // iOS background audio is enabled via UIBackgroundModes in ios/App/App/Info.plist
};

export default config;

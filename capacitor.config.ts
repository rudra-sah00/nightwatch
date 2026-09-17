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
  android: {
    /**
     * Required by the on-device loopback media forwarder (NWMediaProxyPlugin).
     *
     * The app is served over https, while the forwarder listens on
     * http://127.0.0.1:<port>. Chromium's mixed-content rules classify media as
     * blockable, so a <video> pointed at the loopback origin is refused with
     * "MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check" even though
     * 127.0.0.1 is otherwise treated as a trustworthy origin.
     *
     * Tradeoff: this relaxes mixed-content policy for the whole WebView, not just
     * loopback. It is acceptable here because every remote origin the app talks to
     * is https (see server.allowNavigation and the API/CDN hosts), so in practice
     * the only cleartext destination is our own on-device forwarder — which is
     * additionally constrained by network_security_config to 127.0.0.1/localhost.
     */
    allowMixedContent: true,
  },
};

export default config;

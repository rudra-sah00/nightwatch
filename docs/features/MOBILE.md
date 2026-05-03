# Mobile Application (Capacitor)

## Overview

Nightwatch ships a native iOS and Android app built with [Capacitor](https://capacitorjs.com/). The deployed Next.js web app (`https://nightwatch.in`) is loaded inside a native WebView, with 16 native plugins providing access to device APIs: haptic feedback, status bar theming, CallKit voice calls, background music playback, lock screen media controls, native share sheet, offline downloads, and swipe-based navigation.

## Capacitor Configuration

The Capacitor config lives at the project root in `capacitor.config.ts`:

```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.nightwatch.in',
  appName: 'Nightwatch',
  webDir: 'public',
  server: {
    url: isDev
      ? process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000'
      : 'https://nightwatch.in',
    cleartext: isDev,
    allowNavigation: ['nightwatch.in', '*.nightwatch.in', 'localhost:*', '*'],
  },
  plugins: {
    Keyboard: { resize: KeyboardResize.None },
    SplashScreen: { launchAutoHide: true, launchShowDuration: 0 },
  },
  ios: {
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
  },
};
```

Key decisions:
- **Keyboard resize is `None`** — the app manages keyboard insets manually via CSS custom properties (`--keyboard-height`) to avoid layout jumps.
- **Splash screen auto-hides immediately** — the web app renders fast enough that a native splash is unnecessary.
- **iOS inline video** — `allowsLinkPreview: false` prevents forced fullscreen on video playback.
- **Dev mode** — set `CAPACITOR_DEV=true` and `CAPACITOR_SERVER_URL` to point the WebView at your local dev server.

## Native Plugins (16)

| # | Plugin | Package | Purpose |
|---|--------|---------|---------|
| 1 | Splash Screen | `@capacitor/splash-screen` | Show/hide native splash on launch |
| 2 | Status Bar | `@capacitor/status-bar` | Dark/light style, show/hide |
| 3 | Clipboard | `@capacitor/clipboard` | Read/write system clipboard |
| 4 | Haptics | `@capacitor/haptics` | Impact, notification, and vibration feedback |
| 5 | Keep Awake | `@capacitor-community/keep-awake` | Prevent screen sleep during playback |
| 6 | Screen Orientation | `@capacitor/screen-orientation` | Lock to landscape/portrait, unlock |
| 7 | Network | `@capacitor/network` | Connection status and change events |
| 8 | Share | `@capacitor/share` | Native share sheet |
| 9 | Badge | `@capawesome/capacitor-badge` | App icon badge count |
| 10 | Keyboard | `@capacitor/keyboard` | Show/hide events, programmatic dismiss |
| 11 | App Lifecycle | `@capacitor/app` | Foreground/background state, back button |
| 12 | Preferences | `@capacitor/preferences` | Native key-value store (like `electron-store`) |
| 13 | Filesystem | `@capacitor/filesystem` | Read/write files for offline downloads |
| 14 | Phone Call Notification | `@anuradev/capacitor-phone-call-notification` | Android "call in progress" notification |
| 15 | CallKit | `@capgo/capacitor-incoming-call-kit` | iOS incoming call UI (green pill, lock screen) |
| 16 | Picture-in-Picture | Native WebKit API | Background video via `requestPictureInPicture()` |

## Mobile Bridge API

`src/lib/mobile-bridge.ts` exports a singleton `mobileBridge` object that mirrors the `desktopBridge` pattern from Electron. Components use either bridge interchangeably. All methods delegate to the corresponding Capacitor plugin.

```ts
import { mobileBridge, isMobileNative } from '@/lib/mobile-bridge';
```

### Method Reference

| Category | Method | Signature | Description |
|----------|--------|-----------|-------------|
| **Splash** | `hideSplash` | `() => Promise` | Hide native splash screen |
| | `showSplash` | `() => Promise` | Show native splash screen |
| **Status Bar** | `setStatusBarDark` | `() => Promise` | Light content on dark background |
| | `setStatusBarLight` | `() => Promise` | Dark content on light background |
| | `hideStatusBar` | `() => Promise` | Hide status bar |
| | `showStatusBar` | `() => Promise` | Show status bar |
| **Clipboard** | `copyToClipboard` | `(text: string) => Promise` | Write to clipboard |
| | `readClipboard` | `() => Promise<string>` | Read clipboard text |
| **Haptics** | `hapticImpact` | `(style?: 'light' \| 'medium' \| 'heavy') => Promise` | Impact feedback |
| | `hapticNotification` | `(type?: 'success' \| 'warning' \| 'error') => Promise` | Notification feedback |
| | `hapticVibrate` | `() => Promise` | Simple vibration |
| **Keep Awake** | `setKeepAwake` | `(keep: boolean) => Promise` | Toggle screen sleep lock |
| **Orientation** | `lockLandscape` | `() => Promise` | Lock to landscape |
| | `lockPortrait` | `() => Promise` | Lock to portrait |
| | `unlockOrientation` | `() => Promise` | Follow device sensor |
| **Network** | `getNetworkStatus` | `() => Promise<{connected, connectionType}>` | Current status |
| | `onNetworkChange` | `(cb) => () => void` | Subscribe to changes |
| **Share** | `share` | `(opts: {title?, text?, url?}) => Promise` | Open native share sheet |
| **Badge** | `setBadge` | `(count: number) => Promise` | Set app icon badge |
| | `clearBadge` | `() => Promise` | Clear badge |
| **Preferences** | `storeGet` | `(key: string) => Promise<string \| null>` | Read from key-value store |
| | `storeSet` | `(key: string, value: string) => Promise` | Write to key-value store |
| | `storeDelete` | `(key: string) => Promise` | Delete key |
| **Keyboard** | `hideKeyboard` | `() => Promise` | Dismiss software keyboard |
| | `onKeyboardShow` | `(cb: ({keyboardHeight}) => void) => () => void` | Keyboard appeared |
| | `onKeyboardHide` | `(cb: () => void) => () => void` | Keyboard dismissed |
| **App Lifecycle** | `onAppStateChange` | `(cb: ({isActive}) => void) => () => void` | Foreground/background |
| | `onBackButton` | `(cb: () => void) => () => void` | Android hardware back |
| | `exitApp` | `() => void` | Terminate native process |

## Haptics

`src/lib/haptics.ts` provides shorthand helpers safe to call on any platform (no-op on web/desktop):

```ts
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics';

// In a button handler:
hapticLight();   // Subtle tap
hapticMedium();  // Standard interaction
hapticSuccess(); // Confirmation
hapticError();   // Error feedback
```

Each function checks `Capacitor.isNativePlatform()` before calling the Haptics API.

## Mobile Detection

`src/hooks/use-is-mobile.ts` exports the `useIsMobile()` hook:

```ts
const isMobile = useIsMobile();
```

Returns `true` when:
1. Running inside a Capacitor native shell (even on tablets), OR
2. Viewport width is below 768px

Hydration-safe: starts as `false` on the server and updates after mount.

For non-hook contexts, use the runtime check:

```ts
import { checkIsMobile } from '@/lib/electron-bridge';
if (checkIsMobile()) { /* native mobile */ }
```

## MobileShell — Global Lifecycle Handler

`src/components/layout/MobileShell.tsx` is mounted once in the root layout and handles:

| Feature | Implementation |
|---------|---------------|
| **Status bar theming** | Observes `<html class="dark">` mutations → calls `setStatusBarDark()` / `setStatusBarLight()` |
| **Android back button** | On `/home` or `/` → `exitApp()`, otherwise `router.back()` |
| **Network detection** | Toast on disconnect ("No internet connection") and reconnect ("Back online") |
| **Keyboard tracking** | Sets `--keyboard-height` CSS variable and `keyboard-open` class on `<html>` |
| **Keyboard dismiss** | Tap outside input/textarea → `hideKeyboard()` |

## Safe Area Handling

Safe areas (notch, home indicator) are handled via CSS environment variables:

```css
/* Used in PipPlayer positioning */
bottom: calc(1rem + env(safe-area-inset-bottom, 0px));

/* Keyboard-aware layouts */
padding-bottom: var(--keyboard-height, 0px);
```

The `--keyboard-height` CSS variable is set dynamically by `MobileShell` when the keyboard opens/closes.

## CallKit & Phone Call Notifications

Voice calls integrate with native call UIs via the `CallProvider` (`src/features/friends/hooks/use-call.tsx`):

### iOS — CallKit

When a call becomes `active`, the provider shows a native CallKit UI:

```ts
import { IncomingCallKit } from '@capgo/capacitor-incoming-call-kit';
IncomingCallKit.showIncomingCall({
  callId: callIdRef.current,
  callerName: peerName || 'Nightwatch Call',
  handle: peerName || 'Voice Call',
  ios: { handleType: 'generic', supportsHolding: false },
});
```

On call end: `IncomingCallKit.endAllCalls()`.

### Android — Persistent Notification

```ts
import { PhoneCallNotification } from '@anuradev/capacitor-phone-call-notification';
PhoneCallNotification.showCallInProgressNotification({
  channelName: peerName || 'Nightwatch',
  channelDescription: 'Voice call in progress',
});
```

On call end: `PhoneCallNotification.hideCallInProgressNotification()`.

## Status Bar

The status bar style automatically follows the app's dark/light theme. `MobileShell` uses a `MutationObserver` on `<html>` to detect theme class changes and calls the appropriate bridge method.

Manual control is available via:

```ts
mobileBridge.setStatusBarDark();   // Light text (for dark backgrounds)
mobileBridge.setStatusBarLight();  // Dark text (for light backgrounds)
mobileBridge.hideStatusBar();      // Fullscreen video
mobileBridge.showStatusBar();      // Restore
```

## Keyboard Handling

Capacitor's keyboard resize is set to `None` — the app handles insets manually:

1. `MobileShell` listens to `keyboardWillShow` / `keyboardWillHide` events
2. Sets `--keyboard-height` CSS custom property on `<html>`
3. Adds/removes `keyboard-open` class for conditional styling
4. Tapping outside an input/textarea automatically dismisses the keyboard

## Downloads on Mobile

See [DOWNLOADS.md](./DOWNLOADS.md) for the full offline download system. The mobile-specific implementation lives in `src/capacitor/downloads/` and uses the Capacitor Filesystem plugin to store content in an `OfflineVault` directory.

## Picture-in-Picture

The global `PipProvider` (`src/providers/pip-provider.tsx`) handles cross-route video continuity on mobile:

- When navigating away from a video route (`/watch/`, `/live/`, `/clip/`) with a playing video, a floating mini-player appears
- When the app goes to background, native PiP is activated via `requestPictureInPicture()`
- PiP auto-closes when music starts playing (conflict resolution)

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full PiP system design.

## Development Workflow

### Prerequisites

- Xcode (iOS) or Android Studio (Android)
- Capacitor CLI: `npm install -g @capacitor/cli`
- pnpm

### Local Development

```bash
# Start Next.js dev server
pnpm dev

# Sync Capacitor and open in Xcode (iOS)
pnpm mobile:ios

# Sync Capacitor and open in Android Studio
pnpm mobile:android
```

### Physical Device Testing

Point the WebView at your Mac's LAN IP:

```bash
CAPACITOR_DEV=true CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npx cap sync ios
```

### Production Build

```bash
# Sync with production URL (https://nightwatch.in)
npx cap sync ios

# Build from Xcode: Product → Scheme → Release → ⌘R
```

### Automated Android APK Builds

The `build-android.yml` GitHub Action builds a debug APK and attaches it to GitHub Releases:

```bash
gh workflow run build-android.yml
```

## Architecture Summary

```
capacitor.config.ts                    # Capacitor configuration
src/
├── lib/
│   ├── mobile-bridge.ts               # Unified Capacitor plugin API (singleton)
│   ├── haptics.ts                     # Platform-safe haptic helpers
│   └── electron-bridge.ts            # checkIsMobile() / isMobile detection
├── hooks/
│   └── use-is-mobile.ts              # React hook for mobile detection
├── components/layout/
│   ├── MobileShell.tsx                # Global lifecycle (status bar, back button, keyboard, network)
│   └── MobileAppLifecycle.tsx         # Background/foreground state listener
├── capacitor/
│   └── downloads/                     # Mobile download manager (see DOWNLOADS.md)
│       ├── index.ts                   # Entry point, routes to providers
│       ├── state.ts                   # Persistence via Preferences
│       ├── network.ts                 # File download + Filesystem write
│       ├── processors/
│       │   ├── hls.ts                 # HLS segment-by-segment download
│       │   └── mp4.ts                 # Direct MP4 download
│       └── providers/
│           ├── s1.ts                  # Server 1 (HLS)
│           └── s2.ts                  # Server 2 (MP4 or HLS)
└── providers/
    └── pip-provider.tsx               # Cross-route PiP + native background PiP
```

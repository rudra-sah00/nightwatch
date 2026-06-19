# Desktop Application

Nightwatch provides a native desktop experience for macOS, Windows, and Linux via **Electron**. The desktop app wraps the production Next.js frontend in a lightweight native webview while providing OS-level capabilities like Discord Rich Presence, system tray controls, and media key integration.

## Installation & Troubleshooting

### macOS "App is damaged" Error
Since our project does not currently use a paid $99/yr Apple Developer Account to officially notarize the macOS builds, Apple's Gatekeeper will quarantine the app when downloaded from our GitHub releases.

If you see an error stating **"Nightwatch is damaged and can't be opened. You should move it to the Bin."**, you can bypass this security flag easily by opening your Terminal and running:

```bash
xattr -cr "/Applications/Nightwatch.app"
```
*(Note: If you extracted the app directly to your Downloads folder instead of Applications, adjust the path accordingly: `xattr -cr ~/Downloads/Watch\ Rudra.app`)*

## Architecture

The desktop app is built with Electron, using a Rust backend for native operations and the system webview for rendering:

```
src-electron/
├── electron.conf.json          # Electron configuration (window, plugins, bundle settings)
├── Cargo.toml               # Rust dependencies and plugin declarations
├── build.js                 # Electron build script
├── entitlements.plist       # macOS entitlements (camera, mic, network, JIT)
├── capabilities/
│   └── default.json         # Permission grants for the main window + remote URLs
├── icons/
│   └── icon.png             # App icon
└── src/
    ├── main.js              # App entry point, plugin registration, window setup, global shortcuts
    └── commands/
        ├── mod.js           # Module declarations
        ├── window.js        # Badge, keep-awake, theme, autostart, clipboard, notifications
        ├── tray.js          # System tray menu (Show, Play/Pause, Toggle Mic, About, Updates, Quit)
        ├── discord.js       # Discord Rich Presence via local IPC socket
        └── live_bridge.js   # Live stream relay bridge
```

### Key Design Decisions

- **Remote URL loading**: The main window loads `https://nightwatch.in` directly (not a local build). This means the desktop app always serves the latest deployed version without requiring app updates for frontend changes.
- **Electron plugins**: Store, Notification, Clipboard, Global Shortcut, Deep Link, Updater, Autostart, Shell — all registered as Electron plugins.
- **JS injection**: On window load, Rust injects a script that adds a drag region at the top of the page and attaches drag handlers to the nav element, with MutationObserver re-attachment for SPA navigation.

## Auto-Updating

The desktop app uses `electron-plugin-updater` for seamless OTA updates:

- The updater checks `https://github.com/rudra-sah00/nightwatch/releases/latest/download/latest.json` for new versions.
- When a new version is available, the app downloads and applies the update, then prompts the user to restart.
- Since the app loads a remote URL, most frontend changes don't require a desktop update at all — only Rust-side changes or Electron config changes necessitate a new binary release.

## Continuous Integration (CI) and Release Pipeline

We enforce a highly automated build and release system via `.github/workflows/build-electron.yml`:

1. **Triggers:** When a `v*` tag is pushed (typically via Release-Please after merging conventional commits), or manually via `workflow_dispatch`.
2. **Quality Gate:** Runs Biome lint, TypeScript check, and unit tests before building.
3. **Cross-Platform Build:** Installs Rust toolchain, system dependencies (Linux: webkit2gtk, appindicator, etc.), and runs `pnpm electron build` on macOS, Windows, and Ubuntu runners simultaneously.
4. **Publish:** Uses `electron-apps/electron-action` to attach `.dmg`, `.msi`/`.exe`, `.AppImage`/`.deb` installers directly to the GitHub Release.

## Local Development

To develop and test the desktop app locally:

```bash
# Install dependencies (includes @electron-apps/cli)
pnpm install

# Run Electron in development mode (starts Next.js dev server + native window)
pnpm electron:dev
```

To build a production binary locally:
```bash
pnpm electron:build
```

> **Prerequisites:** You need the Rust toolchain installed (`rustup`). On Linux, install system dependencies: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libgtk-3-dev`.

## Native Capabilities

| Feature | Implementation |
|---------|---------------|
| **System Tray** | Show/Play-Pause/Toggle Mic/About/Check Updates/Quit menu items |
| **Discord Rich Presence** | Local IPC socket connection to Discord client, broadcasts playback state |
| **Media Keys** | Global shortcuts for MediaPlayPause, MediaNextTrack, MediaPreviousTrack, MediaStop |
| **Push-to-Talk** | CmdOrCtrl+Shift+M global shortcut |
| **Dock Badge (macOS)** | Unread count via osascript |
| **Keep Awake** | `caffeinate` on macOS, `SetThreadExecutionState` on Windows |
| **Deep Linking** | `nightwatch://` protocol registered with the OS |
| **Auto-Start** | `electron-plugin-autostart` with LaunchAgent on macOS |
| **Clipboard** | Native clipboard write via `electron-plugin-clipboard-manager` |
| **Notifications** | Native OS notifications via `electron-plugin-notification` |
| **Persistent Store** | Key-value store via `electron-plugin-store` (replaces localStorage for desktop-specific prefs) |
| **Live Bridge** | Relay bridge for livestream data |
| **Window Dragging** | Injected drag region at top + nav element drag support |
| **Fullscreen Events** | Emits `window-fullscreen-changed`, `window-focus`, `window-blur` to frontend |

## Integrating with the Next.js Web App

The web and desktop apps share the exact same Next.js codebase. All native interactions are piped through a single bridge module:

### `src/lib/electron-bridge.ts`

The bridge detects the Electron environment via `window.electronAPI` or `window.electronAPI` and provides a unified API. In browser environments, all methods are safe no-ops.

Key exports:
- `isDesktop` / `isElectron` — Boolean detection flags
- `checkIsDesktop()` — Function for use in useState initializers (hydration-safe)
- `desktopBridge` — Object with all native methods (Discord, clipboard, store, badge, etc.)

### `src/hooks/use-desktop-app.ts`

A React hook that wraps the bridge for component use:

- `isDesktopApp` — Whether running inside Electron
- `isBrowser` — Inverse of above
- `isMacOS` / `isWindows` — OS detection
- `openInDesktopApp()` — Deep-link fallback: tries `nightwatch://` protocol, shows install prompt if app not installed
- `getDesktopTopPaddingClass(isFullscreen)` — Returns `pt-8` for the titlebar overlay region (collapses in fullscreen)
- `copyToClipboard(text)` — Uses native clipboard in desktop, `navigator.clipboard` in browser
- `dragStyle` / `noDragStyle` — CSS properties for `-webkit-app-region`

### Electron Command Invocation

Frontend code calls Rust commands via:
```typescript
import { invoke } from '@electron-apps/api/core';
await invoke<ReturnType>('command_name', { arg1: value1 });
```

Event listening:
```typescript
import { listen } from '@electron-apps/api/event';
const unlisten = await listen<PayloadType>('event-name', (event) => {
  console.log(event.payload);
});
```

### Capabilities & Permissions

The `src-electron/capabilities/default.json` file grants permissions to the main window for both local (`http://localhost:*/*`) and production (`https://nightwatch.in/*`) URLs. All window manipulation, plugin access, and drag operations are explicitly permitted here.

## Desktop Browser Login

Since the Electron app loads a remote URL, it cannot rely on browser cookies for authentication. Instead, it delegates login to the user's default browser via a one-time code exchange:

1. The app calls `POST /api/auth/desktop/initiate` to get a one-time `code`.
2. It opens the default browser to `https://nightwatch.in/login?desktopCode={code}`.
3. The user authenticates normally (email + OTP). The `desktopCode` is forwarded during OTP verification, linking the code to the user on the backend.
4. The app polls `POST /api/auth/desktop/exchange` with the code until it receives tokens.
5. Tokens are stored in the Electron persistent store (`electron-plugin-store`) and injected into subsequent webview requests.

### Why not in-app login?

The remote URL approach means the webview shares the production domain's cookies, but Electron's webview cookie jar is sandboxed differently across platforms. Delegating to the system browser ensures Turnstile bot protection works correctly and avoids cross-origin cookie issues.

## ASAR Differential Updater

Starting with v1.32.0, the desktop app uses **ASAR differential updates** instead of full binary downloads:

- On update check, the updater downloads only the binary diff between the current and new ASAR archive.
- The diff is applied locally using `bsdiff`/`bspatch` to reconstruct the new ASAR.
- This reduces typical update sizes from ~80 MB to ~2–5 MB.

### How it works

1. The CI pipeline generates `.asar.diff` files alongside full installers during the release build.
2. `latest.json` now includes a `differentialUpdate` field with the diff URL and expected hash.
3. The Electron updater checks if a diff is available for the current version. If so, it downloads the diff, patches the local ASAR, and verifies the SHA-256 hash. If verification fails, it falls back to a full download.

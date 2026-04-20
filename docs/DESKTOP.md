# Desktop Application

Watch Rudra provides a native desktop experience for macOS, Windows, and Linux via **Tauri v2**. The desktop app wraps the production Next.js frontend in a lightweight native webview while providing OS-level capabilities like Discord Rich Presence, offline media downloads, system tray controls, and media key integration.

## Installation & Troubleshooting

### macOS "App is damaged" Error
Since our project does not currently use a paid $99/yr Apple Developer Account to officially notarize the macOS builds, Apple's Gatekeeper will quarantine the app when downloaded from our GitHub releases.

If you see an error stating **"Watch Rudra is damaged and can't be opened. You should move it to the Bin."**, you can bypass this security flag easily by opening your Terminal and running:

```bash
xattr -cr "/Applications/Watch Rudra.app"
```
*(Note: If you extracted the app directly to your Downloads folder instead of Applications, adjust the path accordingly: `xattr -cr ~/Downloads/Watch\ Rudra.app`)*

## Architecture

The desktop app is built with Tauri v2, using a Rust backend for native operations and the system webview for rendering:

```
src-tauri/
├── tauri.conf.json          # Tauri configuration (window, plugins, bundle settings)
├── Cargo.toml               # Rust dependencies and plugin declarations
├── build.rs                 # Tauri build script
├── entitlements.plist       # macOS entitlements (camera, mic, network, JIT)
├── capabilities/
│   └── default.json         # Permission grants for the main window + remote URLs
├── icons/
│   └── icon.png             # App icon
└── src/
    ├── main.rs              # App entry point, plugin registration, window setup, global shortcuts
    └── commands/
        ├── mod.rs           # Module declarations
        ├── window.rs        # PiP, badge, keep-awake, theme, autostart, clipboard, notifications
        ├── tray.rs          # System tray menu (Show, Play/Pause, Toggle Mic, About, Updates, Quit)
        ├── discord.rs       # Discord Rich Presence via local IPC socket
        ├── downloads.rs     # Secure offline download manager (HLS/MP4, pause/resume, crash recovery)
        ├── live_bridge.rs   # Live stream relay bridge
        └── protocol.rs      # Custom `offline-media://` protocol for offline playback
```

### Key Design Decisions

- **Remote URL loading**: The main window loads `https://watch.rudrasahoo.live` directly (not a local build). This means the desktop app always serves the latest deployed version without requiring app updates for frontend changes.
- **Tauri plugins**: Store, Notification, Clipboard, Global Shortcut, Deep Link, Updater, Autostart, Shell — all registered as Tauri v2 plugins.
- **JS injection**: On window load, Rust injects a script that adds a drag region at the top of the page and attaches drag handlers to the nav element, with MutationObserver re-attachment for SPA navigation.

### Secure Offline Downloads

The Rust download manager (`commands/downloads.rs`) handles:

1. **HLS stream downloading**: Parses `.m3u8` playlists, downloads all `.ts` segments concurrently, and rewrites the playlist to reference local files.
2. **MP4 direct downloads**: Streams large files with progress tracking and pause/resume support.
3. **Crash recovery**: Download state is persisted to disk. On app restart, incomplete downloads are automatically resumed.
4. **Custom protocol**: The `offline-media://` protocol (registered in `commands/protocol.rs`) serves downloaded content directly from the local filesystem to the webview, enabling offline playback without a local HTTP server.
5. **Encryption**: Downloaded media segments are encrypted at rest using AES-CTR with a per-installation random key stored in the app data directory.

### Offline Mode / PWA Service Worker

The desktop app supports full offline startup via a PWA Service Worker powered by **[@serwist/next](https://serwist.pages.dev/docs/next)** in **configurator mode** (Turbopack-compatible).

**How it works:**

1. On the first online launch, the Service Worker (`/sw.js`) installs and precaches all JS chunks, CSS, and statically prerendered pages.
2. On subsequent offline launches, the webview attempts to load the production URL. The Service Worker intercepts the navigation and returns the cached app shell.
3. If the cache is empty (first-ever launch without internet), the page displays an offline error state.

**Vercel Firewall Configuration (production):**

The production deployment requires a Firewall bypass rule so the Service Worker file and Next.js static chunks are served without being challenged by Vercel's Attack Challenge Mode:

- **Vercel Dashboard → `watch-rudra` project → Firewall → Rules → Custom Rules → Add Rule**
  - Name: `Allow SW & Static Assets`
  - If: `Request Path` starts with `/_next/` → **Bypass**
  - **OR** If: `Request Path` equals `/sw.js` → **Bypass**

**How the service worker is built:**

We use `@serwist/cli` in configurator mode (not `withSerwistInit`) because Next.js 16 uses Turbopack which is incompatible with the old webpack-based approach:

```
next build && serwist build
```

The `serwist.config.js` file in the project root configures the CLI.

## Auto-Updating

The desktop app uses `tauri-plugin-updater` for seamless OTA updates:

- The updater checks `https://github.com/rudra-sah00/watch-rudra/releases/latest/download/latest.json` for new versions.
- When a new version is available, the app downloads and applies the update, then prompts the user to restart.
- Since the app loads a remote URL, most frontend changes don't require a desktop update at all — only Rust-side changes or Tauri config changes necessitate a new binary release.

## Continuous Integration (CI) and Release Pipeline

We enforce a highly automated build and release system via `.github/workflows/build-tauri.yml`:

1. **Triggers:** When a `v*` tag is pushed (typically via Release-Please after merging conventional commits), or manually via `workflow_dispatch`.
2. **Quality Gate:** Runs Biome lint, TypeScript check, and unit tests before building.
3. **Cross-Platform Build:** Installs Rust toolchain, system dependencies (Linux: webkit2gtk, appindicator, etc.), and runs `pnpm tauri build` on macOS, Windows, and Ubuntu runners simultaneously.
4. **Publish:** Uses `tauri-apps/tauri-action` to attach `.dmg`, `.msi`/`.exe`, `.AppImage`/`.deb` installers directly to the GitHub Release.

## Local Development

To develop and test the desktop app locally:

```bash
# Install dependencies (includes @tauri-apps/cli)
pnpm install

# Run Tauri in development mode (starts Next.js dev server + native window)
pnpm tauri:dev
```

To build a production binary locally:
```bash
pnpm tauri:build
```

> **Prerequisites:** You need the Rust toolchain installed (`rustup`). On Linux, install system dependencies: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libgtk-3-dev`.

## Native Capabilities

| Feature | Implementation |
|---------|---------------|
| **Picture-in-Picture** | Resizes window to 480×270, pins always-on-top, restores original bounds on exit |
| **System Tray** | Show/Play-Pause/Toggle Mic/About/Check Updates/Quit menu items |
| **Discord Rich Presence** | Local IPC socket connection to Discord client, broadcasts playback state |
| **Media Keys** | Global shortcuts for MediaPlayPause, MediaNextTrack, MediaPreviousTrack, MediaStop |
| **Push-to-Talk** | CmdOrCtrl+Shift+M global shortcut |
| **Dock Badge (macOS)** | Unread count via osascript |
| **Keep Awake** | `caffeinate` on macOS, `SetThreadExecutionState` on Windows |
| **Deep Linking** | `watch-rudra://` protocol registered with the OS |
| **Auto-Start** | `tauri-plugin-autostart` with LaunchAgent on macOS |
| **Clipboard** | Native clipboard write via `tauri-plugin-clipboard-manager` |
| **Notifications** | Native OS notifications via `tauri-plugin-notification` |
| **Persistent Store** | Key-value store via `tauri-plugin-store` (replaces localStorage for desktop-specific prefs) |
| **Offline Downloads** | HLS/MP4 download with AES encryption, pause/resume, crash recovery |
| **Live Bridge** | Relay bridge for livestream data |
| **Window Dragging** | Injected drag region at top + nav element drag support |
| **Fullscreen Events** | Emits `window-fullscreen-changed`, `window-focus`, `window-blur` to frontend |

## Integrating with the Next.js Web App

The web and desktop apps share the exact same Next.js codebase. All native interactions are piped through a single bridge module:

### `src/lib/tauri-bridge.ts`

The bridge detects the Tauri environment via `window.__TAURI__` or `window.__TAURI_INTERNALS__` and provides a unified API. In browser environments, all methods are safe no-ops.

Key exports:
- `isDesktop` / `isTauri` — Boolean detection flags
- `checkIsDesktop()` — Function for use in useState initializers (hydration-safe)
- `desktopBridge` — Object with all native methods (Discord, clipboard, store, PiP, badge, downloads, etc.)

### `src/hooks/use-desktop-app.ts`

A React hook that wraps the bridge for component use:

- `isDesktopApp` — Whether running inside Tauri
- `isBrowser` — Inverse of above
- `isMacOS` / `isWindows` — OS detection
- `openInDesktopApp()` — Deep-link fallback: tries `watch-rudra://` protocol, shows download prompt if app not installed
- `getDesktopTopPaddingClass(isFullscreen)` — Returns `pt-8` for the titlebar overlay region (collapses in fullscreen)
- `copyToClipboard(text)` — Uses native clipboard in desktop, `navigator.clipboard` in browser
- `dragStyle` / `noDragStyle` — CSS properties for `-webkit-app-region`

### Tauri Command Invocation

Frontend code calls Rust commands via:
```typescript
import { invoke } from '@tauri-apps/api/core';
await invoke<ReturnType>('command_name', { arg1: value1 });
```

Event listening:
```typescript
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen<PayloadType>('event-name', (event) => {
  console.log(event.payload);
});
```

### Capabilities & Permissions

The `src-tauri/capabilities/default.json` file grants permissions to the main window for both local (`http://localhost:*/*`) and production (`https://watch.rudrasahoo.live/*`) URLs. All window manipulation, plugin access, and drag operations are explicitly permitted here.

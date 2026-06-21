# Desktop Application

Nightwatch provides a native desktop experience for macOS, Windows, and Linux via **Electron** with a **Node.js** backend. The desktop app wraps the production Next.js frontend in a BrowserWindow while providing OS-level capabilities like Discord Rich Presence, system tray controls, media key integration, and auto-updates.

## Installation & Troubleshooting

### macOS "App is damaged" Error

Since our project does not currently use a paid $99/yr Apple Developer Account to officially notarize the macOS builds, Apple's Gatekeeper will quarantine the app when downloaded from our GitHub releases.

If you see an error stating **"Nightwatch is damaged and can't be opened. You should move it to the Bin."**, bypass this by running:

```bash
xattr -cr "/Applications/Nightwatch.app"
```

## Architecture

The desktop app is built with **Electron + Node.js** (plain JavaScript modules — no Rust, no TypeScript compilation). The main process loads the production Next.js URL (`https://nightwatch.in`) in a BrowserWindow, and a preload script exposes native APIs to the renderer via `contextBridge`.

```
electron/
├── main.js                  # App entry point: single-instance lock, GPU flags, window creation, module orchestration
├── preload.js               # contextBridge → exposes window.electronAPI to the renderer
├── preload-splash.js        # Minimal preload for the splash/loading screen
├── modules/
│   ├── constants.js         # Shared constants (PROD_URL)
│   ├── window.js            # BrowserWindow creation, configuration, and lifecycle
│   ├── ipc-handlers.js      # All IPC main↔renderer handlers (clipboard, badge, keep-awake, theme, store, notifications)
│   ├── discord.js           # Discord Rich Presence via discord-rpc IPC socket
│   ├── tray.js              # System tray icon and context menu
│   ├── updater.js           # Auto-updater (electron-updater + ASAR hot-swap)
│   ├── splash.js            # Splash screen window during initial load
│   ├── deep-link.js         # nightwatch:// protocol handler
│   └── version.js           # App version resolution from package.json
└── platform/
    ├── macos.js             # macOS application menu, open-url handler, dock behavior
    ├── windows.js           # Windows protocol registration, taskbar features
    └── linux.js             # Linux protocol registration, desktop entry
```

### Key Design Decisions

- **Remote URL loading**: The main window loads `https://nightwatch.in` directly (not a local build). The desktop app always serves the latest deployed version without requiring app updates for frontend changes.
- **CJS modules**: The `electron/` directory uses CommonJS (`require`/`module.exports`). The sole exception is `electron-store` v11 (ESM-only), which is loaded via dynamic `import()`.
- **Preload isolation**: All renderer↔main communication goes through `contextBridge.exposeInMainWorld('electronAPI', {...})`. The renderer never has direct access to Node.js APIs.
- **Platform modules**: OS-specific logic (menus, protocol registration, quit behavior) is cleanly separated into `platform/` files.

## Local Development

```bash
# Install dependencies
pnpm install

# Run Electron in development mode (loads localhost:3000 — start Next.js dev server first)
pnpm desktop:start
```

To build production binaries locally:

```bash
pnpm desktop:build
```

This runs `electron-builder` for macOS, Windows, and Linux, outputting installers to the `desktop-build/` directory.

## Preload Script Pattern (`window.electronAPI`)

The preload script (`electron/preload.js`) uses Electron's `contextBridge` to expose a flat API object on `window.electronAPI`. Every method is either a fire-and-forget `ipcRenderer.send()` or an async `ipcRenderer.invoke()`:

```js
contextBridge.exposeInMainWorld('electronAPI', {
  updateDiscordPresence: (data) => ipcRenderer.send('update-discord-status', data),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  setKeepAwake: (enabled) => ipcRenderer.send('toggle-keep-awake', enabled),
  onMediaCommand: (callback) => { /* subscribe + return unsubscribe fn */ },
  // ... ~25 methods total
});
```

Event listeners (media keys, window focus/blur, fullscreen changes, notifications) return an unsubscribe function for cleanup.

## Frontend Bridge (`src/lib/electron-bridge.ts`)

The web and desktop apps share the exact same Next.js codebase. All native interactions flow through a single bridge module that wraps `window.electronAPI`:

```typescript
import { desktopBridge, isDesktop } from '@/lib/electron-bridge';
```

### Key Exports

| Export | Description |
|--------|-------------|
| `isDesktop` | `true` when running inside Electron (checks `'electronAPI' in window`) |
| `isMobile` | `true` when running inside Capacitor |
| `isTV` | `true` when running on Android TV |
| `checkIsDesktop()` | Runtime re-evaluation (safe in `useState` initializers) |
| `desktopBridge` | Singleton object with all native methods |

### Bridge Behavior

- **In Electron**: Every method delegates to `window.electronAPI.*` from the preload script.
- **Outside Electron**: Every method is a safe no-op (returns `undefined`, empty string, or does nothing). This lets UI code call bridge methods unconditionally without platform guards.

## Native Capabilities

| Feature | Implementation |
|---------|---------------|
| **Discord Rich Presence** | `discord-rpc` package, local IPC socket to Discord client, broadcasts current playback state |
| **System Tray** | Show Interface / Play-Pause / Toggle Mic / About / Check Updates / Quit |
| **Media Keys** | Global shortcuts: MediaPlayPause, MediaNextTrack, MediaPreviousTrack, MediaStop |
| **Window Controls** | `windowMinimize()`, `windowMaximize()`, `windowClose()`, `toggleFullscreen()` |
| **Keep Awake** | `powerSaveBlocker.start('prevent-display-sleep')` — prevents lock screen during streams |
| **Native Theme Sync** | `nativeTheme.themeSource` set from React theme state |
| **Unread Badge** | macOS Dock badge + bounce, Windows taskbar overlay |
| **Run on Boot** | `app.setLoginItemSettings()` — configurable from settings UI |
| **Key-Value Store** | `electron-store` — persistent JSON config in userData (desktop-specific preferences) |
| **Call State** | `setCallActive(true/false)` — prevents sleep and shows call indicator |
| **Deep Linking** | `nightwatch://` protocol registered with the OS |
| **Clipboard** | Native clipboard write via `clipboard.writeText()` |
| **Notifications** | Native OS notifications with action buttons and click handlers |
| **Fullscreen Events** | Emits `window-fullscreen-changed`, `window-focus`, `window-blur` to frontend |
| **Push-to-Talk** | CmdOrCtrl+Shift+M global shortcut |

## Auto-Updating

The desktop app uses **two update strategies**:

### 1. ASAR Hot-Swap (Primary)

For most updates, only the JavaScript bundle changes. The updater downloads a compressed `app.asar.gz` from GitHub Releases, verifies its SHA-256 checksum, decompresses it, and stages it as `app.asar.pending`. On next launch, `main.js` detects the pending file, swaps it in, and relaunches — no full installer download needed.

### 2. Full Binary Update (Fallback)

For native dependency changes, `electron-updater` (`autoUpdater`) downloads and installs full platform installers (`.dmg`, `.exe`, `.AppImage`). Users are prompted to restart.

The updater checks `https://api.github.com/repos/rudra-sah00/nightwatch/releases/latest` for new versions.

## Continuous Integration & Release Pipeline

Automated builds run via `.github/workflows/build-electron.yml`:

1. **Trigger**: Push a `v*` tag (e.g., `gh release create v1.32.0 --title "v1.32.0" --notes "..."`)
2. **Quality Gate**: Biome lint, TypeScript check, and Vitest unit tests
3. **Cross-Platform Build**: Runs `electron-builder` on macOS (arm64), Windows, and Ubuntu runners simultaneously
4. **Artifacts**: Attaches `.dmg`, `.msi`/`.exe`, `.AppImage`/`.deb` installers + `app.asar.gz` + `app.asar.gz.sha256` to the GitHub Release
5. **macOS Re-signing**: Runs `scripts/resign-mac.sh` post-build for ad-hoc code signing

```bash
# Trigger a release
gh release create v1.33.0 --title "v1.33.0 - Desktop Update" --notes "Release notes..."
```

## Service Worker

The desktop app benefits from the same Workbox service worker (`public/sw.js`) used in the browser. It caches `/_next/static/` JS/CSS chunks via CacheFirst, preventing hard reloads when the webview needs to re-fetch evicted chunks during long sessions. This keeps music playback and real-time connections alive across navigations.

## Health & Recovery

The app tracks consecutive crashes via `electron-store`. If the renderer fails to signal readiness (`signalReady()` from React after hydration), the crash counter increments. After repeated failures, the app can clear caches and reload via `clearCacheAndReload()`.

CLI escape hatch for stuck states:

```bash
# Launch with cache cleared
Nightwatch.app --clear-cache

# Disable GPU acceleration (fixes green-screen video bugs)
Nightwatch.app --disable-gpu
```

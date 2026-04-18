# Desktop Application

Watch Rudra provides a native desktop experience for macOS, Windows, and Linux via **Electron**. The desktop app acts as a secure, optimized wrapper around the Next.js frontend while providing native capabilities like discord rich presence, raw media access, and offline fallback screens.

## Installation & Troubleshooting

### macOS "App is damaged" Error
Since our project does not currently use a paid $99/yr Apple Developer Account to officially notarize the macOS builds, Apple's Gatekeeper will quarantine the app when downloaded from our GitHub releases.

If you see an error stating **"Watch Rudra is damaged and can't be opened. You should move it to the Bin."**, you can bypass this security flag easily by opening your Terminal and running:

```bash
xattr -cr "/Applications/Watch Rudra.app"
```
*(Note: If you extracted the app directly to your Downloads folder instead of Applications, adjust the path accordingly: `xattr -cr ~/Downloads/Watch\ Rudra.app`)*

## Architecture

The desktop structure cleanly separates the Electron `main` processes from the Next.js `renderer` layer:

- **`electron/main.js`**: The entry point for the Electron application. Manages browser windows, application lifecycle, and inter-process communication (IPC).
- **`electron/preload.js`**: Provides a secure bridge for the frontend UI to communicate safely with the Node.js backend without exposing Electron logic.
- **`electron/modules/discord.js`**: Handles **Discord Rich Presence**, broadcasting your current Watch Party status and media playback to your Discord profile.
- **`electron/modules/download-manager.js`** & **`electron/modules/downloads/`**: Responsible for the master **Secure Offline Download** pipeline. Processes files from providers (`s1.js`, `s2.js`, `s3.js`), downloads `.ts`/`.mp4` streams, manages DRM via cipher streams, and synchronizes offline completion.
- **`electron/modules/splash.js`**: Renders a frameless, Neo-Brutalist styled startup splash screen to check for updates before the main application window is loaded.
- **`electron/modules/updater.js`**: Handles the auto-update lifecycle with instant offline detection via `net.isOnline()`.
- **`electron/modules/window.js`**: Controls the main application window lifecycle, navigation security policies, and offline fallback routing via the Service Worker bridge.
- **`electron/build/offline-bridge.html`**: A local HTML proxy page that triggers the PWA Service Worker when the app launches offline.

### Secure Offline Downloads (DRM & Vaulting)

To protect the media locally while maintaining native integration capabilities, our Electron desktop layer deploys an XOR Stream mechanism (`XorStream` within `electron/modules/downloads/cipher.js`).

1. **Native Electron Keychain Engine**:
    * Instead of relying on insecure static strings for our backend vault, Electron uses `safeStorage` to leverage the host OS keyring mechanisms natively (Keychain on macOS / DPAPI on Windows / libsecret on Linux).
2. **Byte Persisting**:
    * During the initial startup lifecycle, `crypto.randomBytes(32)` dictates a secure sequence. The data byte entropy is written and stored persistently directly in your `app.getPath('userData')` structure via `.encryptString`.
3. **Data Bridging**:
    * Download states update smoothly against the Next.js web application utilizing standard React context and component polling, without exposing the raw `.mp4` payloads visually.

### Offline Mode / PWA Service Worker

The desktop app supports full offline startup via a PWA Service Worker powered by **[@serwist/next](https://serwist.pages.dev/docs/next)** in **configurator mode** (Turbopack-compatible).

**How it works end-to-end:**

1. On the first online launch, the Service Worker (`/sw.js`) installs and precaches ~87 URLs (~7MB) — all JS chunks, CSS, and statically prerendered pages.
2. On subsequent offline launches, the updater detects no network via `net.isOnline()` and **immediately** skips the update check (no 15-second wait).
3. The main window attempts to load `https://watch.rudrasahoo.live`. If the network is unavailable, `did-fail-load` triggers.
4. Electron loads the local **offline bridge** (`electron/build/offline-bridge.html`), which calls `window.location.replace(productionUrl)` to trigger the Service Worker cache.
5. The Service Worker intercepts the navigation and returns the cached app shell, loading the app instantly while offline.
6. If the cache is empty (first-ever launch without internet), the bridge displays a **"OFFLINE CACHE EXPIRED"** error state instead of a blank screen, preventing infinite loops.

**Security note:** The `will-navigate` event whitelists only `offline-bridge.html` from the `file://` protocol — dragging arbitrary local files into the window is blocked at the Electron security layer.

**Testing offline locally:**
```bash
# 1. Build the production Next.js bundle + service worker
pnpm build

# 2. Start production server (localhost:3000)
pnpm start

# 3. Open Electron pointing to localhost (bypasses Vercel firewall entirely)
TEST_PROD=1 pnpm desktop:start

# 4. Wait for the SW to install (check DevTools → Application → Service Workers)
# 5. Quit the app, disconnect Wi-Fi, then run step 3 again
```

**Vercel Firewall Configuration (production):**

The production deployment requires a Firewall bypass rule so the Service Worker file and Next.js static chunks are served without being challenged by Vercel's Attack Challenge Mode:

- **Vercel Dashboard → `watch-rudra` project → Firewall → Rules → Custom Rules → Add Rule**
  - Name: `Allow SW & Static Assets`
  - If: `Request Path` starts with `/_next/` → **Bypass**
  - **OR** If: `Request Path` equals `/sw.js` → **Bypass**

**How the service worker is built:**

We use `@serwist/cli` in configurator mode (not `withSerwistInit`) because Next.js 16 uses Turbopack which is incompatible with the old webpack-based approach. The build pipeline is:

```
next build && serwist build
```

The `serwist.config.js` file in the project root configures the CLI and `SerwistProvider` in `src/app/layout.tsx` handles client-side registration.

## Auto-Updating & ASAR Hot Replacements

The desktop app features seamless OTA (Over-The-Air) updates. We use two mechanisms depending on the scope of the update:
1. **Major/Minor Updates**: Handled by `electron-updater` reading from the `.dmg` or `.exe` distributed via GitHub Releases.
2. **Patch/Hotfix Updates**: To avoid forcing users to download an entire new binary, the app uses `electron-asar-hot-updater`. It quietly downloads a patched `app.asar` file in the background and gracefully prompts the user to restart, providing a frictionless "Discord-like" update flow.

**Instant Offline Detection:** The updater calls `net.isOnline()` synchronously at startup. If the device has no internet, the splash screen dismisses in 1 second rather than waiting for the full 15-second safety timeout.

## Continuous Integration (CI) and Release Pipeline

We enforce a highly automated build and release system:

1. **Triggers:** No manual build is required. When a PR is merged into `main` using standard conventional commits (`feat`, `fix`), our **Release-Please** Action automatically bumps the version in `package.json` and creates a GitHub Release Tag.
2. **Action Chaining:** Once `release.yml` successfully publishes the new version, the workflow directly calls the `build-desktop.yml` pipeline (`workflow_call`).
3. **Cross-Platform Build:** `electron-builder` checks out the code, injects necessary secrets (`NEXT_PUBLIC_SENTRY_DSN`, `DISCORD_CLIENT_ID`), and simultaneously builds `macOS` (ARM & Intel), `Windows`, and `Linux` binaries.
4. **Publish:** Artifacts are automatically attached directly back to the GitHub Release draft for immediate public download.

## Local Development

If you want to test desktop features locally:

1. Start the Next.js server in development mode: `pnpm dev`
2. Run the Electron development wrapper:
```bash
pnpm run desktop:start
```

> **Note:** The Service Worker is disabled in development (`NODE_ENV !== 'production'`). To test offline mode locally you must run `pnpm build && pnpm start` and use `TEST_PROD=1 pnpm desktop:start`.

## Native Capabilities
- **Permissions**: Prompts native OS popups for Media and Microphone access (necessary for Agora Video/Audio chat during Watch Parties).
- **Window Management**: Restores last window size, placement, and full-screen state via `electron-window-state`.
- **Deep Linking**: Registers the custom `watch-rudra://` protocol handler directly with the OS so web links can spawn and join Watch Parties natively in the desktop client.

## Integrating with the Next.js Web App

Watch Rudra's web and desktop apps share the exact same Next.js codebase. To prevent polluting React components with aggressive `typeof window !== "undefined"` checks everywhere we need native OS features, we pipe all interactions through a single hook:

### `src/hooks/use-desktop-app.ts`

This globally binds `window.electronAPI` to React.

*   `isDesktopApp`: Boolean flag to accurately show/hide Desktop-only features natively.
*   `openInDesktopApp()`: A deep-linking fallback heuristic utilizing `document.hidden` and asynchronous `setTimeout`. If a browser fails to redirect the custom protocol (`watch-rudra://`) within 2000 milliseconds, it alerts the user to download the `.dmg` or `.exe`.
*   `getDesktopTopPaddingClass(isFullscreen)`: Provides strict styling logic targeting the Electron frameless 32px top-bar. It safely outputs `pt-8` padding natively, dynamically fading to `0` whenever `toggleFullscreen` triggers Chromium OS-level maximize states, preventing black gaps at the top of the Sidebar.
*   `copyToClipboard(text)`: Abstracts OS Clipboard writes conditionally depending on the environment.

### Electron IPC Bridging (`src/types/electron.d.ts`)

For Typescript stability, all `ipcRenderer.send()` commands are strongly typed:

*   **`updateDiscordPresence`**: Maps party numbers to Discord.
*   **`toggleFullscreen`**: Discards generic Chromium HTML5 HTML bounds (`webkitRequestFullscreen`). Electron calls this explicitly so the Watch Party DOM doesn't trap the user inside a simulated video canvas.
*   **`onFullscreenChanged`**: Allows the React tree to listen natively for OS-level Mac/Windows window maximize and minimize events.

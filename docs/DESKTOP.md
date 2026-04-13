# Desktop Application

Watch Rudra provides a native desktop experience for macOS, Windows, and Linux via **Electron**. The desktop app acts as a secure, optimized wrapper around the Next.js frontend while providing native capabilities like discord rich presence, raw media access, and offline fallback screens.

## Architecture

The desktop structure cleanly separates the Electron `main` processes from the Next.js `renderer` layer:

- **`electron/main.js`**: The entry point for the Electron application. Manages browser windows, application lifecycle, and inter-process communication (IPC).
- **`electron/preload.js`**: (If used) Provides a secure bridge for the frontend UI to communicate with the Node.js backend.
- **`electron/modules/discord.js`**: Handles **Discord Rich Presence**, broadcasting your current Watch Party status and media playback to your Discord profile.
- **`electron/modules/splash.js`**: Renders a frameless, Neo-Brutalist styled startup splash screen to check for updates before the main application window is loaded.
- **`electron/modules/updater.js`**: Handles the auto-update lifecycle.

## Auto-Updating & ASAR Hot Replacements

The desktop app features seamless OTA (Over-The-Air) updates. We use two mechanisms depending on the scope of the update:
1. **Major/Minor Updates**: Handled by `electron-updater` reading from the `.dmg` or `.exe` distributed via GitHub Releases.
2. **Patch/Hotfix Updates**: To avoid forcing users to download an entire new binary, the app uses `electron-asar-hot-updater`. It quietly downloads a patched `app.asar` file in the background and gracefully prompts the user to restart, providing a frictionless "Discord-like" update flow.

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

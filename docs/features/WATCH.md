# VOD & Watch Feature Specifications

## Overview
The `watch` directory handles the core Video On-Demand (VOD) playback experience. This is the primary consumption layer for uploaded or processed video content.

## Directory Structure
`src/features/watch/`
- `components/`: Contains the `VideoPlayer`, `QualitySelector`, `TheaterModeToggle`, and transcript UI elements.
- `hooks/`: 
  - `useHls.ts`: The primary HLS.js integration binding standard `.m3u8` streams to the `<video>` element natively.
  - `usePlayerState.ts`: Manages localized playback state (buffering, playing, seeking, volume).
- `api.ts`: Dedicated endpoints for fetching stream metadata, available qualities, and logging video heatmaps/analytics.

## Core Mechanics
1. **HLS Integration (`useHls.ts`)**
   We do not use an off-the-shelf heavy player like Video.js by default. We natively wrap an HTML5 `<video>` element with HLS.js on the client-side to maintain maximum control over buffer health and DRM/signed-url ticket rotation.
2. **Theater & Fullscreen Architecture**
   - The player supports normal, theater (CSS-driven expansion), and native fullscreen.
   - **Important:** As detailed in [DESKTOP.md](../DESKTOP.md), if `isDesktopApp` is true, clicking "Fullscreen" actively triggers a Electron invoke (`desktopBridge.toggleFullscreen()`) instead of the standard WebKit DOM wrapper fullscreen, guaranteeing the system webview natively fills the screen without trapping UI elements.
3. **Analytics Syncing**
   - Playback progress is periodically flushed to the server using the `apiFetch` utility to remember where the user left off.

## Future VOD Upgrades
- SCTE-35 ad-marker parsing.
- Enhanced dual-audio track selection via advanced HLS manifests.

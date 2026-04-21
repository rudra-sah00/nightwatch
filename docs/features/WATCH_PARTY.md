# Watch Party Engine (Co-watching)

## Overview
The Watch Party operates identically to real-time Discord streams mapping localized video consumption to distributed users dynamically.

## Directory Structure
`src/features/watch-party/`
- `components/`: `WatchPartySidebar`, `ChatTimeline`, `MemberAvatars`.
- `hooks/`: `useWatchPartyFullscreen` (Desktop interception bindings), `useWatchPartySocket`.
- `room/`: Specialized encapsulation for P2P connection logic specifically decoupling normal UI from WebRTC loops.

## Critical Architectural Choices
1. **Desktop Native Window Interception**
   - **Crucial Fix:** As mapped centrally in the `useWatchPartyFullscreen.ts` hook: Instead of attempting a DOM-native HTML5 wrapper on the system webview (which pushes the Electron drop-frame into the view, bricking the SideBar drag handles), we actively emit a Electron invoke `desktopBridge.toggleFullscreen()` triggering native OS-level resizing.
   - This bypasses all sandbox traps ensuring complete theater control.

2. **Decoupled Route Handling**
   - Housed strictly under `src/app/(party)/` Next.js groupings. This deliberately ensures changing the URL path inside the party does not structurally unmount the WebSocket connections.

3. **Socket Orchestration**
   - We utilize `useWatchPartySocket.ts` directly binding the socket to Next's React context lifecycle, ensuring we don't accidentally leak multiple peer connections under strict mode renders.

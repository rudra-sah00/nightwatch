# Livestreaming Features

This document explains the technical architecture of the livestreaming section.

## Server 1 (24/7 Channels + Dynamic Events)
Rendered by `Server1Channels.tsx`.

### Desktop-Only Premium Restriction
Channels originating from Server 1 are considered premium and therefore are protected against direct browser scraping by forcing them into the Electron Desktop application bounds.
1. The frontend (`live/[id]/page.tsx`) checks if a stream's `match.playPath` starts with `s1://` or `match.id` starts with `s1:`.
2. It strictly validates `typeof window !== 'undefined' && 'electronAPI' in window`. 
3. If accessed from a standard browser, an error screen intercepts the HLS player rendering advising the user: "Premium channels require the Desktop App."

### LiveBridge (Electron Proxy)
Relying on a standard web browser `video` tag is insufficient for Server 1 because complex authentications, cookie headers, or bespoke token-fetching require node-level network interception. 
- The Electron frontend calls `window.electronAPI.startLiveBridge({ url, channelId, referer })`.
- Within the OS sandbox, `electron/modules/live-bridge.js` mounts an invisible backend Chromium window (`BrowserWindow`) to mimic a full user-agent lifecycle.
- It dynamically intercepts HTTP streams and parses them through a persistent Node.js `http.createServer()` local proxy loop (`http://localhost:{PROXY_PORT}`).
- Once resolved, the IPC event `onLiveBridgeResolved` signals the React frontend, passing back the local `result.hlsUrl` which the `WatchLivePlayer` mounts securely without risking CORS blocks or external token expiration.

### Skeleton Loaders
The UI provides skeletal box layouts on first load (e.g. before data resolves from SWR/fetch). These are mapped using robust unique keys or explicitly bypassing `noArrayIndexKey` in biome to prevent false-positives since it's just a non-interactive skeleton block.

### Type Safety
When searching the `matches` collection on "Watch Party" events, we perform an `.find()` on pseudo-matches. We strictly convert the union match objects with `as unknown as typeof pseudoMatch & { status: 'MatchIng' | 'Upcoming' }` to explicitly retain strict typing through the pipeline without relying on loose `any` casts.

## Server 2 (Dynamic Sports Categories)
Hooks involved: `useSports.ts`.

### Categories Fetch
On page load, the frontend hits `api/v1/sports` dynamically fetching available sports schemas. The hook wraps this response and guarantees prepend of `{ id: 'all_channels', label: 'All Channels' }` allowing users to effortlessly toggle back to the global stream feed. Handled robustly against network drops by catching the Promise rejecting and defaulting gracefully. Test suite guarantees.

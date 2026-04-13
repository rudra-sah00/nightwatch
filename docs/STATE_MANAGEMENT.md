# Comprehensive State Management Strategy

With a massive monolithic Next.js App Router frontend, concurrent WebRTC streams, complex Video Player lifecycles, and Electron Desktop bridges, state management in Watch Rudra runs on a heavily scaled, multi-tiered approach to ensure predictable renders and eliminate stale closures.

## 1. Global Application State (React Context)

For state that must be globally accessible but mutates infrequently, we utilize strict React Context Providers located in `src/providers/`:

*   **`AuthProvider`**: Manages the `<AuthContext>` tracking `user` profiles, tokens, and active session loading boundaries. It handles seamless multi-tab authentication syncs.
*   **`SocketProvider`**: Manages the singleton `socket.io-client` connection instance used globally for fallback room approvals and force-logout broadcasts.
*   **`DevToolsProtectionProvider`**: Secures production environments by listening to keyboard shortcuts and native OS inspection triggers, blinding the UI if devtools are forcefully opened.
*   **`ServerProvider`**: Scaffolds layout requirements globally at the top level.

## 2. Highly Mutative Domain State (`useReducer`)

Complex UI components that trigger dozens of rapid state mutations per second (like the `hls.js` VOD layer) strictly use the `useReducer` abstract pattern.

### `PlayerContext.tsx`
Located in `src/features/watch/player/context/PlayerContext.tsx`, our proprietary Video Player avoids spamming `useState` (which guarantees re-render storms upon rapid `timeupdate` events). Instead:
*   It dispatches typed events (`PLAY`, `PAUSE`, `SEEK`, `SYNC_BUFFERING`, `SET_FULLSCREEN`).
*   The pure reducer mathematically computes the next DOM state.
*   Components deep in the tree (like `<Player.SeekBar />` or `<Player.TimeDisplay />`) consume the Context and update independently of the parent `<PlayerRoot />`.

## 3. Real-Time State & Stale Closure Prevention

The Watch Party domain handles WebRTC events asynchronously. A common React pitfall is "Stale Closures" inside socket or RTM event listeners, where old state variables are trapped in memory.

**The `useRef` Synchronization Pattern:**
You will notice extensively inside `src/features/watch-party/room/hooks/` that we do *not* pass the `room` state into rapid `useEffect` dependency arrays.
```typescript
const roomRef = useRef<WatchPartyRoom>(room);
useEffect(() => {
  roomRef.current = room; // Synchronize latest state safely
}, [room]);
```
When an Agora `RTMMessage` arrives triggering `onMessage(msg)`, the listener uniquely reads `roomRef.current` without causing an infinite re-render loop on the listener itself.

## 4. Electron Desktop State (`useDesktopApp.ts`)

Instead of throwing `typeof window` and `window.electronAPI` checks sporadically across UI components, we funnel OS state detection through `src/hooks/use-desktop-app.ts`.

It exposes reactive booleans (`isDesktopApp`, `isBrowser`) and provides fallback DOM timeouts to gracefully error-trap if an OS custom protocol deep link (`watch-rudra://`) fails to acquire focus.

## 5. Server State (Next.js Data Fetching layer)

We do not use Apollo or React Query. Instead, we lean directly into Next.js App Router caching paradigms integrated through our custom `fetch.ts` and `storage-cache.ts` interceptors in `src/lib/`:

*   **Mutations (Server Actions)**: For forms and sensitive data updates (passwords, profiles, avatars).
*   **Query-Level Locking**: Our `fetch.ts` implements a Mutex queue (`lockPromise`). If multiple components request a new Access Token refresh simultaneously, State is blocked globally across all components, waiting for the singular HTTP promise to resolve natively before retrying the render tree.

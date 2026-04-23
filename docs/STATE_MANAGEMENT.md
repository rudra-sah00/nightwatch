# Comprehensive State Management Strategy

With a massive monolithic Next.js App Router frontend, concurrent WebRTC streams, complex Video Player lifecycles, and Electron Desktop bridges, state management in Nightwatch runs on a heavily scaled, multi-tiered approach to ensure predictable renders and eliminate stale closures.

## 1. Global Application State

### Zustand (Persistent Client State)
For state that persists across page navigations and needs to survive refreshes:
*   **`use-auth-store.ts`**: User authentication state with Zustand `persist` middleware. Uses a custom `StateStorage` adapter that syncs to both `localStorage` (web) and `electron-plugin-store` (desktop) via `desktopBridge.storeSet/storeGet`.
*   **`use-navigation-store.ts`**: Navigation transition state for page loading indicators.

### React Context (Dependency Injection)
For providing singleton instances and infrequently-changing values down the tree:
*   **`AuthProvider`**: Thin wrapper that syncs the Zustand auth store with WebSocket connections and profile data. Exposes `useAuth()` which reads directly from the Zustand store.
*   **`SocketProvider`**: Manages the singleton `socket.io-client` connection instance.
*   **`ThemeProvider`**: Light/dark theme with `useMemo`-stabilized context value to prevent unnecessary re-renders.
*   **`ServerProvider`**: Active content server selection (`s1`/`s2`/`s3`), synced from user preferences via `useEffect`.

### Decision Tree
| Need | Use |
|------|-----|
| Persists across refreshes, shared globally | Zustand store (`src/store/`) |
| Singleton instance injection (socket, theme) | React Context (`src/providers/`) |
| Form state, UI toggles, component-local | `useState` / `useReducer` |
| Rapidly mutating player state | `useReducer` via `PlayerContext` |

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

Instead of throwing `typeof window` and `desktopBridge` checks sporadically across UI components, we funnel OS state detection through `src/hooks/use-desktop-app.ts`.

It exposes reactive booleans (`isDesktopApp`, `isBrowser`) and provides fallback DOM timeouts to gracefully error-trap if an OS custom protocol deep link (`nightwatch://`) fails to acquire focus.

## 5. Server State (Next.js Data Fetching layer)

We do not use Apollo or React Query. Instead, we lean directly into Next.js App Router caching paradigms integrated through our custom `fetch.ts` and `storage-cache.ts` interceptors in `src/lib/`:

*   **Mutations (Server Actions)**: For forms and sensitive data updates (passwords, profiles, avatars).
*   **Query-Level Locking**: Our `fetch.ts` implements a Mutex queue (`lockPromise`). If multiple components request a new Access Token refresh simultaneously, State is blocked globally across all components, waiting for the singular HTTP promise to resolve natively before retrying the render tree.

## 6. Shared TTL Cache (`src/lib/cache.ts`)

All client-side API caching uses a unified `createTTLCache<T>(ttlMs, maxSize)` utility:
*   **Search API**: 4 caches (results 5min, suggestions 10min, show details 5min, episodes 10min)
*   **Profile API**: Profile data cache (5min)
*   **Watch API**: Continue-watching cache (30s), progress cache (2min) — uses custom per-server keying

All caches auto-register in a global registry. `clearAllCaches()` is called on logout to prevent stale data across sessions.

## 7. Shared Utilities

*   **`src/lib/errors.ts`**: `isApiError()` type guard, `handleApiError()` centralized handler, `mapErrorCode()` for user-friendly messages.
*   **`src/hooks/use-abort-controller.ts`**: Shared request cancellation hook for API calls.
*   **`src/features/auth/hooks/use-otp-verification.ts`**: Shared OTP flow (countdown, resend, submit).

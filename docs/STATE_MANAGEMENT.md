# Comprehensive State Management Strategy

With a massive monolithic Next.js App Router frontend, concurrent WebRTC streams, complex Video Player lifecycles, and Electron Desktop bridges, state management in Nightwatch runs on a heavily scaled, multi-tiered approach to ensure predictable renders and eliminate stale closures.

## 1. Global Application State

### Zustand (Persistent Client State)
For state that persists across page navigations and needs to survive refreshes:
*   **`use-auth-store.ts`**: User authentication state with Zustand `persist` middleware. Uses a custom `StateStorage` adapter that syncs to both `localStorage` (web) and `electron-plugin-store` (desktop) via `desktopBridge.storeSet/storeGet`.
*   **`use-music-store.ts`**: Located at `src/features/music/store/use-music-store.ts`. Music playback state with Zustand `persist` middleware. Stores volume, shuffle, repeat mode, crossfade duration, and gapless playback preferences. Non-persisted slices include current track, queue, playback position, and playing state for rapid UI updates without disk writes.

### React Context (Dependency Injection)
For providing singleton instances and infrequently-changing values down the tree:
*   **`AuthProvider`**: Thin wrapper that syncs the Zustand auth store with WebSocket connections and profile data. Exposes `useAuth()` which reads directly from the Zustand store.
*   **`SocketProvider`**: Manages the singleton `socket.io-client` connection instance.
*   **`ThemeProvider`**: Light/dark theme with `useMemo`-stabilized context value to prevent unnecessary re-renders.

### Decision Tree
| Need | Use |
|------|-----|
| Server/API data that caches across navigations | TanStack Query (`useQuery`) |
| Mutations with optimistic UI | TanStack Query (`useMutation`) |
| Global persistent client state | Zustand store (`src/store/`) |
| Music playback state (track, queue, volume, shuffle) | Zustand (`use-music-store`) |
| Singleton instance injection (socket, theme) | React Context (`src/providers/`) |
| Form state, UI toggles, component-local | `useState` |
| Rapid player mutations | `useReducer` via `PlayerContext` |

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

## 5. Server State (TanStack Query)

All server/API data fetching and caching is managed by **TanStack Query (React Query v5)**.

### QueryProvider Setup
The `QueryProvider` wraps the application in the root layout with the following defaults:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 30 * 60 * 1000,           // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Data Fetching Patterns

*   **`useQuery`**: Used for all cacheable API data — music (albums, artists, playlists, lyrics), search results, profile data, watchlist, clips, manga chapters, games, livestream metadata, and continue-watching state.
*   **`useMutation`** with optimistic updates: Watchlist add/remove, manga favorites toggle, and clip deletion all use `onMutate` to optimistically update the cache before the server responds, with `onError` rollback.
*   **`useInfiniteQuery`**: Paginated clips in the Library page use cursor-based infinite scrolling with `getNextPageParam`.
*   **`useQueries`**: The MusicView home page fires parallel fetches (trending, new releases, top playlists, editorial picks) using `useQueries` for concurrent data loading.

### Cache Invalidation
*   Mutations invalidate related query keys on success (e.g., adding to watchlist invalidates `['watchlist']`).
*   On logout, `queryClient.clear()` wipes all cached data to prevent stale sessions.

### DevTools
`ReactQueryDevtools` is mounted in development mode for inspecting query states, cache entries, and refetch behavior.

### Mutation Locking
Our `fetch.ts` implements a Mutex queue (`lockPromise`). If multiple components request a new Access Token refresh simultaneously, state is blocked globally across all components, waiting for the singular HTTP promise to resolve before retrying the request.

## 6. Caching Strategy

All client-side caching is handled by TanStack Query's built-in cache. The `staleTime` and `gcTime` defaults (5min / 30min) cover the majority of use cases. Individual queries override these when needed (e.g., continue-watching uses a shorter `staleTime: 30_000`).

There is no separate TTL cache layer — TanStack Query's garbage collection, background refetching, and structural sharing replace the previous manual `createTTLCache` utility entirely.



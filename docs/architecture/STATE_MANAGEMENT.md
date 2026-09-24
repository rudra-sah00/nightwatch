# State Management Strategy

Nightwatch uses four state tiers deliberately: TanStack Query for server data, Zustand for persisted client state, React Context for singleton injection, and `useReducer` for high-frequency domain state like video playback.

**Source:** `src/store/`, `src/providers/`, `src/features/music/store/`, `src/features/watch/player/context/`

## 1. Global Application State

### Zustand (Persistent Client State)
For state that persists across navigations and survives refreshes:
*   **`src/store/use-auth-store.ts`**: User authentication state with the Zustand `persist` middleware, via a custom `StateStorage` adapter that writes to both `localStorage` (web) and `electron-plugin-store` (desktop) through `desktopBridge.storeSet/storeGet`.
*   **`src/features/music/store/use-music-store.ts`**: Music playback state, persisted under the key `nightwatch_music`. Persists volume, shuffle, repeat mode, crossfade duration, and gapless preference. Current track, queue, playback position, and playing state are intentionally **not** persisted, so rapid UI updates never hit disk.

A third, smaller Zustand store holds the 3D theatre view mode (`src/features/watch-party/theatre/lib/view-mode.ts`). These three are the only Zustand stores — there is no Zustand store for the video player, which uses `useReducer` instead (§2).

### React Context (Dependency Injection)
For singleton instances and infrequently-changing values:
*   **`AuthProvider`**: Thin wrapper syncing the Zustand auth store with the WebSocket connection and profile data. Exposes `useAuth()`, which reads from the store.
*   **`SocketProvider`**: Owns the singleton `socket.io-client` connection.
*   **`ThemeProvider`**: Light/dark theme, with a `useMemo`-stabilized context value.
*   **`QueryProvider`**: TanStack Query `QueryClient` (see §5).
*   **`IntlProvider`**: Server-side locale and message loading — see [I18N.md](./I18N.md).

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

## 4. Electron Desktop State (`use-desktop-app.ts`)

Instead of scattering `typeof window` and `desktopBridge` checks across UI components, OS state detection funnels through `src/platforms/desktop/use-desktop-app.ts` (exported from `src/platforms/desktop/index.ts`).

It exposes reactive booleans (`isDesktopApp`, `isBrowser`) and provides fallback DOM timeouts so that a failed `nightwatch://` deep link degrades gracefully instead of hanging.

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



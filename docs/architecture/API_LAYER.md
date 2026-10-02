# API Layer and Communication

Every client-side call to the Nightwatch backend goes through the `apiFetch` wrapper, which owns session refresh, CSRF, timeouts, and retries so that a token expiring mid-playback is never visible to the user.

**Source:** `src/lib/fetch.ts`, `src/lib/socket.ts`, `src/lib/env.ts`, `src/providers/query-provider.tsx`

## Overview of Services

The frontend talks to several data planes:

| Plane | Transport | Used for |
|-------|-----------|----------|
| Nightwatch backend | REST over `apiFetch` | Auth, profile, watchlist, search, music, manga, games, clips, livestream, watch progress |
| Socket.IO (`src/lib/socket.ts`) | WebSocket | Presence, friends, voice-call signalling, music device sync, remote control, watch activity, watch-party server events and the `watch-party:relay` backup for Agora RTM |
| Agora RTM | SDK | Watch-party signalling, chat, avatar transforms. Primary path; `useWatchPartyTransport` falls back to the Socket.IO relay when it is down |
| Agora RTC | WebRTC | Watch-party video/audio, friend voice calls |
| Firebase | SDK | Analytics, Crashlytics (native), Cloud Messaging push |

Third-party content sources (JioSaavn for music, MangaPlus for manga, IPTV providers for live channels) are **never called directly from the browser** — the backend proxies them, so they appear to the frontend as ordinary `/api/*` endpoints.

There is no Firestore usage anywhere in this codebase.

## The `apiFetch` Wrapper

Rather than raw `fetch()`, all interactions with the backend **must** funnel through `apiFetch<T>(endpoint, options)`.

### Automatic Token Refresh (Proactive)

Most applications wait for a call to fail with `401 Unauthorized` and *then* refresh. Nightwatch avoids that lazy pattern because it causes visible stuttering and failed network cascades in a streaming app.

`fetch.ts` tracks `tokenExpiresAt`. Whenever a new token is received, `scheduleTokenRefresh()` sets a timer for `timeUntilExpiry - 60000` ms, so the client re-authenticates **one minute before expiry**. A separate guard handles the case where JS timers were frozen (backgrounded tab, sleeping device): if the token has already expired on wake, it refreshes immediately rather than waiting for the stale timer.

Refresh is skipped while the browser reports itself offline, since it would fail and needlessly tear down a session that is still valid.

### Refresh Locking

If several components fire requests at the exact moment a token expires, `isRefreshing` acts as a mutex. Only *one* refresh request reaches the backend; every other pending `apiFetch` awaits `refreshPromise` and then retries.

### CSRF

State-changing requests (`POST`, `PATCH`, `PUT`, `DELETE`) attach an `x-csrf-token` header read from the `csrfToken` cookie. The refresh call does the same.

### Features & Abstraction

```typescript
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T>
```

- **Timeouts**: every request runs under an `AbortController`, defaulting to `30000ms`. A timeout surfaces as an error with `status: 408` and `code: 'REQUEST_TIMEOUT'`, distinguishable from a caller-initiated abort.
- **Retries**: opt-in via `retries` (default `0`), for 5xx and network errors.
- **SSR vs CSR URL resolution**: on the server (`typeof window === 'undefined'`) URLs resolve against `NEXT_PUBLIC_BACKEND_URL`; on the client they stay relative (`/api/*`) and are rewritten to the backend by `next.config.ts`, which sidesteps CORS.
- **Header injection**: `Content-Type: application/json` is inferred where applicable, and `credentials: 'include'` carries the HttpOnly session cookies.
- **`skipRefresh`**: set internally on auth endpoints to prevent infinite refresh loops.

## Mutations: No Server Actions

Nightwatch does **not** use Next.js Server Actions. There is no `'use server'` directive anywhere in `src/`.

Every mutation — login, profile edits, password changes, watchlist writes, clip creation — is a client-side `apiFetch` call, usually wrapped in a TanStack Query `useMutation`. Some forms use React's `useActionState` for pending/error ergonomics, but the action function it receives is an ordinary async client function calling `apiFetch`; it does not execute on the server.

This is deliberate: the backend is a separate Node.js service that already owns authorization, and routing mutations through a Next.js server hop would duplicate session handling and lose `apiFetch`'s refresh and retry behaviour.
## Client-Side Caching (TanStack Query)

All API responses are cached client-side via TanStack Query's `QueryClient`, configured in `src/providers/query-provider.tsx`. There is no separate manual TTL cache layer.

### How It Works

- **Instant cache hits**: Default `staleTime` of 5 minutes means data is served instantly from cache on re-mount — no loading spinners for recently fetched data.
- **Background revalidation**: After serving cached data, TanStack Query silently refetches in the background and updates the UI if the response has changed.
- **Automatic garbage collection**: Queries with no active observers are garbage-collected after 30 minutes (`gcTime`).

### Cache Key Convention

Cache keys follow a hierarchical array pattern for easy invalidation:

```ts
['music', 'album', id]
['music', 'playlist', id]
['search', query]
['profile', 'devices']
['watchlist']
['friends', 'list']
```

Invalidating `['music']` busts all music-related caches. Invalidating `['music', 'album', id]` targets a single album.

### Logout Cleanup

On logout, `queryClient.clear()` wipes all cached data — no stale user data leaks between sessions.

### DevTools

In development mode, TanStack Query DevTools are available for inspecting cache state, active queries, and background refetch timings.

## Related Documentation

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) — how cached server state relates to Zustand and Context
- [OVERVIEW.md](./OVERVIEW.md) — the route guard in `src/proxy.ts` and overall layering
- [../features/auth/README.md](../features/auth/README.md) — the session and refresh flow end to end

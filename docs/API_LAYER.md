# API Layer and Communication

This document outlines the client-side API architecture in Nightwatch, governed primarily by the custom `apiFetch` wrapper in `src/lib/fetch.ts`. Unlike standard Next.js boilerplate, this project employs a rigorous, self-managing fetch pipeline with proactive token refreshing to ensure sessions never visibly expire during active Watch Party or playback sessions.

## Overview of Services

The Next.js application communicates across several data planes:

1. **Nightwatch Backend**: Our primary monolithic Node.js/Express server handling the primary Database features.
2. **Agora (RTC)**: Real-time Audio/Video streams.

## The `apiFetch` Wrapper

Rather than using raw `fetch()`, all interactions with our backend **must** funnel through `apiFetch<T>(endpoint, options)`.

### Automatic Token Refresh (Proactive)

Most applications wait for an API call to fail with a `401 Unauthorized`, and *then* attempt a token refresh. Nightwatch explicitly avoids this "lazy refresh" pattern because it causes visual stuttering or failed network cascades in streaming apps. 

Inside `fetch.ts`, we maintain a `tokenExpiresAt` state. A background interval (`scheduleTokenRefresh()`) is fired whenever a new token is received. The client automatically re-authenticates **1 minute before expiration**, ensuring the user's active session is never interrupted by a 401.

### Automatic Retry & Refresh Locks

If multiple components fire fetches at the exact millisecond a token expires, `isRefreshing` acts as a mutex lock. Only *one* refresh request is dispatched to the backend, and all other pending `apiFetch` calls `await refreshPromise` until the token is replaced, then automatically retry.

### Features & Abstraction

```typescript
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T>
```

- **Timeouts**: Every request uses an `AbortController` defaulted to `30000ms`.
- **SSR vs. CSR URL Resolution**: On the Node.js Server (`typeof window === 'undefined'`), URLs resolve to `NEXT_PUBLIC_BACKEND_URL`. On the client, they resolve relatively (`/api/*`), triggering `next.config.ts` rewrite rules into the backend to bypass standard CORS warnings seamlessly.
- **Custom Header Injection**: `Content-Type: application/json` is automatically inferred and attached, along with standard creds.

## Server Actions vs. API Routes

In Nightwatch, we prefer Next.js Server Actions for secure form mutations (e.g. Profile editing or Logins). When passing through a Server Action, we do not hit Next.js `/api/` folders. We execute `apiFetch` directly inside the Action bounds before returning the result down to the Client Component, minimizing client-side bandwidth and obscuring the upstream REST signatures.


## Client-Side Caching (TanStack Query)

All API responses are cached client-side via TanStack Query's `QueryClient`. This replaces the previous `src/lib/cache.ts` manual TTL cache system (`createTTLCache` / `clearAllCaches()`).

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
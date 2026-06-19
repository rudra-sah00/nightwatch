# Watchlist

Server-aware saved content list with optimistic UI, search filtering, and integration with the content-detail modal.

## Directory Structure

```
src/features/watchlist/
├── api.ts                          # REST API functions
├── types.ts                        # Re-exports from @/types/content
├── hooks/
│   └── use-watchlist.ts            # Page state management
└── components/
    └── WatchlistClient.tsx         # Main watchlist view
```

## API Layer

`api.ts`

All functions use `apiFetch` (cookie-authenticated HTTP client).

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getWatchlist(providerId?, signal?)` | GET | `/api/user/watchlist` | Fetch user's watchlist, optionally filtered by provider |
| `addToWatchlist(item)` | POST | `/api/user/watchlist` | Add content (contentId, contentType, title, posterUrl, providerId) |
| `removeFromWatchlist(contentId, providerId?)` | DELETE | `/api/user/watchlist` | Remove by content ID |
| `checkInWatchlist(contentId, providerId?)` | GET | `/api/user/watchlist/status` | Check if content is in watchlist |

The `checkInWatchlist` function auto-derives `providerId` from the content ID prefix (e.g. `s2:12345` → `'s2'`). Caching of watchlist status is handled by TanStack Query via query keys — no manual client-side TTL cache is needed.

## Types

`types.ts` re-exports the `WatchlistItem` type from `@/types/content`. The type includes `id`, `contentId`, `contentType` (`'Movie' | 'Series'`), `title`, `posterUrl`, and provider metadata.

## Hook: useWatchlist

`hooks/use-watchlist.ts`

Manages the watchlist page state using `useQuery` + `useMutation` from TanStack Query:

```typescript
function useWatchlist(): {
  watchlist: WatchlistItem[]; // Current items
  isLoading: boolean;
  selectedId: string | null;  // Content ID for detail modal
  setSelectedId: (id: string | null) => void;
  isEmpty: boolean;           // Derived: !isLoading && watchlist.length === 0
  removeItem: (contentId: string) => void; // Optimistic removal
}
```

Key behaviors:
- **Server-aware fetching**: Query key includes `activeServer` from `useServer()` — auto-refetches on server change
- **TanStack Query caching**: Uses `useQuery` with stale-while-revalidate for watchlist data
- **Optimistic removal**: `useMutation` with `onMutate` calls `queryClient.setQueryData` to immediately filter the item from the cached list before the API responds; `onError` rolls back via the snapshot saved in `onMutate`

## Component: WatchlistClient

`components/WatchlistClient.tsx`

Main watchlist view with:

1. **Hero header** — neo-brutalist red banner with abstract background shapes and page title
2. **Search bar** — `NeoSearchBar` component for client-side filtering by title
3. **Loading state** — 4 skeleton placeholders with pulse animation
4. **Empty state** — dashed border container with Plus icon and contextual message (different for "no results" vs "empty watchlist")
5. **Item list** — `WatchlistItemCard` components with `contentVisibility: 'auto'` for virtualization
6. **Content detail modal** — dynamically imported `ContentDetailModal` opens when an item is selected

### WatchlistItemCard

`React.memo` component rendering each watchlist item as a horizontal card:
- Poster image (112px wide, `next/image` with optimized URL)
- Film/TV icon fallback when no poster
- Title and content type badge
- Click opens the content-detail modal
- Focus-visible ring for keyboard accessibility

### Optimistic UI Flow

1. User clicks remove on a `ContinueWatching` or detail modal
2. `useMutation`'s `onMutate` saves a snapshot and calls `queryClient.setQueryData` to immediately filter the item
3. The API call to `removeFromWatchlist` fires in the background
4. On error, the `onError` callback restores the snapshot; on success, `onSettled` invalidates the query to ensure consistency

### Integration with ContentDetailModal

When `selectedId` is set, the dynamically imported `ContentDetailModal` opens. The `onWatchlistChange` callback receives `(id, inList)` — when `inList` is `false`, `removeItem` is called to optimistically update the list.

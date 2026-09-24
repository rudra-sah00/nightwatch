# Watchlist

Server-backed saved content list with optimistic UI, search filtering, and integration with the content-detail modal.

**Source:** `src/features/watchlist/`

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

All functions use `apiFetch` (cookie-authenticated HTTP client from `src/lib/fetch.ts`).

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getWatchlist(signal?)` | GET | `/api/user/watchlist` | Fetch user's watchlist |
| `addToWatchlist(item)` | POST | `/api/user/watchlist` | Add content (contentId, contentType, title, posterUrl) |
| `removeFromWatchlist(contentId)` | DELETE | `/api/user/watchlist?id=<contentId>` | Remove by content ID |
| `checkInWatchlist(contentId)` | GET | `/api/user/watchlist/status?id=<contentId>` | Check if content is in watchlist |

The `checkInWatchlist` function checks whether a given content ID is in the user's watchlist. Caching of watchlist status is handled by TanStack Query via query keys — no manual client-side TTL cache is needed.

## Types

`types.ts` re-exports the `WatchlistItem` type from `@/types/content`. The type includes `id`, `contentId`, `contentType` (`'Movie' | 'Series'`), `title`, `posterUrl`, and provider metadata.

## Hook: useWatchlist

`hooks/use-watchlist.ts`

Manages the watchlist page state using `useQuery` + `useMutation` from TanStack Query:

```typescript
function useWatchlist(): {
  watchlist: WatchlistItem[]; // Current items
  loading: boolean;
  selectedId: string | null;  // Content ID for detail modal
  setSelectedId: (id: string | null) => void;
  isEmpty: boolean;           // Derived: !loading && watchlist.length === 0
  removeItem: (contentId: string) => void; // Optimistic removal
}
```

Key behaviors:
- **TanStack Query caching**: Uses `useQuery` with query key `['watchlist']` and stale-while-revalidate
- **Optimistic removal**: `useMutation` with `onMutate` calls `queryClient.setQueryData` to immediately filter the item from the cached list before the API responds; `onError` rolls back via the snapshot saved in `onMutate`; `onSettled` invalidates the query to ensure consistency

## Component: WatchlistClient

`components/WatchlistClient.tsx`

Main watchlist view with:

1. **Hero header** — neo-brutalist red banner with abstract background shapes and page title
2. **Search bar** — `NeoSearchBar` component for client-side filtering by title
3. **Loading state** — 4 skeleton placeholders with pulse animation
4. **Empty state** — dashed border container with Plus icon and contextual message (different for "no results" vs "empty watchlist")
5. **Item list** — `WatchlistItemCard` components with `contentVisibility: 'auto'` for virtualization
6. **Content detail modal** — dynamically imported `ContentDetailModal` opens when an item is selected
7. **Remove confirmation** — `RemoveConfirmPopup` for confirming item removal

### WatchlistItemCard

`React.memo` component rendering each watchlist item as a horizontal card:
- Poster image (`next/image` with optimized URL) with Film/TV icon fallback
- Title and content type badge
- **Remove button** with trash icon — triggers `RemoveConfirmPopup` before removal
- Click opens the content-detail modal
- Focus-visible ring and keyboard accessibility (`role="button"`, Enter/Space handlers)

### Optimistic UI Flow

1. User clicks remove → `RemoveConfirmPopup` asks for confirmation
2. On confirm, `useMutation`'s `onMutate` saves a snapshot and calls `queryClient.setQueryData` to immediately filter the item
3. The API call to `removeFromWatchlist` fires in the background
4. On error, the `onError` callback restores the snapshot; on success, `onSettled` invalidates the query to ensure consistency

### Integration with ContentDetailModal

When `selectedId` is set, the dynamically imported `ContentDetailModal` opens. The `onWatchlistChange` callback receives `(id, inList)` — when `inList` is `false`, `removeItem` is called to optimistically update the list.

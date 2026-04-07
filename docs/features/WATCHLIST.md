# User Watchlist

This document defines the storage and execution logic for the `watchlist` feature located in `src/features/watchlist`.

The Watchlist is a collection of videos/livestreams saved by users for deferred viewing.

## State Mutator

Adding or removing an item involves a dual-state update architecture.

### Optimistic UI
When the user clicks the bookmark button (`BookmarkIcon.tsx`):
1. The React hook (`useWatchlist.ts`) instantly renders the button as active.
2. An asynchronous API request is sent in the background via `mutation.mutate({ videoId })`.
3. If the backend fails (e.g., rate-limited, unauthorized), the icon state rolls back to the previous design.

### Sync Status
The local cache of watch-listed IDs is maintained by React Query and populated instantly upon the initial `/profile` fetch.
- On hover, the tool-tip is powered by Radix UI primitives.
- If the item is already bookmarked, the label changes to "Remove from Watchlist".

## Carousel System

The main dashboard (`Home.tsx`) loads the Watchlist horizontally if length > 0.
- A virtualized Flexbox implementation ensures smooth horizontal panning (or mouse-wheel scrolling).
- If the length hits 0, the Carousel un-mounts, replaced by a "Discover Now" neo-brutalist CTA container.

### Ordering & Caching
Watchlist updates are chronological by default (`created_at`). 
The backend returns the paginated IDs, while the Next App Router hydrates the metadata.

Invalidating the cache is essential for real-time synchronization between the mobile view and desktop. Thus, upon bookmarking an item, the mutation invalidates the query key `['watchlist']` globally.
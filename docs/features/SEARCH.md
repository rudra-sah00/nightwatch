# Global Search Feature

## Overview
Search operations run through the `/search` features directory, managing everything from input debouncing, recent query caching, to handling full-text search displays.

## Directory Structure
`src/features/search/`
- `components/`: `SearchBar`, `SearchFilterBar`, `SearchResultCard`.
- `hooks/`: `useSearchQuery`, `useSearchHistory`.
- `api.ts`: Dedicated typed wrappers connecting UI pagination to backend endpoints.

## Implementation Details
1. **Debounce Logic**
   - The primary search box strictly delays the HTTP GET using the centralized `useDebounce.ts` hook.
   - Immediate rendering occurs locally only for "recent searches" populated from `storage-cache.ts`.

2. **Pagination & Infinite Scrolling**
   - Search results component leverages `IntersectionObserver` bindings to fetch continuous cursor-based chunks when scrolling down the primary `(public)/search/page.tsx`.

3. **Routing Bindings**
   - Executing a search updates the Next.js `useRouter` query parameters (e.g., `?q=Gaming&sort=newest`).
   - The primary components read `useSearchParams` natively so URLs are always perfectly shareable.

# Universal Search Engine 

This document describes the structure and operations of the `/src/features/search` architecture within Watch Rudra.

The Search structure aggregates metadata for Movies, Series, and Livestreams into a single, highly performant user experience via Debouncing and TypeSense/ElasticSearch.

## Component Overview
The primary interface is `SearchBar.tsx` or a `SearchModal` (Command Palette - `cmd+k`).

### Debounce Hook Integration
A custom `useDebounce(value, 300ms)` hook prevents the input from sending 15 requests as a user types "breaking bad". 
Instead, it pauses for a specified threshold (like 300ms) before hitting the `/api/v1/search?q=[query]` endpoint.

### Infinite Scroll Results
The search interface requires lazy-fetching capabilities as users scroll past 10-20 results.
- **TanStack Query Setup:** The feature strictly uses `useInfiniteQuery` to handle result sets. 
- **Virtual DOM:** High-density result arrays are offloaded from direct React Rendering using libraries like `react-intersection-observer` (or `virtuoso`) when paginating through rows of covers.

## Filtering and Facets

### Query Parameters Architecture
The search component does not store filtering logic internally in React state.
It writes variables directly to the URL (`?q=action&year=2024&rating=R`). 
- **Benefits:** Sharing a URL replicates the exact search state immediately.
- **Next.js Implementation:** Uses `useSearchParams()` from `next/navigation` to read the state on the server (or client) and pass those query parameters dynamically down to the Elasticsearch proxy backend.

## Error Handling & Blank State
The component leverages error boundaries if the backend returns a 500 status.
A `NoResults` component strictly returns a friendly Neo-brutalist message to the user asking them to modify their text if the 404 block is hit.
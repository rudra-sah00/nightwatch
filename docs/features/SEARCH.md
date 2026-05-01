# Search Engine

URL-parameter driven search with debounced typeahead suggestions, content-detail modals, episode browsing, download management, and continue-watching integration.

## Directory Structure

```
src/features/search/
├── api.ts                          # searchContent, getShowDetails, getSeriesEpisodes, getSearchSuggestions
├── schema.ts                       # Zod validation for search query
├── types.ts                        # SearchResult, ShowDetails, Episode, Season, ContentType
├── components/
│   ├── HomeClient.tsx              # Landing page with hero search bar
│   ├── SearchClient.tsx            # Search results page
│   ├── search-results.tsx          # Results grid
│   ├── content-detail-modal.tsx    # Full-screen content detail overlay
│   ├── content-info.tsx            # Content metadata display
│   ├── download-menu.tsx           # Quality picker for downloads
│   ├── season-selector.tsx         # Season dropdown
│   ├── episode-card.tsx            # Single episode card
│   ├── episode-list.tsx            # Episode list container
│   └── EpisodeSkeleton.tsx         # Loading placeholder
├── hooks/
│   ├── use-search-input.ts         # Global search input + typeahead
│   ├── use-search-results.ts       # Deduplication
│   ├── use-home-client.ts          # Home page state
│   ├── use-content-detail.ts       # Core content detail composition
│   ├── use-content-detail-modal.ts # Modal lifecycle
│   ├── use-content-progress.ts     # Watch progress restoration
│   ├── use-playback-actions.ts     # Play/resume navigation
│   ├── use-auto-play.ts           # Auto-play from initial context
│   ├── use-season-episodes.ts      # Season/episode management
│   ├── use-season-selector.ts      # Dropdown click-outside
│   ├── use-show-details.ts         # Show detail fetcher
│   ├── use-download-menu.ts        # Download quality picker
│   └── use-episode-card.ts         # Image error state
└── utils/
    └── download.ts                 # Download helpers (quality sort, offline ID, fetch links)
```

## Schema

`schema.ts`

```typescript
const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});
type SearchQueryInput = z.infer<typeof searchQuerySchema>;
```

Validates the `q` URL search parameter before triggering API calls.

## Components

### HomeClient

`components/HomeClient.tsx`

Landing page with a Bauhaus-inspired hero layout:
- Large headline with neo-brutalist styling
- Search bar with **inline typeahead ghost text** — shows the first suggestion as transparent text behind the input
- **Tab-to-complete** — pressing Tab fills the suggestion
- Enter or button click navigates to `/search?q=...`
- Decorative animated marquee strip at the bottom
- Three stat indicators (red/blue/yellow dots)

### SearchClient

`components/SearchClient.tsx`

Search results page with an inline-editable query:
- The search query is rendered as a large `<input>` styled to match the heading typography
- Input width auto-sizes to content (`width: ${query.length + 1}ch`)
- Enter triggers router navigation (URL-driven search)
- Shows result count, loading/error/empty states
- `SearchResults` grid for content cards
- Dynamically imported `ContentDetailModal` on selection

### search-results

`components/search-results.tsx`

Grid of content cards with:
- Poster images via `next/image` with optimized URLs
- Content type badge (Movie/Series)
- Loading skeleton grid
- Click handler for content selection

### content-detail-modal

`components/content-detail-modal.tsx`

Full-screen overlay for content details. Features:
- Poster with blurred background
- Title, year, description, content type
- **Play / Resume** buttons (Resume shows when watch progress exists)
- **Watch Party** button — creates a room via `useWatchParty.createRoom`
- **Watchlist toggle** — optimistic add/remove with `useOptimistic`
- **Season selector** dropdown for series
- **Episode list** with thumbnails, duration, play buttons
- **Download menu** for offline content
- **Trailer auto-play** when available
- **Countdown overlay** before playback starts
- Escape key dismissal, body scroll lock, sidebar disable

### download-menu

`components/download-menu.tsx`

Quality picker for downloading content:
- Lazy-loads available qualities from the API
- Shows existing download status
- Desktop: triggers Electron bridge download
- Mobile: triggers Capacitor filesystem download
- Quality labels sorted by resolution (1080p → 360p)

### season-selector

`components/season-selector.tsx`

Dropdown for selecting a season in series content. Click-outside dismissal via `useSeasonSelector`.

### episode-card / episode-list

`components/episode-card.tsx` — Single episode with thumbnail, title, duration, episode number, and play button. Image error fallback.

`components/episode-list.tsx` — Container rendering episode cards with loading skeletons.

## Hooks (13 total)

### use-search-input

`hooks/use-search-input.ts`

Global search input management:
- **Typeahead suggestions**: Fetched from Server 2 API with 200ms debounce, disabled on `/search` page
- **Recent search history**: Persisted in `localStorage` (`wr_recent_searches`, max 5 entries)
- **URL sync**: Query syncs with `?q=` URL param via `useSearchParams`
- **Tab-to-complete**: Fills the first suggestion on Tab press
- **Enter-to-search**: Navigates to `/search?q=...` via `useTransition` + `router.push`
- **Click-outside close**: Ref-based detection for suggestion dropdown

Returns: `query`, `setQuery`, `suggestion`, `handleSearch`, `handleManualSearch`, `handleFocus`, `handleBlur`, `handleClear`, `isPending`, `recentSearches`, `showSuggestions`.

### use-home-client

`hooks/use-home-client.ts`

Client-side state for the home/search page:
- Reacts to `q` URL param changes
- Validates query against `searchQuerySchema`
- Fetches results via `searchContent` with `AbortController`
- Manages content-detail modal selection (including continue-watching entries)
- Lazy preloads the content-detail modal chunk when results are present

### use-search-results

`hooks/use-search-results.ts`

Two minimal hooks:
- `useSearchResults(results)` — deduplicates by `id` using `Set`
- `useSearchResultItem()` — tracks image error state for a single card

### use-content-detail

`hooks/use-content-detail.ts`

Core composition hook orchestrating:
1. `useShowDetails` — fetches show/movie details
2. `useSeasonEpisodes` — manages season selection and episode list
3. `useContentProgress` — restores watch progress
4. `usePlaybackActions` — builds play/resume navigation URLs
5. `useAutoPlay` — auto-plays from initial context
6. Parallel watchlist check via `checkInWatchlist`
7. Optimistic watchlist toggle via `React.useOptimistic` + `React.startTransition`

### use-content-detail-modal

`hooks/use-content-detail-modal.ts`

Modal lifecycle hook composing `useContentDetail` with:
- Watch party creation via `useWatchParty.createRoom`
- Trailer auto-play detection
- Countdown overlay state
- Body scroll lock and Escape key dismissal
- Sidebar disable via `useSidebar().setSidebarsDisabled`

### use-content-progress

`hooks/use-content-progress.ts`

Watch progress restoration:
1. Checks in-memory cache first (`getCachedProgress`)
2. Falls back to HTTP fetch (`fetchContentProgress`) with 5s timeout guard
3. Once progress is available, auto-selects the matching season for series content
4. Falls back to the latest season if no progress match

### use-playback-actions

`hooks/use-playback-actions.ts`

Builds navigation URLs and handles router transitions:
- **Movies**: Constructs `/watch/:id?type=movie&title=...&server=...` with description, year, poster
- **Series**: Resolves target episode, caches series data for next-episode feature, constructs full URL with season/episode/seriesId
- 8-second timeout guard resets loading state if navigation stalls

### use-auto-play

`hooks/use-auto-play.ts`

Side-effect hook for deep-link auto-play:
1. Effect 1: Selects the target season and fetches episodes
2. Effect 2: Once episodes load, starts playback of the target episode
Uses ref flags (`autoPlaySeasonSelectedRef`, `autoPlayEpisodeStartedRef`) to ensure each step runs exactly once.

### use-season-episodes

`hooks/use-season-episodes.ts`

Manages selected season and episode list:
- Uses locally embedded episodes when the full set is available (compares with `season.episodeCount`)
- Falls back to API fetch via `getSeriesEpisodes`
- Uses `useTransition` for responsive UI during fetches

### use-season-selector

`hooks/use-season-selector.ts`

Click-outside dismissal for the season dropdown. Delays the click listener registration to prevent immediate close on the same click.

### use-show-details

`hooks/use-show-details.ts`

Fetches show/movie details by content ID with `useTransition` and `AbortController`. Aborts on unmount or content ID change.

### use-download-menu

`hooks/use-download-menu.ts`

Download quality picker state:
- Lazy-fetches qualities from API (Server 2 only)
- Tracks existing offline downloads via `useDownloads`
- `handleDesktopClick` triggers Electron bridge download with quality label
- Computes `offlineIdentifier` for deduplication

### use-episode-card

`hooks/use-episode-card.ts`

Minimal hook tracking image error state for a single episode card.

## Utils

### download.ts

`utils/download.ts`

| Function | Purpose |
|----------|---------|
| `sortQualities(qualities)` | Sorts by resolution (1080p → 360p), unknowns appended alphabetically |
| `getOfflineIdentifier(params)` | Builds deterministic storage key for offline content |
| `fetchDownloadLinks(id, type, season?, episode?)` | Fetches quality options from backend API |
| `startDesktopDownload(params)` | Initiates download via Electron bridge |

`QUALITY_ORDER`: `['1080p', '720p', '480p', '360p']`

## Data Flow: Search → Play

1. User types in `HomeClient` → `useSearchInput` manages input + suggestions
2. Enter press → `router.push('/search?q=...')` via `useTransition`
3. `SearchClient` reads `?q=` → `useHomeClient` validates and fetches results
4. User clicks result → `ContentDetailModal` opens
5. `useContentDetail` fetches show details + episodes + watch progress in parallel
6. User clicks Play → `usePlaybackActions.handlePlay` constructs URL → `router.push('/watch/...')`

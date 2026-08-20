# Manga

MangaPlus reader with browse/search, favorites, reading progress persistence, and full Smart TV spatial-navigation support.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                      │
│                                                          │
│  Feature Module: src/features/manga/                     │
│    ├── api.ts (API functions + analytics events)         │
│    ├── types.ts (MangaTitle, MangaDetail, MangaChapter,  │
│    │    MangaPage, MangaChapterViewer, MangaFavorite,    │
│    │    MangaProgress)                                   │
│    └── components/                                       │
│         ├── MangaClient.tsx (browse home — tabs + grid)  │
│         └── MangaSearchSpotlight.tsx (search overlay)    │
│                                                          │
│  Routes: src/app/(protected)/(main)/manga/               │
│    ├── page.tsx (entry — MangaTvGate + MangaClient)      │
│    ├── MangaTvGate.tsx (TV platform gate)                │
│    ├── error.tsx (error boundary reset UI)               │
│    ├── title/[titleId]/page.tsx (title detail + chapters)│
│    └── chapter/[chapterId]/page.tsx (vertical reader)    │
│                                                          │
│  Smart TV: src/platforms/smart-tv/pages/                  │
│    ├── TvManga.tsx (D-pad browse with spatial nav)       │
│    ├── TvMangaTitle.tsx (D-pad title detail + chapters)  │
│    └── TvMangaReader.tsx (fullscreen page-flip reader)   │
│                                                          │
│  Data: TanStack Query (useQuery, useMutation)            │
│  State: local component state + optimistic cache updates │
└──────────────────────┬───────────────────────────────────┘
                       │ apiFetch (cookie-authenticated HTTP)
┌──────────────────────▼───────────────────────────────────┐
│  Backend (Node.js / Express)                             │
│                                                          │
│  /api/manga/* routes                                     │
│    ├── MangaPlus Provider (protobuf, edge-cached)        │
│    ├── Image Proxy with XOR decryption (/image?url&key)  │
│    ├── PostgreSQL (favorites, reading progress)          │
│    └── Edge Cache: ranking (1h), latest (10min)          │
└──────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/features/manga/
├── api.ts                          # REST API functions + analytics tracking
├── types.ts                        # TypeScript interfaces
└── components/
    ├── MangaClient.tsx             # Main browse view (tabs, grid, infinite scroll)
    └── MangaSearchSpotlight.tsx    # Floating search overlay with debounced results

src/app/(protected)/(main)/manga/
├── page.tsx                        # Route entry: metadata + MangaTvGate + MangaClient
├── MangaTvGate.tsx                 # TvPageGate wrapper → TvManga on TV, children on web
├── error.tsx                       # Error boundary with retry button
├── title/[titleId]/page.tsx        # Title detail: cover, metadata, favorites, chapter list
└── chapter/[chapterId]/page.tsx    # Vertical chapter reader with progress tracking

src/platforms/smart-tv/pages/
├── TvManga.tsx                     # TV browse: spatial nav grid + tabs + search
├── TvMangaTitle.tsx                # TV title detail with focusable chapter list
└── TvMangaReader.tsx               # TV fullscreen reader (D-pad page navigation)
```

## API Layer

`src/features/manga/api.ts`

All functions use `apiFetch` (cookie-authenticated HTTP client). Backend base path: `/api/manga`.

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getMangaRanking()` | GET | `/api/manga/ranking` | Top manga rankings (edge-cached 1h) |
| `getMangaLatest()` | GET | `/api/manga/latest` | Latest chapter updates (edge-cached 10min) |
| `searchManga(q)` | GET | `/api/manga/search?q=` | Search manga titles |
| `getMangaDetail(titleId)` | GET | `/api/manga/title/:titleId` | Full title detail with chapters |
| `getMangaChapter(chapterId)` | GET | `/api/manga/chapter/:chapterId` | Chapter page viewer data |
| `getMangaFavorites()` | GET | `/api/manga/favorites` | User's saved titles |
| `addMangaFavorite(input)` | POST | `/api/manga/favorites` | Add title to favorites |
| `removeMangaFavorite(titleId)` | DELETE | `/api/manga/favorites/:titleId` | Remove from favorites |
| `checkMangaFavorite(titleId)` | GET | `/api/manga/favorites/:titleId/check` | Check if title is favorited |
| `getMangaProgress()` | GET | `/api/manga/progress` | All reading progress entries |
| `updateMangaProgress(input)` | POST | `/api/manga/progress` | Upsert reading progress (by titleId) |
| `removeMangaProgress(titleId)` | DELETE | `/api/manga/progress/:titleId` | Delete progress for a title |

Analytics events tracked: `manga_chapter_read` (on chapter open), `manga_favorite_add`, `manga_favorite_remove`.

## Types

`src/features/manga/types.ts`

| Type | Key Fields |
|------|-----------|
| `MangaTitle` | `titleId`, `name`, `author`, `portraitImageUrl`, `landscapeImageUrl`, `viewCount`, `language`, `updateStatus` |
| `MangaChapter` | `titleId`, `chapterId`, `name`, `subTitle`, `thumbnailUrl`, `startTimestamp`, `endTimestamp`, `isVerticalOnly` |
| `MangaDetail` | `title`, `imageUrl`, `overview`, `backgroundImageUrl`, `numberOfViews`, `chapters[]`, `tags[]`, `releaseSchedule`, `rating`, `isSimulReleased` |
| `MangaPage` | `imageUrl`, `width`, `height`, `encryptionKey` |
| `MangaChapterViewer` | `titleId`, `titleName`, `chapterId`, `chapterName`, `pages[]`, `isVerticalOnly`, `startFromRight` |
| `MangaFavorite` | `id`, `titleId`, `title`, `author`, `portraitImageUrl`, `addedAt` |
| `MangaProgress` | `id`, `titleId`, `titleName`, `portraitImageUrl`, `chapterId`, `chapterName`, `pageIndex`, `totalPages`, `updatedAt` |

## TanStack Query Keys

| Key | Used In | Purpose |
|-----|---------|---------|
| `['manga', tab]` | `MangaClient` | Browse data for current tab (ranking/latest/saved/continue) |
| `['manga', 'search', query]` | `MangaSearchSpotlight`, `TvManga` | Debounced search results |
| `['manga', 'chapter', chapterId]` | Chapter reader page, `TvMangaReader` | Chapter pages data |
| `['manga', 'detail', titleId]` | Title detail page, `TvMangaTitle` | Full title info + chapters |
| `['manga', 'favorite', titleId]` | Title detail page | Single title favorite check |
| `['manga', 'favorites']` | Invalidated on favorite toggle | Full favorites list |
| `['manga', 'progress']` | Title detail page, `MangaClient` (continue tab) | All reading progress |
| `['manga', 'ranking']` | `TvManga` | Ranking data for TV |
| `['manga', 'latest']` | `TvManga` | Latest data for TV |

## Key Components

### MangaClient

`src/features/manga/components/MangaClient.tsx`

Main browse page with four tabs:

1. **Ranking** (`TrendingUp` icon) — top manga from MangaPlus rankings
2. **Latest** (`Zap` icon) — recently updated chapters
3. **Saved** (`Heart` icon) — user's favorites (with remove button)
4. **Continue** (`History` icon) — reading progress entries showing chapter + page position

Features:
- **Tab system** — pill-style buttons, active tab uses inverted color scheme
- **Search button** — opens `MangaSearchSpotlight` overlay
- **Infinite scroll** — `IntersectionObserver` with 200px root margin, 30-item pages
- **Optimistic removal** — `useMutation` with `onMutate` snapshot/rollback for saved and continue tabs
- **MangaCard** — `React.memo` component with portrait aspect ratio, status badges (`new`/`up`), lazy loading
- **Skeleton grid** — 10 placeholder items during loading
- **Empty state** — dashed border container with `BookOpen` icon
- **i18n** — all strings from `common.manga` namespace via `useTranslations`

### MangaSearchSpotlight

`src/features/manga/components/MangaSearchSpotlight.tsx`

Floating search modal with glassmorphism styling:
- **Debounced search** — 400ms debounce before firing API call
- **TanStack Query** — `['manga', 'search', debouncedQuery]`, enabled when query ≥ 1 char
- **Result items** — thumbnail (via `next/image`), title, author; click navigates to `/manga/title/:titleId`
- **Keyboard dismissal** — Escape key closes the overlay
- **Mobile awareness** — skips auto-focus on Capacitor native platform
- **Entrance animation** — Web Animations API (translateY + opacity, 250ms)
- **Backdrop** — `backdrop-blur-sm` with click-outside-to-close

### Title Detail Page

`src/app/(protected)/(main)/manga/title/[titleId]/page.tsx`

Full title detail page with:
- **Cover image** — `next/image` with fill layout
- **Favorite toggle** — optimistic local state with server sync, invalidates `['manga', 'favorite', titleId]` and `['manga', 'favorites']`
- **Resume button** — reads progress from `['manga', 'progress']` query; shows "Resume [chapter]" or "Next [chapter]" depending on page completion (≥95% threshold)
- **Meta badges** — release schedule, rating, view count
- **Tags** — rendered from `detail.tags[]`
- **Chapter list** — bordered table with thumbnails (hidden on mobile), chapter name, subtitle, date
- **TV gate** — renders `TvMangaTitle` when `isTV()` returns true
- **Error boundary** — `FeatureErrorBoundary` wrapper

### Chapter Reader Page

`src/app/(protected)/(main)/manga/chapter/[chapterId]/page.tsx`

Vertical scroll reader for manga chapters:
- **Image rendering** — native `<img>` elements (not react-pdf), full-width with `loading="lazy"` for off-screen pages and `loading="eager"` for current + next page
- **Page tracking** — `IntersectionObserver` with 0.5 threshold determines current visible page
- **Progress persistence** — saves via `updateMangaProgress` on: unmount, `beforeunload`, and every 30 seconds (crash safety)
- **Position restoration** — on mount, fetches progress and scrolls to the saved page (waits for image load via `load` event listener with 3s timeout fallback)
- **Sticky header** — title name, chapter name, page counter, prev/next chapter navigation
- **Progress bar** — cyan bar showing percentage through chapter (width via inline style)
- **Prev/Next chapter** — derived from `getMangaDetail` chapters array by index
- **Bottom nav** — "← All Chapters" link and page count
- **Discord Rich Presence** — on desktop, updates presence with title name and chapter via `desktopBridge`
- **TV gate** — renders `TvMangaReader` when `isTV()` returns true
- **Error boundary** — `FeatureErrorBoundary` wrapper

## Platform Variations

### Smart TV (Android TV)

The manga feature has full Smart TV support via three dedicated pages that use `@noriginmedia/norigin-spatial-navigation` for D-pad navigation:

#### TvManga (`src/platforms/smart-tv/pages/TvManga.tsx`)

TV browse page with:
- **Spatial navigation** — `FocusContext` provider with `TV_MANGA_PAGE` focus key
- **Focusable cards** — `FocusableMangaCard` with `border-tv-focus` highlight on focus, scale-up animation
- **Tabs** — `FocusableTab` components (Popular, Latest, Favorites, Continue)
- **Search** — inline `SearchInput` with `useDebounce(400ms)`, uses same `['manga', 'search', query]` TanStack Query key
- **Auto-scroll** — `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on focus
- **Reuses** `getMangaRanking`, `getMangaLatest`, `getMangaFavorites`, `getMangaProgress`, `searchManga` from `@/features/manga/api`

#### TvMangaTitle (`src/platforms/smart-tv/pages/TvMangaTitle.tsx`)

TV title detail with:
- **Focusable chapter list** — `ChapterItem` components with Enter-to-open navigation
- **Back button** — focusable, navigates via `router.back()`
- **Cover + metadata** — title, author, rating, overview (line-clamped)
- **Limits** — shows first 100 chapters max (performance guard for TV)

#### TvMangaReader (`src/platforms/smart-tv/pages/TvMangaReader.tsx`)

Fullscreen single-page reader for TV:
- **D-pad navigation** — ArrowRight/ArrowDown advances page, ArrowLeft/ArrowUp goes back
- **Escape/GoBack** — exits reader via `router.back()`
- **Full-screen image** — `next/image` with `fill` + `object-contain`, `unoptimized` flag
- **Page indicator** — bottom center pill showing current/total
- **Chapter name** — top-left overlay
- **Focus hook** — `useTvFocus('tv-manga-reader', 'TV_MANGA_READER')`

### TV Routing

The `MangaTvGate` component (`src/app/(protected)/(main)/manga/MangaTvGate.tsx`) uses `TvPageGate` to conditionally render `TvManga` on Android TV or the standard `MangaClient` on web/mobile. The title and chapter pages internally check `isTV()` and render their TV counterparts directly.

### Desktop

No dedicated desktop components. The reader integrates with Electron via `desktopBridge.updateDiscordPresence` for Discord Rich Presence during reading sessions (shows title name + chapter name).
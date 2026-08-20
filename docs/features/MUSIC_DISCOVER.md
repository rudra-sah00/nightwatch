# Music Discover

Swipe-based song discovery feed with audio previews, haptic feedback, playlist integration, and backend-driven personalized recommendations.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                      │
│                                                          │
│  Feature Module: src/features/music-discover/            │
│    ├── api.ts (feed, swipe, recordListen)                │
│    ├── types.ts (DiscoverSong interface)                 │
│    ├── hooks/use-discover-preview.ts (audio engine)      │
│    └── components/                                       │
│         ├── DiscoverView.tsx (main container + state)    │
│         ├── DiscoverCard.tsx (draggable song card)       │
│         ├── DiscoverCardStack.tsx (background stack)     │
│         └── DiscoverActions.tsx (action buttons + lists) │
│                                                          │
│  Route: src/app/(protected)/(main)/music/discover/       │
│    └── page.tsx (metadata + DiscoverView)                │
│                                                          │
│  Integration:                                            │
│    MusicEngineInit → dynamically imports recordListen    │
│    from music-discover/api at 60% play progress          │
│                                                          │
│  Data: TanStack Query (feed fetch), fire-and-forget      │
│        POST calls (swipe, listen)                        │
└──────────────────────┬───────────────────────────────────┘
                       │ apiFetch (cookie-authenticated HTTP)
┌──────────────────────▼───────────────────────────────────┐
│  Backend (Node.js / Express)                             │
│                                                          │
│  /api/music/discover/* routes                            │
│    ├── Feed Algorithm (80/20 exploit/explore, decay      │
│    │   weights, session momentum, artist affinity)       │
│    ├── Redis (pool cache 1h, streak counter 10min TTL,   │
│    │   song performance, banned artists)                 │
│    ├── Firestore (music_swipes, music_listens)           │
│    └── JioSaavn Provider (song radio, trending,          │
│        featured stations, artist stations)               │
└──────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/features/music-discover/
├── api.ts                          # REST API functions (getDiscoverFeed, swipeSong, recordListen)
├── types.ts                        # DiscoverSong interface
├── hooks/
│   └── use-discover-preview.ts     # Audio preview engine with preloading
└── components/
    ├── DiscoverView.tsx            # Main container: feed state, drag logic, keyboard shortcuts
    ├── DiscoverCard.tsx            # Draggable/swipeable song card with indicators
    ├── DiscoverCardStack.tsx       # Layered background cards (depth illusion)
    └── DiscoverActions.tsx         # Action buttons row + playlist picker overlay

src/app/(protected)/(main)/music/discover/
└── page.tsx                        # Route entry: metadata + DiscoverView
```

## API Layer

`src/features/music-discover/api.ts`

All functions use `apiFetch` (cookie-authenticated HTTP client). Backend base path: `/api/music/discover`.

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getDiscoverFeed(limit?)` | GET | `/api/music/discover/feed?limit=` | Fetch personalized song batch (default 20) |
| `swipeSong(songId, action, meta?)` | POST | `/api/music/discover/swipe` | Record like/dislike with engagement metadata |
| `recordListen(songId)` | POST | `/api/music/discover/listen` | Record implicit listen signal (60%+ playback) |

### Implicit Listen Signal

`recordListen` is NOT called from within the discover feature itself. It is dynamically imported by `MusicEngineInit` (`src/features/music/components/MusicEngineInit.tsx`) when any song reaches 60% playback progress in the main music player. This provides a passive signal to the recommendation engine without requiring explicit user action in the discover UI.

```typescript
// In MusicEngineInit — dynamic import to avoid circular dependency
if (progress >= 60 && listenRecordedRef.current !== currentTrack.id) {
  listenRecordedRef.current = currentTrack.id;
  import('@/features/music-discover/api').then((m) =>
    m.recordListen(currentTrack.id).catch(() => {}),
  );
}
```

## Types

`src/features/music-discover/types.ts`

```typescript
interface DiscoverSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  language: string;
  year: number;
  seed?: string; // "Because you liked X" attribution
}
```

The `seed` field is optional and provided by the backend when a song was generated from a specific liked-song radio station, enabling "Because you liked [seed]" attribution in the UI.

## TanStack Query Keys

| Key | Used In | Purpose |
|-----|---------|---------|
| `['music', 'discover', 'feed']` | `DiscoverView` | Initial feed fetch (20 songs) |
| `['music', 'playlists']` | `DiscoverActions` | User playlists (lazy-loaded on button click) |

## Hook: useDiscoverPreview

`src/features/music-discover/hooks/use-discover-preview.ts`

Audio preview engine that plays a 45-second snippet of the current card's song, starting at 33% of the track duration:

```typescript
function useDiscoverPreview(
  feed: DiscoverSong[],
  currentIndex: number,
  muted: boolean,
): {
  hasInteracted: boolean;
  isPlaying: boolean;
  handleFirstInteraction: () => void;
  stopCurrent: () => void;
  cleanupSong: (songId: string) => void;
  togglePlay: () => void;
}
```

Key behaviors:
- **Preloading** — preloads the next 3 songs' audio via `getStreamUrl` (from `@/features/music/api`) at 96kbps quality
- **Start position** — seeks to 33% of the song's duration (`Math.floor(song.duration * 0.33)`) for a musically interesting section
- **Preview duration** — auto-fades out after 45 seconds (volume decreases by 0.08 every 150ms)
- **First interaction gate** — requires user interaction before playback (browser autoplay policy compliance)
- **Mute support** — volume set to 0 when muted, 0.8 when unmuted; mute toggle is instant
- **Media Session suppression** — sets `navigator.mediaSession.metadata = null` to prevent iOS lock screen / Now Playing interference
- **HTMLAudioElement** — uses raw `Audio()` elements with `disableRemotePlayback = true`
- **Visibility pause** — pauses preview when the tab/app goes to background (`visibilitychange` event)
- **Cleanup** — stops all preloaded audio and clears `src` on unmount
- **Analytics** — tracks `DISCOVER_PREVIEW_PLAY` event via `trackEvent`

## Key Components

### DiscoverView

`src/features/music-discover/components/DiscoverView.tsx`

Main container and state orchestrator:

**State management:**
- `feed` — local state array, initialized from TanStack Query result
- `currentIndex` — index into feed array
- `swipeDir` — animation direction (`'left' | 'right' | null`)
- `dragX` — current drag offset in pixels
- `canUndo` — whether undo is available (last 1 swipe stored)
- `muted` — audio mute toggle
- `cardStartTime` — timestamp when current card was shown (for `timeOnCard` calculation)
- `swipedIds` — `Set<string>` ref tracking already-swiped song IDs

**Swipe interaction:**
- **Pointer events** — `onPointerDown`/`onPointerMove`/`onPointerUp` on the card element with `setPointerCapture`
- **Threshold** — 80px drag triggers a swipe commit
- **Haptic feedback** — `hapticLight` at 80px threshold, `hapticSuccess` on like, `hapticMedium` on dislike (via `@/lib/haptics`)
- **Animation** — 300ms CSS transition to off-screen position, then state advances

**Swipe flow:**
1. User drags card past 80px → `handleSwipe('like'|'dislike')` called
2. `swipeSong` API called with `songId`, `action`, `artist`, `language`, and `timeOnCard` (seconds since card appeared)
3. Audio stopped and preload cache cleaned for that song
4. Last swipe stored for undo; `canUndo` set to `true`
5. After 300ms animation: index advances, `cardStartTime` resets

**Feed pagination:**
- When `currentIndex >= feed.length - 5`, fetches 20 more songs via `getDiscoverFeed(20)`
- Deduplicates against existing feed IDs and already-swiped IDs

**Undo:**
- Stores last swipe in `lastSwipe` ref (song, action, index)
- On undo: removes song from `swipedIds`, resets index, clears undo state
- Keyboard shortcut: `Cmd/Ctrl+Z`

**Keyboard shortcuts:**
- `ArrowRight` → like
- `ArrowLeft` → dislike
- `Cmd/Ctrl+Z` → undo

**UI states:**
- Loading skeleton — simulated card stack with pulse animation
- Empty state — "No more songs" + "Come back later" message
- "Tap to start" overlay — shown until first interaction (audio autoplay policy)
- Header — back link to `/music`, mute toggle button

**Analytics events:** `DISCOVER_SESSION_START` (with feed count), `DISCOVER_SWIPE_LIKE`, `DISCOVER_SWIPE_DISLIKE`, `DISCOVER_UNDO`.

### DiscoverCard

`src/features/music-discover/components/DiscoverCard.tsx`

The draggable top card displaying the current song:

- **Drag transform** — `translateX(${dragX}px) rotate(${dragX * 0.08}deg)` during drag, physics-based exit animation on swipe (`translateX(±150%) rotate(±20deg) scale(0.9)`)
- **CSS transitions** — disabled during drag (`transition: 'none'`), 0.3s cubic-bezier on swipe commit
- **Touch handling** — `touch-none` CSS + pointer capture for reliable cross-device dragging
- **Song image** — `next/image` with `fill` + `priority` flag
- **Gradient overlay** — `bg-gradient-to-t from-black/90 via-black/10 to-transparent`
- **Seed attribution** — when `song.seed` exists, shows "Because you liked [seed]" at the top
- **Song info** — title (headline, 2-line clamp), artist, language badge, year badge
- **Swipe indicators** — "LIKE ♪" (green, rotated -12°) when dragging right past 20px, "SKIP" (red, rotated +12°) when dragging left; opacity scales with drag distance (0→1 over 80px)

### DiscoverCardStack

`src/features/music-discover/components/DiscoverCardStack.tsx`

Background card stack creating depth illusion:

- Renders the next two songs (2nd and 3rd in queue) as scaled-down, partially transparent cards
- **Third card** — `scale(0.88) translateY(-14px)`, 40% opacity; animates to `scale(0.92) translateY(-8px)`, 50% opacity when top card is swiping
- **Second card** — `scale(0.93) translateY(-7px)`, 60% opacity; animates to `scale(0.97) translateY(-3px)`, 80% opacity on swipe
- **Dark overlays** — `bg-black/50` (third) and `bg-black/30` (second) to reinforce depth
- **300ms transitions** — synchronized with swipe animation timing

### DiscoverActions

`src/features/music-discover/components/DiscoverActions.tsx`

Action buttons below the card stack:

**Button row (5 buttons):**
1. **Dislike/Skip** — red ring, `X` icon, calls `onSwipe('dislike')`
2. **Undo** — border ring, `RotateCcw` icon, disabled when `!canUndo` (30% opacity)
3. **Play/Pause** — bordered card bg, `Play`/`Pause` icon, toggles preview audio
4. **Add to Playlist** — border ring, `ListPlus` icon, opens playlist picker overlay
5. **Like** — green ring, `Heart` icon, calls `onSwipe('like')`

All buttons: 90% active scale, transition-transform.

**Playlist picker overlay:**
- Glassmorphism modal (`bg-white/10 backdrop-blur-xl`, white/20 border)
- Fetches playlists via `useQuery(['music', 'playlists'])` using `getUserPlaylists` from `@/features/music/api` (lazy — only when overlay opens)
- Each playlist shows cover image (via `next/image`), name, and track count
- Click calls `addTrackToPlaylist(playlistId, trackData)` from `@/features/music/api`
- Success: haptic + toast "Added to playlist" + close overlay + tracks `DISCOVER_ADD_TO_PLAYLIST` event
- Error: toast "Already in playlist"
- Dismiss: click-outside or Escape key

## Data Flow: Feed → Swipe → Recommendation

1. `DiscoverView` mounts → TanStack Query fetches `getDiscoverFeed(20)`
2. Feed populates local state, `DISCOVER_SESSION_START` tracked
3. `useDiscoverPreview` preloads audio for first 3 songs
4. User sees card, hears 45s preview (starting at 33% of track)
5. User drags or clicks action button:
   - **Like** → `swipeSong(id, 'like', { artist, language, timeOnCard })` → backend stores in Firestore `music_swipes`, updates Redis streak
   - **Dislike** → `swipeSong(id, 'dislike', { artist, language, timeOnCard })` → backend stores, removes from `music_listens` if present
6. When 5 cards remain, frontend fetches another batch (backend serves from Redis cache or regenerates)
7. Separately: when user plays any song ≥60% in the main music player, `recordListen(songId)` is fired → backend stores in `music_listens` for softer signal seeding

## Backend Algorithm (Summary)

The backend uses an 80/20 exploit/explore strategy:
- **Exploit (80%)** — song radio seeded from user's liked songs (weighted by recency decay: `0.97^days`)
- **Explore (20%)** — featured stations from languages the user hasn't interacted with + trending songs
- **Session momentum** — Redis streak counter adapts seed count: like-streak ≥3 adds experimental content, dislike-streak ≤-3 injects "guaranteed hits"
- **Post-processing** — filters already-swiped, bans artists with 3+ dislikes, applies artist spacing (no same artist within 3 cards), language diversity rules
- **Engagement velocity** — `timeOnCard` modulates seed weight (>10s = strong signal, <2s instant-skip = doubled penalty)

See `/nightwatch-backend/docs/api/discover.md` for the full algorithm documentation including mermaid diagrams.

## Integration with Main Music Feature

The discover feature has a bidirectional relationship with `src/features/music/`:

1. **Preview audio** — `useDiscoverPreview` calls `getStreamUrl` from `@/features/music/api` to get playback URLs
2. **Implicit listen** — `MusicEngineInit` dynamically imports `recordListen` from `music-discover/api` (avoids circular dep)
3. **Playlist management** — `DiscoverActions` uses `getUserPlaylists` and `addTrackToPlaylist` from `@/features/music/api`
4. **Shared types** — Songs added to playlists use the standard `MusicTrack` shape via explicit field mapping
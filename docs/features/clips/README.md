# Livestream Clipping

Record moments from live streams as clips, managed via a server-side recording model. Clips are processed into MP4 videos with auto-generated thumbnails and appear in the user's Library page.

**Source:** `src/features/clips/`, `src/app/(protected)/(main)/library/`, `src/app/(protected)/clip/[id]/`, `src/app/(public)/clip/share/[shareId]/`

## Architecture

```
src/features/clips/
├── api.ts                          # API: startServerClip, stopServerClip, getClips, deleteClip, renameClip, toggleClipPublic, getPublicClip, saveScreenshot
├── types.ts                        # Clip, ClipStatus, ClipsResponse
├── hooks/
│   ├── use-clip-recorder.ts        # Core hook: server-side start/stop with timer
│   └── use-clips.ts                # Library: TanStack Query infinite scroll + mutations
└── components/
    ├── RecordButton.tsx             # Toggle button in live player header
    └── ClipCard.tsx                 # Card with thumbnail, editable title, date badge, status
```

### Integration Points

- **Live Player** (`WatchLivePlayer.tsx`): `RecordButton` in `PlayerHeader` right slot (desktop only, hidden on mobile via `checkIsMobile()`).
- **Watch Party Sketch** (`WatchPartySketch.tsx`): "Capture Scene" saves a composite screenshot to the clips library via `saveScreenshot()`.
- **Library Page** (`/library`): `ClipsGrid` with search and infinite scroll.
- **Clip Player** (`/clip/[id]`): Plays clips via query params in the core VOD player.
- **Socket.IO**: `clip:ready` event for real-time status updates when processing finishes.

## Recording

### Server-Side Recording

Recording is fully server-side. The frontend sends start/stop timestamps and the backend extracts the relevant HLS segments:

```
User clicks Record
  → POST /api/clips/start-server-clip { streamToken, streamUrl, matchId, title, startTime }
  → Backend begins tracking the live HLS stream segments
  → (On stop) POST /api/clips/:id/stop-server-clip { endTime }
  → Backend extracts segments for the time range → FFmpeg → MP4 → storage
```

No browser MediaRecorder or `captureStream()` is involved — the frontend only tracks elapsed time locally for the UI timer.

## Recording Flow

1. User clicks **Record** → `POST /api/clips/start-server-clip` with `streamToken`, `streamUrl`, `matchId`, `title`, `startTime` → returns `{ clipId }`
2. Frontend starts a 1-second interval timer for the duration display
3. User clicks **Stop** (or 5 min auto-stop) → `POST /api/clips/:id/stop-server-clip` with `{ endTime }`
4. **(Backend)** Enqueues processing job → clip-processor extracts HLS segments for the time range → FFmpeg → MP4 + thumbnail → storage → DB update
5. **(Backend)** Publishes `clip:ready` to Redis → relays via Socket.IO → frontend toast + refetch

## Constraints

| Constraint | Value |
|-----------|-------|
| Max duration | 5 minutes (300s auto-stop) |
| Min duration | 5 seconds (stop disabled until elapsed) |
| Default page size | 12 clips per page |

## API Endpoints

### Recording

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clips/start-server-clip` | Start recording `{ streamToken, streamUrl, matchId, title, startTime }` → `{ clipId }` |
| `POST` | `/api/clips/:id/stop-server-clip` | Stop recording `{ endTime }` → `{ status }` |

### Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clips` | User's clips (paginated, filterable) |
| `PATCH` | `/api/clips/:id` | Rename clip `{ title }` |
| `DELETE` | `/api/clips/:id` | Delete clip + storage objects |

### Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clips/:id/toggle-public` | Toggle public visibility → `{ isPublic, shareId }` |
| `GET` | `/api/clips/public/:shareId` | Fetch public clip by share ID (no auth required) |

### Screenshot

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clips/screenshot` | Save a scene capture screenshot `{ image, title }` |

### GET /api/clips Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 12 | Items per page (max 50) |
| `search` | string | — | Fuzzy title search (ILIKE) |
| `sort` | string | `newest` | `newest`, `oldest`, `longest`, `shortest` |
| `dateFrom` | string | — | ISO date string filter |
| `dateTo` | string | — | ISO date string filter |

## Types

```typescript
type ClipStatus = 'recording' | 'processing' | 'ready' | 'failed';

interface Clip {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  duration: number;
  status: ClipStatus;
  matchId: string;
  isPublic: boolean;
  shareId: string | null;
  createdAt: string;        // ISO 8601
}

interface ClipsResponse {
  clips: Clip[];
  total: number;
  page: number;
  totalPages: number;
}
```

## Socket Events

| Direction | Event | Payload | Transport |
|-----------|-------|---------|-----------|
| Backend → Client | `clip:ready` | `{ userId, clipId, thumbnailUrl, videoUrl, duration }` | Socket.IO (relayed from Redis pub/sub) |

## useClipRecorder Hook

`src/features/clips/hooks/use-clip-recorder.ts`

Server-side clip recording hook. Records start/stop timestamps and delegates HLS segment extraction to the backend — no browser MediaRecorder or `captureStream()` needed.

```ts
interface UseClipRecorderOptions {
  matchId: string;
  title: string;
  streamToken: string | null;   // Token-based streams
  streamUrl?: string | null;    // IPTV/direct streams without a session token
}

const { isRecording, duration, clipId, canStop, isStarting, isStopping, start, stop } =
  useClipRecorder({ matchId, title, streamToken, streamUrl });
```

- `start()` → calls `startServerClip()`, starts a 1-second interval timer
- `stop()` → calls `stopServerClip()`, cleans up timer
- Auto-stops at 300 seconds (5 min)
- Stop disabled until 5 seconds have elapsed
- Tracks analytics events: `clip_record_start`, `clip_record_stop`

## RecordButton Component

`src/features/clips/components/RecordButton.tsx`

### States

| State | Visual | Interaction |
|-------|--------|-------------|
| **Idle** | White pill with red dot + "CLIP" label | Click → `onStart()` |
| **Starting** | Red pill with spinner + "Starting..." | Disabled |
| **Recording** | Red pill with pulsing dot + "REC 0:00" timer | Click → `onStop()` (disabled until 5s minimum) |
| **Stopping** | Red pill with spinner + "Saving..." | Disabled |

Uses `formatTime` from `src/features/music/utils` for the timer display.

## useClips Hook

`src/features/clips/hooks/use-clips.ts`

TanStack Query infinite query for the clips library:
- Query key: `['clips', filterKey]` where filterKey encodes search/sort/date filters
- Pages of 12 clips each via `getNextPageParam`
- `remove` mutation → `deleteClip()` → invalidates queries, tracks `clip_delete`
- `rename` mutation → `renameClip()` → invalidates queries, tracks `clip_rename`
- Returns `clips`, `isLoading`, `isLoadingMore`, `hasMore`, `loadMore`, `refetch`, `remove`, `rename`

## Library Page

The `/library` route (`ClipsGrid` component) displays clips with:

- **Search bar** — debounced 300ms fuzzy title search via `NeoSearchBar`
- **Infinite scroll** — `IntersectionObserver` (200px root margin) loads next page
- **Real-time updates** — `clip:ready` socket event triggers refetch + success toast
- **Empty state** — scissors icon with "No clips" message

### ClipCard Features

- Thumbnail with grayscale → color hover effect
- Date badge (top-right, neo-yellow) formatted via `useFormatter` (next-intl)
- Duration badge (top-left, black)
- Status badge — "Processing" with spinner, or "Failed"
- Editable title — inline rename with Enter/Escape, max 100 chars
- Share button — `text-neo-blue` when public, `text-foreground/30` when private (only shown when `status === 'ready'`)
- Delete button
- Play overlay → opens `/clip/:id?src=...&title=...` with core VOD player

## Clip Player Page

**Route**: `/clip/[id]` — `src/app/(protected)/clip/[id]/page.tsx`

Reads `src` and `title` from search params. Renders the clip in `WatchVODPlayer` with `skipProgressHistory`. On Smart TV, renders `TvWatch` instead.

## Public Clip Sharing

### Public Share Route

**Route**: `/clip/share/[shareId]` — `src/app/(public)/clip/share/[shareId]/page.tsx`

This is a **public** route (under the `(public)` route group — no authentication required).

The server component (`page.tsx`) generates Open Graph and Twitter Card metadata by calling `getPublicClip(shareId)` at request time.

The client component (`ClipShareClient.tsx`):
1. Fetches the clip via `useQuery` calling `getPublicClip(shareId)`
2. Renders the clip in `WatchVODPlayer` with `hideBackButton` and `skipProgressHistory`
3. Shows a "Clip not found" error state if the clip doesn't exist or is no longer public

### Share Flow

1. User clicks share icon on a `ClipCard`
2. If already public: copies `https://nightwatch.in/clip/share/{shareId}` to clipboard (or native share on mobile via `mobileBridge.share()`)
3. If private: calls `toggleClipPublic(clipId)` → backend generates a `shareId` → copies share URL
4. Toggle again to make private: `shareId` set to `null`, existing share links stop working

## Backend Processing (Clip Processor)

> The following describes the backend; it is not part of the frontend codebase.

Runs as a **separate Docker container** with FFmpeg installed.

1. Receives job via BullMQ queue
2. Downloads HLS segments from storage for the recorded time range
3. Processes via FFmpeg → MP4 with `-movflags +faststart`
4. Generates thumbnail at midpoint via `ffmpeg -ss`
5. Uploads MP4 + thumbnail to storage
6. Updates DB status to `ready`
7. Publishes `clip:ready` to Redis → relayed to frontend via Socket.IO

## Testing

| Test File | Tests | Coverage |
|-----------|-------|---------|
| `tests/features/clips/api.test.ts` | 9 | All API functions: getClips with pagination/filters, deleteClip, renameClip |
| `tests/features/clips/types.test.ts` | 6 | All type shapes: ClipStatus, Clip, ClipsResponse |
| `tests/features/clips/components/RecordButton.test.tsx` | 7 | Idle/recording states, start/stop callbacks, disabled state, time formatting |

## Related Docs

- [Livestream](../livestream/README.md) — live TV streaming and player
- [Watch](../watch/README.md) — VOD player used for clip playback
- [Watch Party](../watch-party/README.md) — scene capture integration

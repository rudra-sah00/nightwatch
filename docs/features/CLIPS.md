# Livestream Clipping

## Overview

Users can record up to 5 minutes of a live stream, creating clips that are processed server-side into MP4 videos with auto-generated thumbnails. Clips appear in the user's Library page where they can be searched, sorted, renamed, played, or deleted.

## Architecture

```
src/features/clips/
├── api.ts                          # API: start, pushSegment, pushSegmentData, finalize, getClips, deleteClip, renameClip
├── types.ts                        # Clip, ClipSegment, ClipStatus, ClipsResponse
├── hooks/
│   ├── use-clip-recorder.ts        # Core hook: hls.js fragment capture, dual-mode (URL vs binary)
│   └── use-clips.ts                # Library: infinite scroll, search, sort, date filters
└── components/
    ├── RecordButton.tsx             # Toggle button in live player header
    └── ClipCard.tsx                 # Card with thumbnail, editable title, date badge, status
```

### Integration Points

- **Live Player** (`WatchLivePlayer.tsx`): RecordButton in `PlayerHeader` right slot.
- **Player Context** (`PlayerContext.tsx`): Exposes `hlsRef` for fragment capture.
- **Library Page** (`/library`): ClipsGrid with search, sort, infinite scroll.
- **Clip Player** (`/clip/[id]`): Plays clips in the core VOD player.
- **Socket.IO**: `clip:ready` event via Redis pub/sub for real-time status updates.

## Dual-Mode Recording (Server 1 vs Server 1)

### Unified Recording (All Servers)

Both Server 1 and Server 1 use the same recording approach via MediaRecorder + captureStream.

```
User clicks Record
  → MediaRecorder captures decoded video/audio frames from <video> element
  → 2-second WebM chunks sent as binary to POST /api/clips/:id/segment-data
  → Backend uploads each chunk to MinIO (clips/{clipId}/segments/seg_NNNN.webm)
  → (On finalize) Clip processor downloads from MinIO → concatenates WebM → FFmpeg → MP4 → MinIO
```

Recording pauses automatically when the video pauses or buffers, and resumes on playback.

## Recording Flow

1. User clicks **Record** → `POST /api/clips/start` → returns `clipId`
2. MediaRecorder captures decoded frames from `<video>` element
3. Every 2 seconds, a WebM chunk is uploaded to MinIO via `POST /api/clips/:id/segment-data`
4. User clicks **Stop** (or 5 min auto-stop) → `POST /api/clips/:id/finalize`
5. Backend enqueues BullMQ job → clip-processor container processes
6. Worker: downloads chunks from MinIO → concatenates WebM → FFmpeg MP4 → uploads to MinIO → DB update
7. Worker publishes `clip:ready` to Redis → backend relays via Socket.IO → frontend toast + refetch

## Constraints

| Constraint | Value |
|-----------|-------|
| Max duration | 5 minutes (auto-stop) |
| Min duration | 5 seconds (stop disabled until elapsed) |
| Rate limit | 5 clips per user per hour |
| Max segments | 150 per clip |
| Deduplication | Fragment URLs deduped client-side via Set |
| Default page size | 12 clips per page |

## Backend Processing (Clip Processor)

Runs as a **separate Docker container** with FFmpeg installed.

```
services/clip-processor/
├── index.ts          # Standalone entry with preflight health checks
├── worker.ts         # BullMQ worker + Redis pub/sub for clip:ready
├── pipeline.ts       # Download → FFmpeg concat → MP4 → thumbnail
├── s3.ts             # S3/MinIO upload (dev: localhost:9000, prod: AWS S3)
└── queue.ts          # Shared BullMQ queue config
```

### Preflight Health Checks (Startup)

- ✅ FFmpeg installed and accessible
- ✅ `/tmp/clips` volume writable
- ✅ BullMQ queue connected (Redis)
- ✅ Database connected (Postgres)

### FFmpeg Pipeline

1. Download WebM chunks from MinIO (`clips/{clipId}/segments/`)
2. Concatenate into single `recorded.webm`
3. `ffmpeg -i recorded.webm → libx264 MP4` with `-movflags +faststart`
4. `ffprobe` for accurate duration
5. `ffmpeg -ss <midpoint>` → thumbnail.jpg
6. Upload MP4 + thumbnail to MinIO
7. Update DB status to `ready`
8. Publish `clip:ready` to Redis
9. Cleanup: delete local temp files + MinIO segment objects

### Storage

| Environment | Service | URL Format |
|------------|---------|------------|
| Development | MinIO (Docker) | `http://localhost:9000/nightwatch-clips/clips/{userId}/{clipId}/video.mp4` |
| Production | MinIO (Self-hosted) | `https://s3.nightwatch.in/nightwatch-clips/clips/{userId}/{clipId}/video.mp4` |

### Docker Setup

**Dev** (`docker-compose.dev.yml`):
- `minio` — S3-compatible storage (ports 9000/9001)
- `minio-init` — creates `nightwatch-clips` bucket
- `clip-processor` — FFmpeg + BullMQ worker, mounts host `/tmp/clips`

**Prod** (`docker-compose.prod.yml`):
- `clip-processor` — built from `Dockerfile.clip-processor`, shared volume with backend

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clips/start` | Start recording `{ matchId, title, streamUrl }` → `{ clipId }` |
| `POST` | `/api/clips/:id/segment` | Push segment URL (Server 1) `{ url, startTime, duration }` → 204 |
| `POST` | `/api/clips/:id/segment-data` | Push segment bytes (Server 1) `Content-Type: application/octet-stream` → 204 |
| `POST` | `/api/clips/:id/finalize` | Stop recording, enqueue processing → 202 |
| `GET` | `/api/clips` | User's clips (paginated, filterable) |
| `PATCH` | `/api/clips/:id` | Rename clip `{ title }` |
| `DELETE` | `/api/clips/:id` | Delete clip + S3 objects |

### GET /api/clips Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 12 | Items per page (max 50) |
| `search` | string | — | Fuzzy title search (ILIKE) |
| `sort` | string | `newest` | `newest`, `oldest`, `longest`, `shortest` |
| `dateFrom` | string | — | ISO date string filter |
| `dateTo` | string | — | ISO date string filter |

## Socket Events

| Direction | Event | Payload | Transport |
|-----------|-------|---------|-----------|
| Worker → Redis | `clip:ready` | `{ userId, clipId, thumbnailUrl, videoUrl, duration }` | Redis pub/sub |
| Backend → Client | `clip:ready` | same | Socket.IO (relayed from Redis) |

## Library Page

The `/library` route displays clips with:

- **Search bar** — debounced 300ms fuzzy title search
- **Sort dropdown** — Newest, Oldest, Longest, Shortest
- **Infinite scroll** — IntersectionObserver loads 12 clips per page
- **Real-time updates** — `clip:ready` socket event auto-refetches
- **Empty state** — shared `EmptyState` component (matches continue watching style)

### ClipCard Features

- Thumbnail with grayscale → color hover effect
- Date badge (top-right, neo-yellow)
- Duration badge (top-left, black)
- Status badge — "Processing" with spinner, or "Failed"
- Editable title — inline rename with Enter/Escape
- Delete button
- Play overlay → opens `/clip/{id}` with core VOD player

## Public Clip Sharing

Clips can be shared publicly via a unique share link. The sharing system uses a toggle-based visibility model with a dedicated public route.

### Toggle Public Visibility

```ts
// api.ts
export async function toggleClipPublic(clipId: string): Promise<{ isPublic: boolean; shareId: string | null }>;
export async function getPublicClip(shareId: string): Promise<Clip>;
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clips/:id/toggle-public` | Toggle public visibility → `{ isPublic, shareId }` |
| `GET` | `/api/clips/public/:shareId` | Fetch public clip by share ID (no auth required) |

### Clip Data Model (Sharing Fields)

```ts
interface Clip {
  // ... existing fields ...
  isPublic: boolean;        // Whether the clip is publicly accessible
  shareId: string | null;   // Unique share identifier (null if not shared)
}
```

### Public Share Route

**Route**: `/clip/share/[shareId]` — `src/app/(public)/clip/share/[shareId]/page.tsx`

This is a **public** route (under the `(public)` route group — no authentication required). It:

1. Extracts `shareId` from the URL params
2. Fetches the clip via `getPublicClip(shareId)`
3. Renders the clip in the standard `WatchVODPlayer` with `hideBackButton` enabled
4. Shows a "Clip not found" error state if the clip doesn't exist, was removed, or is no longer public

```tsx
const metadata: VideoMetadata = {
  title: clip.title,
  type: 'movie',
  movieId: `clip-${clip.id}`,
};

return <WatchVODPlayer streamUrl={clip.videoUrl} metadata={metadata} hideBackButton />;
```

### ClipCard Share Button

The `ClipCard` component includes a share button (Share2 icon) that:
- Shows `text-neo-blue` when the clip is already public
- Shows `text-foreground/30` when private
- Only appears when the clip status is `ready`
- Calls the parent `onShare(clip)` callback which typically toggles public visibility and copies the share URL

### Share Flow

1. User clicks share icon on a `ClipCard`
2. `toggleClipPublic(clipId)` is called → backend generates a `shareId` (or removes it)
3. If now public: share URL `https://nightwatch.in/clip/share/{shareId}` is copied to clipboard
4. If now private: `shareId` is set to `null`, existing share links stop working

## RecordButton Integration with Livestreams

The `RecordButton` component (`src/features/clips/components/RecordButton.tsx`) is integrated into the live player's header bar.

### Integration Point

- **Live Player** (`WatchLivePlayer.tsx`): `RecordButton` is placed in the `PlayerHeader` right slot
- **Player Context** (`PlayerContext.tsx`): Exposes `hlsRef` for the recorder to access the video element

### RecordButton States

| State | Visual | Interaction |
|-------|--------|-------------|
| **Idle** | White pill with red dot + "CLIP" label | Click → `onStart()` |
| **Starting** | Red pill with spinner + "Starting..." | Disabled |
| **Recording** | Red pill with pulsing dot + "REC 0:00" timer | Click → `onStop()` (disabled until 5s minimum) |
| **Stopping** | Red pill with spinner + "Saving..." | Disabled |

### useClipRecorder Hook

`src/features/clips/hooks/use-clip-recorder.ts` manages the full recording lifecycle:

1. Captures the `<video>` element's MediaStream via `captureStream()`
2. Creates a `MediaRecorder` with WebM codec (`vp9,opus` preferred, `webm` fallback)
3. Records 2-second chunks uploaded to the backend in real-time
4. Automatically pauses/resumes when the video element pauses or buffers
5. Enforces 5-second minimum and 300-second (5 min) maximum duration

```ts
const { isRecording, duration, clipId, canStop, isStarting, isStopping, start, stop } =
  useClipRecorder({ matchId, title, streamUrl });
```

## Testing

| Test File | Tests | Coverage |
|-----------|-------|---------|
| **Frontend** | | |
| `clips/api.test.ts` | 9 | All API functions including pushSegmentData and filter params |
| `clips/types.test.ts` | 6 | All type shapes |
| `clips/hooks/use-clips.test.ts` | 8 | Fetch, loadMore, remove, rename, filters, refetch, error handling |
| `clips/components/RecordButton.test.tsx` | 7 | Idle/recording states, start/stop, disabled, time formatting |
| **Backend** | | |
| `clips/unit/clips.service.test.ts` | 15+ | All service methods including pushSegmentBinary |
| `clips/unit/clips.controller.test.ts` | 10+ | All endpoints including pushSegmentData and filter params |

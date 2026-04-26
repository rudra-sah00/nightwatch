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

## Dual-Mode Recording (Server 1 vs Server 2)

### Server 2 — URL Mode (Default)

Server 2 streams go through the Cloudflare Worker CDN proxy. Segment URLs are valid server-side.

```
User clicks Record
  → hls.js FRAG_LOADED fires per segment
  → POST /api/clips/:id/segment { url, startTime, duration }
  → Backend stores URL in DB
  → (On finalize) Clip processor downloads via CF worker → FFmpeg → S3
```

### Server 1 — Binary Upload Mode (Electron Only)

Server 1 streams use an Electron-local HTTP proxy. URLs are only reachable from the user's machine.

```
User clicks Record
  → hls.js FRAG_LOADED fires per segment
  → Browser fetches segment bytes locally (Electron can reach its own proxy)
  → POST /api/clips/:id/segment-data (Content-Type: application/octet-stream)
    Headers: x-segment-start, x-segment-duration
  → Backend saves raw .ts bytes to /tmp/clips/
  → (On finalize) Clip processor reads local files → FFmpeg → S3
```

The `clientDownload` flag is set automatically based on `matchId.startsWith('live-server1:')`.

## Recording Flow

1. User clicks **Record** → `POST /api/clips/start` → returns `clipId`
2. Current playing segment captured immediately (hls.js buffer)
3. Each new segment streamed to backend in real-time as it loads
4. User clicks **Stop** (or 5 min auto-stop) → `POST /api/clips/:id/finalize`
5. Backend enqueues BullMQ job → clip-processor container processes
6. Worker: download (Server 2) or read local files (Server 1) → FFmpeg → S3 → DB update
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

1. Locate pre-downloaded segments OR download via `host.docker.internal` (Docker → host proxy)
2. Create FFmpeg concat file
3. `ffmpeg -f concat → libx264 MP4` with `-movflags +faststart`
4. `ffprobe` for accurate duration
5. `ffmpeg -ss <midpoint>` → thumbnail.jpg
6. Upload MP4 + thumbnail to S3/MinIO
7. Update DB status to `ready`
8. Publish `clip:ready` to Redis
9. Cleanup temp directory

### Storage

| Environment | Service | URL Format |
|------------|---------|------------|
| Development | MinIO (Docker) | `http://localhost:9000/nightwatch-clips/clips/{userId}/{clipId}/video.mp4` |
| Production | AWS S3 | `https://nightwatch-clips.s3.{region}.amazonaws.com/clips/{userId}/{clipId}/video.mp4` |

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
| `POST` | `/api/clips/:id/segment` | Push segment URL (Server 2) `{ url, startTime, duration }` → 204 |
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

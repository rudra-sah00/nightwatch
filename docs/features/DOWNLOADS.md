# Offline Downloads

## Overview

Nightwatch supports offline content downloads on both desktop (Electron) and mobile (Capacitor). Users can download movies and series episodes for offline playback, with support for HLS segment-by-segment downloads and direct MP4 downloads. The download system includes pause/resume, progress tracking, quality selection, and a full offline library UI.

## Architecture

```
src/features/downloads/                    # Cross-platform UI layer
├── components/
│   ├── OfflineLibrary.tsx                 # Page-level download library
│   └── offline-content-detail-modal.tsx   # Full-screen offline content viewer
└── hooks/
    ├── use-downloads.ts                   # Cross-platform download state hook
    ├── use-offline-content-detail.ts      # Offline content metadata resolver
    └── use-offline-content-detail-modal.ts # Modal orchestration hook

src/capacitor/downloads/                   # Mobile-specific download engine
├── index.ts                               # mobileDownloadManager entry point
├── state.ts                               # Persistence via Capacitor Preferences
├── network.ts                             # File download + Filesystem write
├── processors/
│   ├── hls.ts                             # HLS m3u8 parsing + segment download
│   └── mp4.ts                             # Direct MP4 download
└── providers/
    ├── s1.ts                              # Server 1 → HLS
    └── s2.ts                              # Server 2 → MP4 or HLS (auto-detect)

src/features/search/utils/download.ts      # Download initiation + quality sorting
```

## Cross-Platform Hook: `useDownloads`

`src/features/downloads/hooks/use-downloads.ts` is the primary hook for managing downloads. It auto-detects the platform and uses the appropriate bridge.

```ts
const {
  downloads,       // DownloadItem[]
  isDesktopApp,    // boolean
  isMounted,       // boolean
  isMobile,        // boolean
  cancelDownload,  // (contentId: string) => void
  pauseDownload,   // (contentId: string) => void
  resumeDownload,  // (contentId: string) => void
} = useDownloads();
```

### Platform Detection

| Platform | Detection | Bridge |
|----------|-----------|--------|
| Desktop (Electron) | `checkIsDesktop()` via `window.electronAPI` | `desktopBridge` from `electron-bridge.ts` |
| Mobile (Capacitor) | `useIsMobile()` via `Capacitor.isNativePlatform()` | `mobileDownloadManager` from `@/capacitor/downloads` |

### Real-Time Progress

Both platforms subscribe to progress events:

- **Desktop**: `desktopBridge.onDownloadProgress(callback)` — IPC from Electron main process
- **Mobile**: `mobileDownloadManager.onProgress(callback)` — in-memory listener array

Progress updates are applied optimistically to the local state array. Cancelled items are removed immediately.

## Download Item Schema

```ts
interface DownloadItem {
  contentId: string;        // Unique ID (may include provider prefix: "s1:", "s2:", "s3:")
  title: string;
  posterUrl?: string;
  filesize?: number;        // Total bytes (if known)
  downloadedBytes: number;
  progress: number;         // 0–100
  quality?: string;
  speed?: string;           // Human-readable (e.g. "2.5 MB/s")
  isMp4?: boolean;
  status: 'QUEUED' | 'DOWNLOADING' | 'COMPLETED' | 'PAUSED' | 'FAILED' | 'CANCELLED';
  error?: string;
  showData?: unknown;       // Embedded ShowDetails metadata for offline playback
  localPlaylistPath?: string;
  subtitleTracks?: { label: string; language: string; url: string; localPath?: string }[];
  createdAt: number;        // Unix timestamp (ms)
}
```

## Download Quality Sorting

`src/features/search/utils/download.ts` provides quality selection utilities:

```ts
const QUALITY_ORDER = ['1080p', '720p', '480p', '360p'];

// Sort qualities highest-first
const sorted = sortQualities(qualities);

// Fetch available qualities from backend
const qualities = await fetchDownloadLinks(id, type, season, episode);
```

### Quality Fetch API

```
GET /api/video/download-links?id={id}&type={movie|series}&season={n}&episode={n}
→ { success: boolean, qualities: { quality: string, url: string }[] }
```

## Starting a Download

`startDesktopDownload()` in `src/features/search/utils/download.ts` handles the full download initiation flow:

1. **Direct URL path** (Server 2 MP4): passes the URL directly to the platform bridge
2. **HLS path** (Server 1/3): resolves the master playlist via `playVideo()` API, then passes the m3u8 URL

```ts
await startDesktopDownload({
  contentId: 's1:abc123',
  showTitle: 'Breaking Bad',
  posterUrl: 'https://...',
  type: 'series',
  season: 2,
  episode: 3,
  quality: 'high',
  show: showDetails,  // Embedded metadata for offline playback
});
```

### Offline Identifier Generation

Content IDs for offline storage are deterministic:

| Scenario | Pattern | Example |
|----------|---------|---------|
| Movie (HLS) | `{contentId}` | `s1:abc123` |
| Series episode (HLS) | `{contentId}_S{season}E{episode}` | `s1:abc123_S2E3` |
| Movie (direct URL) | `{contentId}` | `s2:xyz789` |
| Series episode (direct URL) | `{contentId}-ep{episode}` | `s2:xyz789-ep3` |

## Mobile Download Engine

### Entry Point: `mobileDownloadManager`

`src/capacitor/downloads/index.ts` exports the mobile download manager with the same API shape as the Electron bridge:

```ts
mobileDownloadManager.startDownload({ contentId, title, m3u8Url, posterUrl, quality, metadata });
mobileDownloadManager.cancelDownload(contentId);
mobileDownloadManager.pauseDownload(contentId);
mobileDownloadManager.resumeDownload(contentId);
mobileDownloadManager.getDownloads();
mobileDownloadManager.onProgress(callback);
```

### Server Provider Routing

Downloads are routed to the correct processor based on the content ID prefix:

| Prefix | Provider | Processor |
|--------|----------|-----------|
| `s1:` | `downloadS1()` | HLS |
| `s2:` | `downloadS2()` | MP4 or HLS (auto-detect by URL) |
| `s3:` | `downloadS3()` | HLS |
| (fallback) | Auto-detect | MP4 if `.mp4` in URL, else HLS |

### HLS Download Processor

`src/capacitor/downloads/processors/hls.ts`:

1. Fetches the master m3u8 playlist
2. If variant playlist (multi-quality), selects the **last variant** (highest quality)
3. Parses the media playlist for segment URLs
4. Downloads each segment sequentially via `Filesystem.writeFile()`
5. Builds a local playlist with relative segment paths
6. Updates progress after each segment: `(downloaded / total) * 100`
7. Calculates download speed: `totalBytes / elapsed`

Storage layout:
```
OfflineVault/{contentId}/
├── playlist.m3u8       # Original media playlist (base64)
├── local.m3u8          # Rewritten playlist with relative paths
├── seg_0.ts
├── seg_1.ts
└── ...
```

### MP4 Download Processor

`src/capacitor/downloads/processors/mp4.ts` — single-file download:

```
OfflineVault/{contentId}/
└── video.mp4
```

### State Persistence

`src/capacitor/downloads/state.ts` persists the download list via Capacitor Preferences:

- Key: `nightwatch_downloads`
- Value: JSON-serialized `DownloadItem[]`
- Progress listeners: in-memory callback array with `onProgress()` / unlisten pattern

### Network Layer

`src/capacitor/downloads/network.ts` provides `downloadFile()`:

1. `fetch()` the URL with abort signal support
2. Convert response blob to base64
3. Write to Capacitor Filesystem (`Directory.Data`)
4. Return byte count

## OfflineLibrary Component

`src/features/downloads/components/OfflineLibrary.tsx` is the page-level component rendered at `/library`:

### Features

- **Search filtering** — real-time text filter on download titles
- **Status indicators** — color-coded labels (green=completed, yellow=downloading, red=failed)
- **Progress bars** — animated bars for active downloads with speed and percentage
- **Download controls** — Pause/Resume/Cancel buttons per item
- **Platform gate** — shows "Desktop or mobile required" notice on web browsers
- **Content detail modal** — clicking a completed item opens `OfflineContentDetailModal`

### Content ID Parsing

When selecting a completed download, the component parses the content ID to extract season/episode context:

| Pattern | Regex | Result |
|---------|-------|--------|
| `s1:abc_S2E3` | `/^(.*?)_S(\d+)E(\d+)$/` | `{ contentId: 's1:abc', season: 2, episode: 3 }` |
| `s2:xyz-ep5` | `/^(.*?)-ep(\d+)$/` | `{ contentId: 's2:xyz', season: 1, episode: 5 }` |
| `s1:movie123` | (no match) | `{ contentId: 's1:movie123' }` |

## OfflineContentDetailModal

`src/features/downloads/components/offline-content-detail-modal.tsx` — full-screen modal for offline content:

- Hero image with trailer auto-play (if available)
- Content metadata (title, year, description)
- Season selector and episode list (for series)
- Play / Resume buttons
- Auto-play countdown mode
- Escape key and body scroll lock

## useOfflineContentDetail Hook

`src/features/downloads/hooks/use-offline-content-detail.ts` resolves show details from the local download store:

1. Strips provider prefixes (`s1:`, `s2:`, `s3:`) from the content ID
2. Searches downloads for matching items (with or without prefix)
3. Extracts embedded `showData` metadata from the download item
4. Populates episodes and seasons for series content
5. Provides `handlePlay()` and `handleResume()` that navigate to `/watch/{id}` with query params

### Playback Navigation

For offline playback, the hook constructs watch URLs with full metadata:

```
/watch/{contentId}?type=movie&title={title}&server={providerId}&description={desc}&year={year}&poster={posterUrl}
/watch/{contentId}?type=series&title={title}&season={n}&episode={n}&seriesId={id}&server={providerId}
```

## useOfflineContentDetailModal Hook

`src/features/downloads/hooks/use-offline-content-detail-modal.ts` orchestrates the modal's UI concerns:

- Disables sidebars while modal is open
- Locks body scroll
- Handles Escape key
- Auto-play countdown logic
- Trailer auto-start (skipped for offline content)
- Composes `useOfflineContentDetail` for data

## Desktop Download Flow (Electron)

On desktop, downloads are managed by the Electron main process via `desktopBridge`:

```ts
desktopBridge.startDownload({ contentId, title, m3u8Url, posterUrl, subtitleTracks, quality, metadata });
desktopBridge.cancelDownload(contentId);
desktopBridge.pauseDownload(contentId);
desktopBridge.resumeDownload(contentId);
desktopBridge.getDownloads();
desktopBridge.onDownloadProgress(callback);
```

The Electron implementation handles HLS parsing, segment downloading, and file management in the main process with full Node.js filesystem access. Subtitle tracks are also downloaded alongside video content.

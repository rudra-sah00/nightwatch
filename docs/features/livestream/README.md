# Livestream Framework

Live TV streaming with IPTV channels, category browsing, search, solo/party watch options, and clip recording during playback.

**Source:** `src/features/livestream/`, `src/app/(protected)/(main)/live/`, `src/app/(protected)/live/[id]/`

## Directory Structure

```
src/features/livestream/
├── api.ts                          # REST API functions (IPTV channels, categories, resolve)
└── hooks/
    └── use-iptv.ts                 # TanStack Query hooks for channels + categories
```

## API Layer

`api.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `fetchIptvChannels(page, limit, search, category, signal)` | `GET /api/livestream/iptv/channels` | Paginated IPTV channel list with optional search and category filter |
| `fetchIptvCategories(signal)` | `GET /api/livestream/iptv/categories` | Available channel categories |
| `fetchIptvResolve(channelId, signal)` | `GET /api/livestream/iptv/resolve/:channelId` | Resolves a channel ID to a live stream URL (upstream URLs are short-lived) |

All functions use `apiFetch` with cookie authentication and support `AbortSignal` for cancellation.

### Types

```typescript
interface IptvChannel {
  id: string;
  providerId: string;
  name: string;
  category: string | null;
  icon: string | null;
  streamUrl: string | null;
  server: string;
}

interface IptvChannelsResponse {
  channels: IptvChannel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Hooks

### useIptvChannels

`hooks/use-iptv.ts`

TanStack Query wrapper around `fetchIptvChannels`:
- Query key: `['iptv', 'channels', page, limit, search, category]`
- Returns `channels`, `total`, `totalPages`, `page`, `isLoading`, `error`, `refresh`

### useIptvCategories

`hooks/use-iptv.ts` (same file)

Fetches available channel categories via TanStack Query.
- Query key: `['iptv', 'categories']`
- Returns `{ categories, isLoading }`

## Live Page (`/live`)

`src/app/(protected)/(main)/live/LiveClient.tsx`

The `/live` page renders an IPTV channel browser:

1. **Category filter** — dropdown populated by `useIptvCategories`
2. **Search bar** — debounced 400ms text input
3. **Channel grid** — `useIptvChannels(page, 30, search, category)` with pagination
4. **Channel click** → opens a modal with the channel name and two action buttons
5. **Watch Solo** → navigates to `/live/:channelId?type=iptv&title=...&poster=...`
6. **Watch Party** → calls `createPartyRoom` with `type: 'livestream'` and the channel's `streamUrl`, then navigates to `/watch-party/:roomId?new=true`

## Live Player Page (`/live/[id]`)

`src/app/(protected)/live/[id]/page.tsx`

The route ID is an IPTV channel ID. The page resolves it to a stream URL on demand because upstream URLs are short-lived:

1. `useQuery` calls `fetchIptvResolve(channelId)` to get the live stream URL
2. If resolved, renders `WatchLivePlayer` from `src/features/watch/components/WatchLivePlayer.tsx` with `metadata.type: 'livestream'`
3. On Smart TV, renders `TvWatch` instead with live-specific props
4. If the URL cannot be resolved, shows an unavailable state with a back link

### HLS Playback

`WatchLivePlayer` renders with live-optimised HLS.js config:
- `LiveSeekBar` provides DVR scrubbing within the buffered range
- `Player.LiveBadge` shows a "LIVE" indicator

## Clip Recording During Livestreams

`WatchLivePlayer` integrates clip recording (desktop only):

1. `useClipRecorder` hook from `src/features/clips/` manages server-side recording
2. `RecordButton` component in the player header shows record/stop controls with duration timer
3. Start → toast "Recording started" → `POST /api/clips/start-server-clip` with `streamToken` and `streamUrl`
4. Stop → toast "Clip saved!" → `POST /api/clips/:id/stop-server-clip`
5. Backend extracts the HLS segments for the recorded time range, processes via FFmpeg
6. Clips appear in the user's [Library page](../clips/README.md)

The `RecordButton` is hidden on mobile (`checkIsMobile()` guard).

The `/live/[id]` page also passes clip props to `TvWatch` on Smart TV, where the TV remote can start/stop recording.

## Data Flow

1. `/live` page renders category dropdown via `useIptvCategories`
2. Selected category + search → `useIptvChannels` fetches paginated channels
3. User clicks channel → modal opens
4. "Watch Solo" → navigates to `/live/:channelId`
5. "Watch Party" → `createPartyRoom` with livestream type → navigates to `/watch-party/:roomId`
6. `/live/:channelId` → `fetchIptvResolve` resolves stream URL → `WatchLivePlayer` starts playback

## Related Docs

- [Clips](../clips/README.md) — clip recording details
- [Watch Party](../watch-party/README.md) — livestream watch party support
- [Watch Party — Live TV](../watch-party/LIVE_TV.md) — watching a live channel together
- [Smart TV](../../platforms/SMART_TV.md) — TV remote live playback

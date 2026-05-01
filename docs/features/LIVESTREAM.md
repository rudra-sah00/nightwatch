# Livestream Framework

Live sports streaming with match schedules, live TV channels, match detail modals, solo/party watch options, and clip recording during playback.

## Directory Structure

```
src/features/livestream/
├── api.ts                          # REST API functions
├── types.ts                        # LiveMatch, LiveTeam, CricketMatchInfo
├── components/
│   ├── LiveMatchModal.tsx          # Match detail + watch prompt
│   └── LiveMatchCard.tsx           # Schedule card
└── hooks/
    ├── use-livestreams.ts          # Schedule fetcher + single match poller
    ├── use-sports.ts               # Sport category list
    ├── use-channels.ts             # Paginated TV channel list
    └── use-live-match-card.ts      # Card interaction logic
```

## API Layer

`api.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `fetchLivestreamSchedule(sportType, daysBackward, daysForward, signal)` | `GET /api/livestream/schedule` | Fetches matches within a date range for a sport type |
| `fetchLiveMatchDetail(id)` | `GET /api/livestream/match/:id` | Fetches detailed info for a single match |
| `fetchChannels(page, limit, search, signal)` | `GET /api/livestream/channels` | Paginated live TV channel list |
| `fetchSports(signal)` | `GET /api/livestream/sports` | Available sport categories |

All functions use `apiFetch` with cookie authentication and support `AbortSignal` for cancellation.

## Types

`types.ts`

```typescript
interface LiveMatch {
  id: string;
  team1: LiveTeam;           // { id, name, score, avatar }
  team2: LiveTeam;
  status: 'MatchNotStart' | 'MatchIng' | 'MatchEnded' | string;
  startTime: number;         // Unix timestamp
  endTime: number;
  league: string;
  type: string;              // Sport type
  timeDesc?: string;
  playPath?: string;         // HLS stream URL
  playType?: string;         // 'PlayTypeVideo' | 'hls'
  isStreamAvailable?: boolean;
  teamMatchInfo1?: CricketMatchInfo;  // Cricket-specific batting/bowling
  teamMatchInfo2?: CricketMatchInfo;
  matchResult?: string;      // Cricket match situation text
  contentKind?: 'match' | 'channel';  // UI hint for rendering
  channelName?: string;
}
```

`CricketMatchInfo` includes `score`, `crtRunsScored`, `crtWicketsLost`, `crtOvers`, `crtOversExtraBalls`.

## Hooks

### useLivestreams

`hooks/use-livestreams.ts`

Fetches and manages the livestream schedule:
- Deduplicates matches by ID (prevents React duplicate key errors)
- Sorts by start time ascending
- Cancels in-flight requests on sport type change or unmount
- Returns `schedule`, `isLoading`, `error`, `refresh`

### useLiveMatch

`hooks/use-livestreams.ts` (same file)

Fetches and polls a single live match:
- Initial fetch on mount
- Polls every 15 seconds while the match is live/upcoming and no `playPath` is available
- **Shallow equality check** during polls — only updates state if player-critical fields changed (`playPath`, `playType`, `status`, scores, `timeDesc`), preventing video player reinitialisation
- Swallows poll errors silently to keep existing match alive

### useSports

`hooks/use-sports.ts`

Fetches available sport categories. Always includes a hardcoded "All Channels" entry as the first item. Aborts on unmount.

### useChannels

`hooks/use-channels.ts`

Paginated live TV channel list:
- Aborts in-flight requests on parameter change
- Avoids flashing loading skeleton after initial data is loaded (`hasDataRef`)
- Returns `channels`, `total`, `totalPages`, `page`, `isLoading`, `error`, `refresh`

### useLiveMatchCard

`hooks/use-live-match-card.ts`

Card interaction logic for a single match:

**Derived state:**
- `isLive`, `isEnded`, `isUpcoming` — from `match.status`
- `canWatch` — true when live and stream type is video/HLS
- `formattedTime`, `formattedDate` — via `useFormatter` (next-intl)

**Actions:**
- `handleWatchClick` — opens the watch prompt modal
- `handleWatchSolo` — navigates to `/live/:id?title=...`
- `handleWatchParty` — creates a watch party room via `createPartyRoom` with:
  - `type: 'livestream'`
  - Proxied HLS URL: `/api/livestream/playlist.m3u8?url=...&token=LIVESTREAM`
  - Navigates to `/watch-party/:roomId?new=true` on success

## Components

### LiveMatchModal

`components/LiveMatchModal.tsx`

Full-screen modal displaying match details:
- **Team panels** — avatar, name, and score for each team
- **VS divider** with live/upcoming/ended status badge
- **Match info** — league, formatted date/time, cricket-specific scores
- **Action buttons**: Watch Solo and Watch Party (with loading spinner)
- Disables layout sidebars while open
- Escape key to close, body scroll lock
- `asText` utility safely coerces unknown values to display strings

### LiveMatchCard

`components/LiveMatchCard.tsx`

Schedule card for the live page grid. Renders team avatars, names, scores, status badges, and a "Watch" button. Uses `useLiveMatchCard` for all interaction logic.

## Live Player Page Integration

The `/live/:id` page uses `WatchLivePlayer` from `src/features/watch/components/WatchLivePlayer.tsx`:

1. `useLiveMatch(id)` fetches match details and polls for stream URL
2. Stream URL is proxied through `/api/livestream/playlist.m3u8`
3. `WatchLivePlayer` renders with `streamMode="live"` and `skipProgressHistory={true}`
4. HLS.js uses live-optimised config (small buffer, live sync, prefetching)
5. `LiveSeekBar` provides DVR scrubbing within the buffered range
6. `Player.LiveBadge` shows "LIVE" indicator

## Clip Recording During Livestreams

Both `WatchLivePlayer` and `WatchPartyVideoArea` integrate clip recording:

1. `useClipRecorder` hook from `src/features/clips/` manages recording state
2. `RecordButton` component in the player header shows record/stop controls with duration
3. Start → toast "Recording started"
4. Stop → toast "Clip saved! Processing..." → server-side FFmpeg processing
5. Clips are stored in MinIO and accessible from the clips library page

## Data Flow: Schedule → Watch

1. `/live` page renders sport tabs via `useSports`
2. Selected sport → `useLivestreams(sportType)` fetches schedule
3. "All Channels" tab → `useChannels` fetches paginated TV channels
4. User clicks match card → `LiveMatchModal` opens
5. "Watch Solo" → navigates to `/live/:id`
6. "Watch Party" → `createPartyRoom` with livestream type → navigates to `/watch-party/:roomId`
7. `/live/:id` page → `useLiveMatch` polls until `playPath` available → `WatchLivePlayer` starts playback

# Livestream Feature

## Provider — PrivateMedia (Live Sports)

All livestream content is served through the PrivateMedia provider (`pub-api.privatemedia.app`). The backend resolves streams using `live-server1:` ID prefixes.

### Flow
1. Frontend fetches sport categories from `/api/livestream/sports`
2. User selects a sport → frontend fetches schedule from `/api/livestream/schedule?sportType=...&server=server1`
3. User clicks a match → navigates to `/live/[matchId]`
4. Player requests playlist from `/api/livestream/playlist.m3u8?url=live-server1://sourceId&token=...`
5. Backend JIT-resolves via `PrivateMediaPlayback.getPlaybackSource()` → temporary HLS URL
6. Segments proxied through CF Worker (`cdn.nightwatch.in`)

### Frontend Structure
- `hooks/`: `use-livestreams`, `use-live-match-card`, `use-sports`
- `components/`: `LiveMatchCard`, `LiveMatchModal`, `LiveMatchSkeleton`
- `api.ts`: `fetchLivestreamSchedule`, `fetchLiveMatchDetail`, `fetchSports`, `fetchChannels`

### Playback
Both scheduled matches and on-demand channels use the same `WatchLivePlayer` component and `playVideo()` API. The backend transparently resolves the stream source based on the `live-server1://` protocol prefix.

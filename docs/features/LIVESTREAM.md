# Livestreaming Technical Specifications

## Overview
Livestream processing builds upon the Agora implementation documented in [AGORA_RTM_RTC.md](../AGORA_RTM_RTC.md). The `livestream` directory maps real-time broadcast ingestion endpoints directly to client player wrappers.

## Server 1 — DaddyLive Provider (24/7 Live TV Channels)

Server 1 channels are resolved **entirely server-side** via the `DaddyLivePlayback` provider (`src/providers/daddylive/playback.service.ts`). No Electron bridge or browser automation is required.

### Multi-Path Parallel Racer

The provider races **5 independent paths** in parallel. The first path to return a valid HLS manifest wins. This maximizes availability — if one CDN is down, another picks it up.

| Path | Route | Upstream | Extraction Method |
|------|-------|----------|-------------------|
| 1 | `/stream/` | liveon4.zip → zhdcdn3.zip | 3-step HTTP chain: `player.php` → `daddy.php` → `embed-daddy.php` → base64 m3u8 + auth |
| 3 | `/casting/` | ddyplayer.cfd → cdnlivetv.ru | JS packer unpacked in Node.js `vm` → base64 vars decoded → stream URL |
| 4 | `/player/` | popcdn.day → lovetier.bz | Plain-text `streamUrl` in HLS.js config object |
| 5 | `/plus/` | foulembeds.live → zenostreams CDN | Hex-encoded JS decoded → `streamUrl` extracted |
| 6 | `/watch/` | viewembed.ru → chevy.soyspace.cyou | `CHANNEL_KEY` from page + hardcoded `sk=wiki` → mono.css manifest |

Path 2 (`/cast/` → tigertestxtg.sbs) is dead and not implemented.

### Resolution Flow

```
Frontend: playVideo({ movieId: "live-server1://51" })
    ↓
Backend: /api/video/play → returns masterPlaylistUrl
    ↓
HLS.js: GET /api/livestream/playlist.m3u8?url=live-server1://51&token=LIVESTREAM
    ↓
Controller: JIT-resolves via DaddyLivePlayback.getPlaybackSource("51")
    ↓
Provider: Races Path 1, 3, 4, 5, 6 in parallel → first valid stream wins
    ↓
Controller: Fetches manifest, rewrites segment/key URLs through proxy
    ↓
Client: Plays rewritten HLS manifest
```

### Caching Strategy

- **Playback result** (stream URL + auth): Redis, 15-minute TTL
- **CHANNEL_KEY** (Path 6 viewembed slug): Redis, 30-day TTL (keys never change)
- **HLS manifest**: Redis, 1-second TTL (absorbs burst re-polls)

### Domain-Specific Headers

Each CDN requires specific headers for access:

| CDN Domain | Required Headers |
|------------|-----------------|
| `zhdcdn*.zip` | `Origin: https://liveon4.zip`, `Xauth: {token}` |
| `soyspace.cyou` | `Referer: https://funsday.cfd/` |
| `cdnlivetv.ru` | `Referer: https://ddyplayer.cfd/` |
| `zenostreams-cdn` | `Referer: https://www.foulembeds.live/` |
| `lovetier.bz` | `Referer: https://lovetier.bz/` |

### Watch Party Support

Server 1 channels fully support Watch Party. The proxy URL format is identical to Server 2:
```
/api/livestream/playlist.m3u8?url=live-server1://{streamId}&token=LIVESTREAM
```

## Server 2 — PrivateMedia Provider (Sports Streams)

Server 2 uses the `PrivateMediaPlayback` provider for live sports. Resolution is handled via the PrivateMedia API with anonymous token authentication.

## Directory Structure
`src/features/livestream/`
- `components/`: `LiveMatchCard`, `LiveMatchModal`, `Server1Channels`, `LiveMatchSkeleton`.
- `hooks/`: `use-livestreams`, `use-live-match-card`, `use-sports`.
- `types.ts`: `LiveMatch`, `LiveTeam` type definitions.

## Architectural Notes
1. **Chat Integration**
   - The UI binds tightly to `LiveChat`, utilizing our standard `useReducer` to debounce chat DOM injection, preventing single-frame 144Hz screen tearing when 100+ messages land sequentially.
2. **Dynamic Resolution**
   - Stream qualities dynamically downscale utilizing standard MSE extensions on HTML5, managed similarly to VOD logic but mapped to the backend HLS proxy pipeline.
3. **Unified Playback**
   - Both Server 1 and Server 2 use the same `WatchLivePlayer` component and `playVideo()` API. The backend transparently resolves the stream source based on the `live-server1://` or `live-server2://` protocol prefix.

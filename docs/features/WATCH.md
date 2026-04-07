# Content Watching Experience 

This document describes the structure and operations of the `/src/features/watch` architecture within Watch Rudra.

The Watch feature acts as a VOD (Video on Demand) interface providing robust streaming capabilities via dynamic adaptive bitrates.

## Video Engine Integration
The default video container uses standard HTML5 `<video>`, wrapped with our custom `HeroVideo.tsx` and `WatchControls.tsx` elements.

### The Player (HLS/DASH)
The player must resolve encrypted stream endpoints. For HLS compatibility on Chromium, it loads the `hls.js` extension runtime.
- **Auto-Resolution Switches:** Based on connection speed (via the video server manifest file), HLS seamlessly scales down streams from 4K (`2160p`) to SD (`480p`). The state is captured in the UI controls via `hls.currentLevel()`.
- **Keyboard Shortcuts:** Hardcoded native DOM event listeners exist inside a master `useEffect` within `VideoControls` mapping standard media keys (Spacebar for play/pause; Left/Right axes for seeking `+/- 10s`; `M` for mute; `F` for fullscreen pointer API lock).

## State Management
To track elapsed viewing times (useful for "Continue Watching" tracking) the player fires off sync requests to the backend server.
1. The heartbeat (`useWatchMetrics.ts`) sends current `video.currentTime` to Redis cache. 
2. Upon reloading the page for a specific VOD content-ID, Next.js hydration extracts the logged time.

## Subtitles/Captions
Tracks are parsed natively or via `.vtt` implementations injected into the video DOM. `TextTrack` cues trigger subtitle rendering inside the internal React tree. The styling matches custom CSS overrides (Neo-brutalist configurations mapping to global UI fonts and border styles).

## Recommendations (Watch Next)
Within `WatchSideBar`, infinite scrolling loads personalized recommendations via TanStack query `useInfiniteQuery`. Upon video ending (DOM `onEnded`), it auto-progresses after a countdown (handled by `useAutoPlay.ts`).
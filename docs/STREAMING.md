# VOD & Streaming Engine

## Overview
Our core Video-On-Demand pipeline is built globally around dynamic `.m3u8` playlist ingest mapping. We resolve secure media files aggressively through proxy tiers, utilizing Edge-computing where applicable.

## Pipeline Architecture
1. **Upload & Transcoding**
   - Media uploaded pushes straight to raw buckets. Back-end Node ingest handles FFmpeg transcode layers dynamically breaking chunks into HLS formats.
2. **Delivery & Playback**
   - The NextJS server endpoints strictly provide signed keys.
   - `src/features/watch/` natively binds HLS.js mapping to DOM nodes, managing ticket rotation internally without dropping frames or triggering visual buffering.

## Quality Controls
- Auto-bitrate detection maps standard MSE metrics, adjusting chunks seamlessly downward from 1080p, 720p, etc.
- See `features/WATCH.md` for specific UI component bindings reading from these state loops.

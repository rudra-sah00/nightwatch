# Livestreaming Features

## Live Sports Schedule
Rendered by `LiveClient.tsx`. Users select a sport category and browse upcoming/live/completed matches. Matches are fetched from the PrivateMedia provider via `/api/livestream/schedule`.

## Live Match Playback
Clicking a live match navigates to `/live/[id]` which uses `WatchLivePlayer` with HLS.js for adaptive bitrate streaming. Segments are proxied through the Cloudflare Worker CDN (`cdn.nightwatch.in`).

# The Livestream Framework

This document describes the structure and operations of the `/src/features/livestream` architecture within Watch Rudra.

The Livestream architecture scales out broadcasting features through RTMP ingestion and HLS transmission.

## Protocol Core (HLS)
The primary technology is **HLS (HTTP Live Streaming)** served continuously to clients. Because HLS breaks down linear video into static M3U8 chunk sequences, Next.js statically routes these. 

The `VideoPlayer` component uses `hls.js` internally. HLS isn't natively supported on all architectures (Chrome mostly), but natively on iOS Webkit. The `livestream` hooks detect browser compatibility and bind the `hls.js` WASM engine correctly.

## The Broadcaster Control Panel (Host)
For content creators, the architecture involves the `StreamControls.tsx` mapping directly to the underlying `watch-rudra-backend` WebRTC and NodeMediaServer pipelines. 
- **OBS/XSplit Injection:** Broadcasters publish their RTMP payloads via unique Stream Keys to `localhost:1935`. 
- **NodeMediaServer (Backend):** Automatically transcodes the RTMP into HLS chunks `[resolution].ts`.

## Live Chat Realtime Architecture
In a Livestream event, standard HTTP polling does not scale for the chat box.
- Architecture swaps into **Agora RTM (Real-Time Messaging) or Socket.io/WebSockets**. 
- Bound directly alongside `LiveChat.tsx`.
- Highly optimized rendering loops using virtualization. When dealing with 1,000s of messages per second, React rendering limits are hit. The chat is implemented via `@tanstack/react-virtual` logic in order to keep DOM nodes minimal.

## Stream Health Metrics
The `useStreamHealth.ts` hook polls the Node backend on an interval to determine latency, bitrate variations, and dropped packet statistics, rendering these metrics natively over the Host's HLS dashboard.
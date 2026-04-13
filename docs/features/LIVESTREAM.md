# Livestreaming Technical Specifications

## Overview
Livestream processing builds upon the Agora implementation documented in [AGORA_RTM_RTC.md](../AGORA_RTM_RTC.md). The `livestream` directory maps real-time broadcast ingestion endpoints directly to client player wrappers.

## Directory Structure
`src/features/livestream/`
- `components/`: `LivePlayer`, `LiveChat`, `StreamControls`.
- `hooks/`: Extends core socket logic to handle Stream Start/Stop signaling.
- `types.ts`: Live metric definitions (Concurrent viewer counts, bandwidth heuristics).
- `api.ts`: API bindings specific to retrieving active edge-ingest streams for the logged-in broadcaster.

## Architectural Notes
Unlike the VOD features, Livestream pushes the user towards low-latency ingest configurations:
1. **Chat Integration**
   - The UI binds tightly to `LiveChat`, utilizing our standard `useReducer` to debounce chat DOM injection, preventing single-frame 144Hz screen tearing when 100+ messages land sequentially.
2. **Dynamic Resolution**
   - Stream qualities dynamically downscale utilizing standard MSE extensions on HTML5, managed similarly to VOD logic but mapped to Agora's pipeline endpoints.

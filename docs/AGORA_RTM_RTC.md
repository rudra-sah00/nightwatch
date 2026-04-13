# Agora Real-Time Infrastructure

## Overview
We integrate Agora for all distributed sub-second latency implementations. This covers real-time WebRTC connections, Watch Party synchronization paths, and potentially Livestreaming deployments.

## RTM (Real-Time Messaging)
- Used specifically for text-based pipelines, syncing pause/play signaling on the Watch Party, and maintaining accurate client-side heartbeats.
- Operates decoupled from central REST APIs to reduce generic polling load across Next.js paths.

## RTC (Real-Time Communication)
- Reserved exclusively for raw video/audio byte streaming pipelines out across peer networks.

## Setup Requirements
As noted in `SETUP.md`, `AGORA_APP_ID` must be correctly seeded within `.env.local` to spin up local testing.

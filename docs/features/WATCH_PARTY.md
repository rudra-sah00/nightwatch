# Watch Party Architecture

The Watch Party feature is the crown jewel of Watch Rudra, allowing decentralized users to synchronize high-quality media streaming with real-time text, voice, and drawing components. This document serves as a technical breakdown of its core hooks and architecture.

## Legacy Architecture vs. Modern Implementation

**The Problem with Server-Sent Events (SSE):**
Historically, Watch Parties attempted to broadcast all granular state updates (e.g., pausing a video, sending a chat, toggling permissions) from the host to the Node.js backend. The backend would then broadcast the new global state back to all connected clients over WebSockets. This introduced unacceptable latency loops (Host → Server → Guests → Server → Host) and excessive server load.

**The Solution: Agora RTM Migration:**
We migrated the heavy lifting entirely off our backend. Now, Watch Rudra uses decentralized, peer-to-peer event pipelines constructed over Agora Real-Time Messaging (RTM). Our Node.js server acts merely as the initial matchmaker to authorize users into a room and broker their connection securely. The actual sub-second video syncing is handled directly between clients.

## Core Hierarchy

The Watch Party UI mounts via a chain of responsibilities:
1. `WatchPartyClient`: Fetches tokens and orchestrates the primary logic and UI layout (Video, Sidebar, Lobby).
2. `useWatchParty` & `useWatchPartyMembers`: Manages the state, connection handling, and participant tracking.
3. `usePredictiveSync`: Intersects browser media player APIs, calculating millisecond drift and forcing timeline snaps based on Host messages.

### The Host Dominance Paradigm

In any Watch Party, the Host is the "source of truth".
- If the Host pauses, an RTM broadcast (`PAUSE`) fires. All Guests listen, pause their local `videoRef`, and calculate the exact timestamp.
- If a Guest attempts to play the video prematurely, `usePredictiveSync` catches the discrepancy and forcefully resets the state based on the last known Host timestamp.
- If a Guest drifts too far forward due to network buffering, they receive periodic `TIME_UPDATE` events from the Host to dynamically catch up to the current frame.

## Permission Edge Cases and Optimistic UI

Because Agora RTM enables direct client-to-client communication, a sender (e.g., the Host toggling a permission) **does not receive an echo of their own broadcast.** 

This introduces a React UI delay where a visual toggle would snap back to its previous state momentarily. To mitigate this:
1. The Host clicks the switch (e.g., Allow Guests to Draw).
2. The UI fires an asynchronous backend request to persist the newly updated room array into the Redis store (`updatePartyPermissions`).
3. Upon success, the client emits the `PERMISSIONS_UPDATED` RTM message to **all other peers.**
4. Finally, the Host's client bypasses RTM and manually drops an optimistic React `CustomEvent` (`LOCAL_PERMISSIONS_UPDATED`). 
5. The `useWatchPartyMembers` hook listens for this event globally, functionally updating its own React `setRoom` closure, making the toggle switch snap perfectly visually.

## Handling Dropped Connections

To prevent ghost kicks, a strict 2-minute disconnect protection timer is used in `handlePresenceEvent`. If a Guest's connection drops entirely due to a network error, their "slot" inside the room remains actively preserved in Redis. 

If they do not reconnect via Socket.IO before the timeout finishes, the hook reads the absolute freshest memory value directly from a `useRef` (`roomRef.current`), bypassing React's strict mode loops, before running the async API deletion. This ensures we never accidentally delete a user who just buffered for a few seconds.
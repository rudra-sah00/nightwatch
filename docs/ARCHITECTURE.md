# Frontend Architecture

This document outlines the high-level architecture and technical decisions for the Watch Rudra frontend.

## Tech Stack

- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS (Custom Neo-brutalist theme)
- Real-time Communication: Agora RTM, Agora RTC, Socket.IO
- Tooling: Biome (Linting & Formatting), Vitest (Testing), Playwright (E2E)

## Core Structure

The codebase follows a feature-based architecture within the `src` directory to keep domain logic isolated and maintainable:

- `app/`: Next.js App Router definitions, defining the routing, layouts, and pages.
- `components/`: Shared UI components (mostly generic elements like Buttons, Inputs, Dialogs).
- `features/`: Domain-specific components, hooks, services, and types (e.g., `watch-party`, `profile`, `auth`).
- `lib/`: Shared utilities, global helpers, and API configurations.
- `providers/`: Global React Context providers (e.g., AuthProvider, SocketProvider).
- `types/`: Global TypeScript definitions.

## Real-Time Architecture

A Watch Party requires sub-second synchronization across multiple clients. We utilize a hybrid approach to balance server load and speed:

1. Socket.IO (Signaling & Lobby Management)
   - Used for initial presence, join requests, and lobby approval management.
   - Connects directly to our Node.js backend.

2. Agora RTM (Real-Time Messaging)
   - Used for in-room peer-to-peer data synchronization.
   - Handles playback state (play/pause/seek), chat messages, typing indicators, and precise permission updates.
   - Offloads the heavy websocket broadcasting traffic from our backend to Agora's edge network, reducing latency.

3. Agora RTC (Real-Time Communication)
   - Used for the voice and video streams between party members over WebRTC.

### State Synchronization

In a Watch Party room, state is managed locally via domain hooks (`useWatchPartyMembers`, `usePredictiveSync`) and synchronized optimistically where possible.

When a user triggers an action (e.g., the Host toggling a permission):
1. An API call is made to the backend to persist the new state in Redis.
2. Upon success, the Host's client broadcasts an RTM message to all Guests.
3. The Host dispatches a local event (`CustomEvent`) to update their own UI instantly, as RTM does not echo messages back to the sender.
4. Guests receive the RTM message and update their React states via reducers.

## Design Pattern

The UI implements a Neo-Brutalist aesthetic characterized by:
- High contrast, thick borders.
- Solid, bold colors and sharp typography.
- Avoidance of soft drop-shadows in favor of solid offset shadows or borders.
- Reusable UI elements in `src/components/ui/` utilizing `cva` (Class Variance Authority) for standardized variants (e.g., `variant="neo-outline"`).
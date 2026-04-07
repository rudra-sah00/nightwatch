# State Management Strategy

With over 400+ modules and highly concurrent real-time features, managing state predictably across the frontend is critical. Watch Rudra employs a multi-tiered state management approach to ensure performance, consistency, and a bug-free user experience.

## Global Contexts (Providers)

For state that must be globally accessible but changes infrequently, we use React Context API mapped inside the `src/providers/` directory.
- **AuthProvider:** Stores the current authenticated user session, managing the login/logout lifecycle and hydrating user data across the app.
- **SocketProvider:** Maintains the singleton Socket.IO connection to the backend, ensuring we do not spawn multiple websockets per client.

## Server State & Data Fetching

Next.js Server Components and modern fetching strategies govern how we interact with the database.
- **Server Actions:** Used for secure, server-side mutations (e.g., updating profiles, passwords) directly from forms without needing manual API endpoints.
- **Client Fetching:** For client-side data fetching, we leverage generic `fetch` wrappers integrated with React's `useEffect` or `swr` for caching and revalidation.

## Real-Time Decentralized State (Watch Parties)

The most complex state in the application lives within the Watch Party domain. Because up to dozens of users can mutate state concurrently, we heavily isolate this logic into custom hooks.
- **Single Source of Truth:** The Host's client is the absolute source of truth for the playback state.
- **Local Optimistic Updates:** When a user performs an action (e.g., the Host toggling a permission), the UI updates locally via `CustomEvent` dispatches immediately before the network confirms the broadcast. This prevents UI stuttering.
- **Reducer Patterns:** We use strict `Switch/Case` reducers to process incoming Agora RTM messages (e.g., `MEMBER_JOINED`, `PERMISSIONS_UPDATED`) and apply them functionally to the React State.

## Safe React State Practices

To avoid React Concurrent Mode bugs and stale closures inside highly asynchronous event listeners:
- **Ref Synchronization:** Do not rely on dependencies in `useCallback` for variables that change rapidly (like the `room` state). Instead, maintain a synchronized `useRef` (e.g., `roomRef.current = room`) and read from the ref inside asynchronous blocks (like connection drop timeouts or delayed RTM messages). This prevents infinite re-render loops and ghost-kicking bugs.
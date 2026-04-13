# Livestreaming Features

This document explains the technical architecture of the livestreaming section.

## Server 1 (24/7 Channels + Dynamic Events)
Rendered by `Server1Channels.tsx`.

### Skeleton Loaders
The UI provides skeletal box layouts on first load (e.g. before data resolves from SWR/fetch). These are mapped using robust unique keys or explicitly bypassing `noArrayIndexKey` in biome to prevent false-positives since it's just a non-interactive skeleton block.

### Type Safety
When searching the `matches` collection on "Watch Party" events, we perform an `.find()` on pseudo-matches. We strictly convert the union match objects with `as unknown as typeof pseudoMatch & { status: 'MatchIng' | 'Upcoming' }` to explicitly retain strict typing through the pipeline without relying on loose `any` casts.

## Server 2 (Dynamic Sports Categories)
Hooks involved: `useSports.ts`.

### Categories Fetch
On page load, the frontend hits `api/v1/sports` dynamically fetching available sports schemas. The hook wraps this response and guarantees prepend of `{ id: 'all_channels', label: 'All Channels' }` allowing users to effortlessly toggle back to the global stream feed. Handled robustly against network drops by catching the Promise rejecting and defaulting gracefully. Test suite guarantees.

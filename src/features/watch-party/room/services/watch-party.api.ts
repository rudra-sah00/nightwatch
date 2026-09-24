/**
 * Watch party services — public entry point.
 *
 * This file was 710 lines holding two unrelated things: fourteen REST wrappers,
 * each repeating the same `try/catch` into `{ error }`, and a module-level RTM
 * pub/sub singleton with thirty `on*` subscribers. Finding the call you wanted
 * meant scrolling past the other kind.
 *
 * It is now:
 *
 * ```
 * rest/client.ts          the shared `{ error }` folding, in one place
 * rest/room.api.ts        exists / detail / create
 * rest/membership.api.ts  join, approve, reject, kick, leave, pending
 * rest/playback.api.ts    state, content switch, stream token
 * rest/permissions.api.ts global and per-member permissions
 * rest/chat.api.ts        message history
 * rest/soundboard.api.ts  the sound catalogue
 * rtm-events.ts           the RTM event bus and every `on*` subscriber
 * ```
 *
 * Re-exported flat from here because roughly forty modules import from this path,
 * and a rename across all of them would be churn with no benefit. New code can
 * import the specific file — `rest/membership.api` says what it touches.
 *
 * @packageDocumentation
 */

export * from './rest/chat.api';
export * from './rest/membership.api';
export * from './rest/permissions.api';
export * from './rest/playback.api';
export * from './rest/room.api';
export * from './rest/soundboard.api';
export * from './rtm-events';

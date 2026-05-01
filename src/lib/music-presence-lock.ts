/**
 * Lightweight global signal so `DiscordPresenceSync` (root layout) knows when
 * `MusicDiscordPresence` (protected layout) is actively controlling presence.
 *
 * Needed because the two components live in different React provider trees and
 * cannot share state via context. The lock prevents the root-level presence
 * from overwriting the music-specific presence while music is playing.
 *
 * @module music-presence-lock
 */

let _locked = false;

/**
 * Global mutex for Discord Rich Presence ownership.
 *
 * - Call {@link musicPresenceLock.acquire | acquire()} when the music player
 *   starts controlling presence.
 * - Call {@link musicPresenceLock.release | release()} when it stops.
 * - Check {@link musicPresenceLock.isLocked | isLocked()} before writing
 *   non-music presence updates.
 */
export const musicPresenceLock = {
  /** Claim presence ownership for the music player. */
  acquire: () => {
    _locked = true;
  },
  /** Release presence ownership so other components can update it. */
  release: () => {
    _locked = false;
  },
  /** @returns `true` if the music player currently owns presence. */
  isLocked: () => _locked,
};

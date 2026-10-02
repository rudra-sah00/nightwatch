/**
 * Watch-party transport policy: Agora RTM plus a Socket.IO relay through our server.
 *
 * Every party signal used to ride Agora RTM alone. When RTM failed to connect or
 * dropped, the host's play/pause/seek silently reached nobody, guests ran free, and
 * kicks, closure and permission changes were lost. The relay
 * (`watch-party:relay` on the backend) carries the same messages through our own
 * server so the party survives an RTM outage.
 *
 * Routing:
 *  - Control messages (playback, membership, chat, permissions, sketch strokes, seat
 *    claims) are sent on BOTH paths. They are a handful per minute, so doubling them
 *    costs nothing, and whichever path delivers first wins.
 *  - High-frequency messages (avatar poses, sketch cursor, typing) stay on RTM, and
 *    fall back to the relay — throttled — only while RTM is down. Ten people walking
 *    at 8 Hz is ~800 msg/s per room through our server otherwise.
 *
 * Duplicates are expected and removed on receipt: each outbound message carries one
 * `_mid`, the same on both paths, and the receiver drops an id it has already seen.
 *
 * Pure and dependency-free so it can be tested without RTM, a socket, or React.
 *
 * @packageDocumentation
 */

import type { RTMMessage } from '../types/rtm-messages';

/** A message as it travels: the union plus the dedupe id the transport stamps on. */
export type WireMessage = RTMMessage & { _mid?: string };

/** Types that repeat while someone moves. RTM only, unless RTM is down. */
export const HIGH_FREQUENCY_TYPES: ReadonlySet<string> = new Set([
  'AVATAR_TRANSFORM',
  'SKETCH_CURSOR_MOVE',
  'TYPING_START',
  'TYPING_STOP',
]);

/**
 * Types the relay refuses, so the client does not bother sending them.
 *
 * The join handshake is addressed to a PENDING guest, who is not yet a member and
 * so cannot be reached through the room. The server already delivers the outcome
 * itself as `JOIN_RESULT`.
 */
export const RTM_ONLY_TYPES: ReadonlySet<string> = new Set([
  'JOIN_APPROVED',
  'JOIN_REJECTED',
]);

/**
 * Minimum gap between relayed high-frequency messages of one type, in ms.
 *
 * Sized under the backend's `high` bucket (120 per 10 s): avatar 4 Hz + cursor 5 Hz
 * is 9 msg/s. Typing is already edge-triggered by the chat hook.
 */
export const RELAY_THROTTLE_MS: Readonly<Record<string, number>> = {
  AVATAR_TRANSFORM: 250,
  SKETCH_CURSOR_MOVE: 200,
};

/** Where one outbound message should go. */
export interface Route {
  rtm: boolean;
  relay: boolean;
}

/**
 * Decide the path(s) for one message.
 *
 * @param type - Message type.
 * @param rtmUp - Whether the RTM client is connected right now.
 * @param relayUp - Whether this socket has joined the party's server room.
 */
export function routeMessage(
  type: string,
  rtmUp: boolean,
  relayUp: boolean,
): Route {
  if (RTM_ONLY_TYPES.has(type)) return { rtm: rtmUp, relay: false };
  if (HIGH_FREQUENCY_TYPES.has(type))
    return { rtm: rtmUp, relay: !rtmUp && relayUp };
  return { rtm: rtmUp, relay: relayUp };
}

/** Short random id. Not security-relevant — it only has to be unique per party. */
export function newMessageId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Remembers recently seen message ids, so the second copy of a dual-sent message
 * is dropped.
 *
 * Bounded by count rather than time: a burst cannot grow it, and at the rates a
 * party produces, the default cap spans many minutes — far longer than the gap
 * between the two copies of one message, which is network jitter.
 *
 * Messages without an id (an older client that predates the relay) are always
 * accepted, so a mixed-version party degrades to RTM-only behaviour, not silence.
 */
export function createMessageDedupe(capacity = 2000) {
  const seen = new Map<string, true>();
  return {
    /** True the first time an id is seen, false for any repeat. */
    accept(msg: { _mid?: unknown } | null | undefined): boolean {
      const id = msg?._mid;
      if (typeof id !== 'string' || id.length === 0) return true;
      if (seen.has(id)) return false;
      seen.set(id, true);
      if (seen.size > capacity) {
        const oldest = seen.keys().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }
      return true;
    },
    clear() {
      seen.clear();
    },
  };
}

/** Host playback events, all stamped `serverTime: Date.now()` on the host. */
const PLAYBACK_TYPES: ReadonlySet<string> = new Set([
  'PLAY_EVENT',
  'PAUSE_EVENT',
  'SEEK_EVENT',
  'RATE_EVENT',
  'SYNC',
]);

/**
 * Drops host playback events that arrive after a newer one.
 *
 * With two paths, ordering is no longer guaranteed: PLAY can leave on both,
 * a SEEK sent a moment later can win the race on one path, and the PLAY's
 * slower copy is already deduped — but the PLAY's FASTER copy may still land
 * after the SEEK if RTM and the relay differ in latency. Applying it would
 * rewind the guest to where the host was before seeking.
 *
 * Every playback event is stamped with the host's clock, and there is one host,
 * so `serverTime` orders them. A stamp far older than the last one is treated as
 * the host's clock having been reset rather than as a straggler, so a clock
 * adjustment on the host cannot freeze sync for the rest of the party.
 */
export function createPlaybackOrderGuard(reorderWindowMs = 10_000) {
  let last = Number.NEGATIVE_INFINITY;
  return {
    accept(msg: { type?: unknown; serverTime?: unknown }): boolean {
      if (typeof msg.type !== 'string' || !PLAYBACK_TYPES.has(msg.type)) {
        return true;
      }
      const t = msg.serverTime;
      if (typeof t !== 'number' || !Number.isFinite(t)) return true;
      if (t < last && last - t <= reorderWindowMs) return false;
      last = t;
      return true;
    },
    reset() {
      last = Number.NEGATIVE_INFINITY;
    },
  };
}

/**
 * Per-type throttle with a trailing send.
 *
 * Leading-edge only would drop the LAST pose of a walk — the one where the player
 * stopped — and since a still avatar is dead-banded, peers would see them frozen
 * short of where they stood until the next heartbeat. So the newest message
 * withheld in a window is sent when the window closes.
 */
export function createTrailingThrottle(
  emit: (msg: WireMessage) => void,
  intervals: Readonly<Record<string, number>> = RELAY_THROTTLE_MS,
  now: () => number = Date.now,
) {
  const lastAt = new Map<string, number>();
  const pending = new Map<string, WireMessage>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const flush = (type: string) => {
    timers.delete(type);
    const msg = pending.get(type);
    if (!msg) return;
    pending.delete(type);
    lastAt.set(type, now());
    emit(msg);
  };

  return {
    send(msg: WireMessage) {
      const interval = intervals[msg.type] ?? 0;
      if (interval <= 0) {
        emit(msg);
        return;
      }
      const elapsed =
        now() - (lastAt.get(msg.type) ?? Number.NEGATIVE_INFINITY);
      if (elapsed >= interval && !timers.has(msg.type)) {
        lastAt.set(msg.type, now());
        emit(msg);
        return;
      }
      pending.set(msg.type, msg);
      if (!timers.has(msg.type)) {
        timers.set(
          msg.type,
          setTimeout(() => flush(msg.type), Math.max(0, interval - elapsed)),
        );
      }
    },
    /** Drop anything withheld. Called when the relay goes away or RTM comes back. */
    cancel() {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
    },
  };
}

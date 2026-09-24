'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  exceedsDeadBand,
  type Pose,
  quantise,
  SnapshotBuffer,
  THEATRE_NET,
} from '../lib/interpolation';

/**
 * Avatar presence and position sync over the watch-party relay.
 *
 * ---- WHAT THIS HOOK IS NOW ----
 *
 * An adapter, and deliberately little else. It keeps exactly the surface the scene
 * already consumes — `publishPose`, `samplePeer`, `peerIds`, `peerCharacter` — so
 * `TheatreScene`, `RemoteAvatar`, `LocalPlayer` and `PassiveAvatars` did not change at
 * all when the transport did. What it holds is one `SnapshotBuffer` per peer and the
 * send-rate/dead-band policy. Everything else moved to where it belongs.
 *
 * ---- WHAT IT NO LONGER HAS TO DO ----
 *
 * The previous version was ~340 lines, most of it working around the fact that WHO
 * EXISTS and WHERE THEY ARE arrived from two unrelated systems — poses over Agora RTM,
 * membership over Redis and Socket.IO — which could disagree, race, or miss an event
 * entirely. Gone with the relay:
 *
 *  - **`MEMBER_JOINED` / `MEMBER_LEFT` subscriptions.** The relay's roster is presence;
 *    a socket closing IS the departure.
 *  - **The roster reconcile pass and its `acknowledged` set.** That existed because a
 *    pose could arrive before the membership event that explained it. Roster and poses
 *    now share one ordered connection, and `rosterGen` decides the rest.
 *  - **The 30 s staleness sweep.** It was a connection-loss fallback for a transport
 *    that had no connection state. It is not merely redundant now, it is HARMFUL:
 *    seated avatars no longer heartbeat, so a sweep would cull anyone who sat still for
 *    half a minute.
 *  - **`peerCharacters` state.** The chosen body rides the roster, not every pose. That
 *    also fixes a real bug: `quantise` covers only position, yaw, state and dance, so
 *    `exceedsDeadBand` could not see a character change, and someone switching body
 *    while standing still produced an identical pose that the dead band dropped.
 *  - **The 150 ms entry announce.** `hello` tells a joiner about everyone already there.
 *
 * ---- WHAT IT STILL OWNS, AND WHY ----
 *
 * The rate cap and the dead band stay here rather than moving to the relay. They are a
 * property of the SENDER's motion — only this client knows whether its avatar has moved
 * far enough to be worth a frame — and the dead band is why a seated room sends almost
 * nothing. `quantise` and `exceedsDeadBand` are unchanged.
 *
 * @packageDocumentation
 */

/**
 * What `TheatreScene` needs from the network layer.
 *
 * Exported as a type because the hook is mounted ABOVE the scene — by
 * `WatchPartyVideoArea` — and its result is passed down as one prop. The scene is
 * unmounted every time the view mode returns to `2d`, and the pose buffers are fed by a
 * relay connection that outlives it, so owning them inside the renderer would throw
 * them away on every round trip. This is the same reasoning that put `useSeatOccupancy`
 * above the scene, and for the same class of bug.
 */
export interface TheatreNet {
  peerIds: readonly string[];
  publishPose: (pose: Pose) => void;
  samplePeer: (peerId: string) => Pose | null;
  peerCharacter: (peerId: string) => 'man' | 'woman' | null;
  /** Fed by the relay's `onPose`. Not called by the scene. */
  acceptPose: (peerId: string, pose: Pose, serverTick: number) => void;
}

interface UseTheatreNetworkOptions {
  userId: string;
  /** Ids the relay roster says are present, already excluding the local user. */
  peerIds: readonly string[];
  /** Server time now, from the relay's clock. NEVER `Date.now()`. */
  serverNow: () => number;
  /** Send one pose. Supplied by `useRelay`. */
  sendPose: (pose: Pose) => void;
  /** Interpolation delay the relay asked for, or null before `hello`. */
  interpDelayMs: number | null;
  /** The avatar body a peer chose, from the roster. */
  characterFor: (peerId: string) => 'm' | 'w' | null;
  /** Only run while 3D mode is actually visible. */
  enabled: boolean;
}

export function useTheatreNetwork({
  userId,
  peerIds,
  serverNow,
  sendPose,
  interpDelayMs,
  characterFor,
  enabled,
}: UseTheatreNetworkOptions) {
  const buffers = useRef<Map<string, SnapshotBuffer>>(new Map());
  const lastSent = useRef<Pose | null>(null);
  const lastSentAt = useRef(0);
  const lastPose = useRef<Pose | null>(null);

  const minInterval = useMemo(() => 1000 / THEATRE_NET.SEND_HZ, []);

  /**
   * Keep one buffer per present peer.
   *
   * Driven straight off the roster, which is the single authority now. A peer who
   * leaves loses their buffer here; a peer who arrives gets one before their first pose
   * can land, because `roster` precedes any batch numbered against it.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const map = buffers.current;
    const present = new Set(peerIds);
    for (const id of map.keys()) {
      if (!present.has(id)) {
        map.delete(id);
      }
    }
    for (const id of peerIds) {
      if (id !== userId && !map.has(id)) {
        map.set(id, new SnapshotBuffer());
      }
    }
  }, [enabled, peerIds, userId]);

  /**
   * Accept a pose from the relay.
   *
   * `serverTick` is the batch's server timestamp, shared by every pose in it and by
   * every client that received it. It is stored verbatim: the whole point is that no
   * local clock touches it.
   */
  const acceptPose = useCallback(
    (peerId: string, pose: Pose, serverTick: number) => {
      if (peerId === userId) {
        return;
      }
      let buffer = buffers.current.get(peerId);
      if (!buffer) {
        // A pose for someone the roster has not named yet cannot normally happen over
        // one ordered connection, but trusting the pose is cheaper than dropping it.
        buffer = new SnapshotBuffer();
        buffers.current.set(peerId, buffer);
      }
      buffer.push({
        x: pose.x,
        y: pose.y,
        z: pose.z,
        r: pose.r,
        s: pose.s,
        d: pose.d,
        t: serverTick,
      });
    },
    [userId],
  );

  /** Send a pose, honouring the rate cap. `force` bypasses the dead band. */
  const send = useCallback(
    (pose: Pose, force: boolean) => {
      if (!enabled) {
        return;
      }
      // The cap is a local rate limit, so a local monotonic clock is the right base.
      const now = performance.now();
      if (now - lastSentAt.current < minInterval) {
        return;
      }

      const q = quantise(pose);
      if (!force && !exceedsDeadBand(lastSent.current, q)) {
        return;
      }

      lastSentAt.current = now;
      lastSent.current = q;
      sendPose(q);
    },
    [enabled, minInterval, sendPose],
  );

  /** Call every frame with the local pose. */
  const publishPose = useCallback(
    (pose: Pose) => {
      lastPose.current = pose;
      send(pose, false);
    },
    [send],
  );

  /**
   * Nudge a walking avatar through the dead band.
   *
   * Only while walking. A seated avatar's position is fully derivable from its seat
   * claim, so repeating it is information every client can compute — and it was the
   * largest line item in the room's traffic, since in a cinema most people are seated
   * most of the time. A dance is not exempt: it changes `s` and `d` without moving, and
   * `exceedsDeadBand` already passes those on the `d` comparison.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const id = setInterval(() => {
      const pose = lastPose.current;
      if (!pose) {
        return;
      }
      if (pose.s === 'sitIdle' || pose.s === 'sitDown') {
        return;
      }
      send(pose, true);
    }, THEATRE_NET.HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [enabled, send]);

  /** Reset when 3D is switched off, so we never resume with stale poses. */
  useEffect(() => {
    if (enabled) {
      return;
    }
    buffers.current.clear();
    lastSent.current = null;
    lastPose.current = null;
  }, [enabled]);

  /**
   * Interpolated pose for a peer, rendered `interpDelayMs` in the past.
   *
   * Both sides of the comparison are server time: the snapshot's `t` is the relay's
   * tick and `serverNow()` maps this machine's monotonic clock onto the same frame.
   */
  const samplePeer = useCallback(
    (peerId: string): Pose | null => {
      const buffer = buffers.current.get(peerId);
      if (!buffer) {
        return null;
      }
      return buffer.sample(
        serverNow(),
        interpDelayMs ?? THEATRE_NET.INTERP_DELAY_MS,
      );
    },
    [serverNow, interpDelayMs],
  );

  /**
   * The body a peer chose, or null if not yet known.
   *
   * From the roster rather than from pose traffic. Widened back out to the
   * `'man' | 'woman'` names the scene already uses: the single-character form exists
   * only to keep the wire small, and translating it here is what lets `TheatreScene`
   * and `RemoteAvatar` stay untouched by the transport change. Callers fall back to a
   * hash of the id when this is null.
   */
  const peerCharacter = useCallback(
    (peerId: string): 'man' | 'woman' | null => {
      const code = characterFor(peerId);
      if (code === null) {
        return null;
      }
      return code === 'w' ? 'woman' : 'man';
    },
    [characterFor],
  );

  return { peerIds, publishPose, samplePeer, peerCharacter, acceptPose };
}

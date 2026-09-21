'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAvatarPing,
  onAvatarPong,
  onAvatarTransform,
  onMemberJoined,
  onMemberLeft,
} from '../../room/services/watch-party.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import {
  exceedsDeadBand,
  type Pose,
  quantise,
  SnapshotBuffer,
  THEATRE_NET,
} from '../lib/interpolation';
import {
  PacketRateMeter,
  PING_INTERVAL_MS,
  RoundTripTracker,
} from '../lib/theatre-stats';

interface UseTheatreNetworkOptions {
  userId: string;
  /** Existing channel broadcast from useWatchParty. */
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** Party members already present when 3D is switched on. */
  initialPeerIds?: readonly string[];
  /**
   * Which body this user chose. Broadcast on every pose so peers draw them
   * correctly; without it every client would have to guess.
   */
  character?: 'man' | 'woman';
  /** Only run while 3D mode is actually visible. */
  enabled: boolean;
}

/**
 * Avatar presence and position sync over the existing Agora RTM channel.
 *
 * Deliberately NOT routed through our backend. Movement is ephemeral peer state;
 * putting it on the backend would add a round trip through a server with no
 * reason to know about it and tie the room's responsiveness to API latency. RTM
 * is already connected for chat and playback sync, and nothing here needs a
 * second transport.
 *
 * WHO EXISTS vs WHERE THEY ARE are two separate problems, and conflating them
 * was a bug in the first version of this hook:
 *
 *  - Membership (`MEMBER_JOINED` / `MEMBER_LEFT`) is the authority on who is in
 *    the room. Avatars spawn and despawn from that, so a departure removes the
 *    avatar at once instead of leaving a ghost until a timeout.
 *  - Poses say where they are. These are rate-capped and dead-banded, so a
 *    motionless avatar sends almost nothing.
 *
 * The dead band alone made stationary players invisible: they never transmitted,
 * so nobody ever learned they were there. A low-rate HEARTBEAT fixes that — it
 * forces a pose through the dead band every `HEARTBEAT_MS`, which also means a
 * late joiner sees everyone within one heartbeat without any request/reply
 * handshake. At 2 s that is 0.5 msg/s per person, which is negligible next to
 * the 8 Hz cap while walking.
 */
export function useTheatreNetwork({
  userId,
  rtmSendMessage,
  initialPeerIds,
  character = 'man',
  enabled,
}: UseTheatreNetworkOptions) {
  const buffers = useRef<Map<string, SnapshotBuffer>>(new Map());
  const lastSent = useRef<Pose | null>(null);
  const lastSentAt = useRef(0);
  const lastPose = useRef<Pose | null>(null);
  const [peerIds, setPeerIds] = useState<readonly string[]>([]);
  /**
   * Which body each peer chose, from their pose messages.
   *
   * State rather than a ref because the avatar list must re-resolve its models
   * when a peer's body becomes known. It is only written when the value actually
   * changes, which is at most once per peer, so this does not re-render on every
   * incoming packet.
   */
  const [peerCharacters, setPeerCharacters] = useState<
    Record<string, 'man' | 'woman'>
  >({});
  /**
   * Inbound message rate and recency, for the stats readout.
   *
   * Arrival times are taken from the LOCAL clock, never from the sender's `t`,
   * so the figures are free of clock skew between machines.
   */
  const rate = useRef(new PacketRateMeter());
  /** Round-trip latency, measured entirely on this machine's clock. */
  const rtt = useRef(new RoundTripTracker());

  const minInterval = useMemo(() => 1000 / THEATRE_NET.SEND_HZ, []);

  const ensurePeer = useCallback(
    (id: string) => {
      if (id === userId) return;
      const map = buffers.current;
      if (!map.has(id)) {
        map.set(id, new SnapshotBuffer());
        setPeerIds([...map.keys()]);
      }
    },
    [userId],
  );

  const removePeer = useCallback((id: string) => {
    if (buffers.current.delete(id)) {
      setPeerIds([...buffers.current.keys()]);
    }
  }, []);

  /** Send a pose, honouring the rate cap. `force` bypasses the dead band. */
  const send = useCallback(
    (pose: Pose, force: boolean) => {
      if (!enabled || !rtmSendMessage) return;
      const now = Date.now();
      if (now - lastSentAt.current < minInterval) return;

      const q = quantise(pose);
      if (!force && !exceedsDeadBand(lastSent.current, q)) return;

      lastSentAt.current = now;
      lastSent.current = q;
      rtmSendMessage({
        type: 'AVATAR_TRANSFORM',
        userId,
        x: q.x,
        y: q.y,
        z: q.z,
        r: q.r,
        s: q.s,
        c: character === 'woman' ? 'w' : 'm',
        d: q.d,
        t: now,
      });
    },
    [enabled, rtmSendMessage, userId, minInterval, character],
  );

  /** Call every frame with the local pose. */
  const publishPose = useCallback(
    (pose: Pose) => {
      lastPose.current = pose;
      send(pose, false);
    },
    [send],
  );

  // ---- seed the roster with members already in the party ----
  useEffect(() => {
    if (!enabled || !initialPeerIds) return;
    for (const id of initialPeerIds) ensurePeer(id);
  }, [enabled, initialPeerIds, ensurePeer]);

  // ---- roster: membership drives spawn/despawn ----
  useEffect(() => {
    if (!enabled) return;
    const offJoin = onMemberJoined((m) => ensurePeer(m.id));
    const offLeave = onMemberLeft((id) => removePeer(id));
    return () => {
      offJoin();
      offLeave();
    };
  }, [enabled, ensurePeer, removePeer]);

  // ---- poses ----
  useEffect(() => {
    if (!enabled) return;
    return onAvatarTransform((pose) => {
      if (pose.userId === userId) return; // RTM does not echo self; defensive
      rate.current.mark();
      // Remember which body they picked. Only writes when it actually changes,
      // so this does not re-render the avatar list on every packet.
      if (pose.c) {
        const next = pose.c === 'w' ? 'woman' : 'man';
        setPeerCharacters((prev) =>
          prev[pose.userId] === next ? prev : { ...prev, [pose.userId]: next },
        );
      }
      const map = buffers.current;
      let buf = map.get(pose.userId);
      if (!buf) {
        // A pose from someone the roster has not mentioned yet — trust the pose
        // rather than dropping them. Join events and 3D activation can race.
        buf = new SnapshotBuffer();
        map.set(pose.userId, buf);
        setPeerIds([...map.keys()]);
      }
      buf.push({
        x: pose.x,
        y: pose.y,
        z: pose.z,
        r: pose.r,
        s: pose.s,
        d: pose.d,
        t: pose.t,
      });
    });
  }, [enabled, userId]);

  // ---- heartbeat: makes stationary avatars visible, and late joiners see all ----
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const pose = lastPose.current;
      if (pose) send(pose, true);
    }, THEATRE_NET.HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [enabled, send]);

  // ---- announce immediately on entry, so others do not wait a heartbeat ----
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => {
      const pose = lastPose.current;
      if (pose) send(pose, true);
    }, 150);
    return () => clearTimeout(id);
  }, [enabled, send]);

  // ---- latency probes ----
  // Answer everyone else's probe immediately. Replying is what makes THEIR
  // measurement possible, so this runs regardless of whether we are measuring.
  useEffect(() => {
    if (!enabled || !rtmSendMessage) return;
    return onAvatarPing((ping) => {
      if (ping.userId === userId) return;
      rtmSendMessage({
        type: 'AVATAR_PONG',
        userId,
        to: ping.userId,
        id: ping.id,
      });
    });
  }, [enabled, rtmSendMessage, userId]);

  // Collect replies addressed to us. Several peers answer the same broadcast
  // probe and each reply is a separate valid sample.
  useEffect(() => {
    if (!enabled) return;
    return onAvatarPong((pong) => {
      if (pong.to !== userId) return;
      rtt.current.received(pong.id);
    });
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !rtmSendMessage) return;
    let seq = 0;
    function probe() {
      seq += 1;
      // Unique per send so a late reply cannot be matched to a newer probe.
      const token = `${userId}:${Date.now()}:${seq}`;
      rtt.current.sent(token);
      rtmSendMessage?.({ type: 'AVATAR_PING', userId, id: token });
    }
    probe();
    const id = setInterval(probe, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, rtmSendMessage, userId]);

  // ---- staleness is a connection-loss fallback, not the removal path ----
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      let changed = false;
      for (const [peer, buf] of buffers.current) {
        if (buf.isStale()) {
          buffers.current.delete(peer);
          changed = true;
        }
      }
      if (changed) setPeerIds([...buffers.current.keys()]);
    }, 5000);
    return () => clearInterval(id);
  }, [enabled]);

  // ---- reset when 3D is switched off so we never resume with stale poses ----
  useEffect(() => {
    if (enabled) return;
    buffers.current.clear();
    lastSent.current = null;
    lastPose.current = null;
    rate.current.reset();
    rtt.current.reset();
    setPeerIds([]);
    setPeerCharacters({});
  }, [enabled]);

  const samplePeer = useCallback((peerId: string): Pose | null => {
    return buffers.current.get(peerId)?.sample(Date.now()) ?? null;
  }, []);

  /**
   * The body a peer chose, or null if they have not told us yet (an older client,
   * or their first pose has not arrived). Callers fall back to a hash of the id.
   */
  const peerCharacter = useCallback(
    (peerId: string): 'man' | 'woman' | null => peerCharacters[peerId] ?? null,
    [peerCharacters],
  );

  /** Inbound traffic figures for the stats readout. Local clock only. */
  const netStats = useCallback(
    () => ({
      lastPacketAt: rate.current.lastAt(),
      packetHz: rate.current.hz(),
      rttMs: rtt.current.best(),
    }),
    [],
  );

  return { peerIds, publishPose, samplePeer, peerCharacter, netStats };
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAvatarTransform } from '../../room/services/watch-party.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import {
  exceedsDeadBand,
  type Pose,
  quantise,
  SnapshotBuffer,
  THEATRE_NET,
} from '../lib/interpolation';

interface UseTheatreNetworkOptions {
  userId: string;
  /** Existing channel broadcast from useWatchParty. */
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** Only run while 3D mode is actually visible. */
  enabled: boolean;
}

/**
 * Avatar position sync over the existing Agora RTM channel.
 *
 * Deliberately NOT routed through our backend. Movement is ephemeral peer state;
 * putting it on the backend would add a round trip through a server with no
 * reason to know about it and tie the room's responsiveness to API latency. RTM
 * is already connected for chat and playback sync.
 *
 * Receiving uses the same `subscribe` bus that `onSketchDraw` uses, fed by
 * `dispatchRtmMessage` in the central `useWatchParty` router — so this hook needs
 * no message prop and no changes to that router.
 *
 * Two things keep this inside RTM's rate budget:
 *   1. a send cap of `THEATRE_NET.SEND_HZ`
 *   2. a dead band, so a still or seated avatar sends nothing at all
 */
export function useTheatreNetwork({
  userId,
  rtmSendMessage,
  enabled,
}: UseTheatreNetworkOptions) {
  const buffers = useRef<Map<string, SnapshotBuffer>>(new Map());
  const lastSent = useRef<Pose | null>(null);
  const lastSentAt = useRef(0);
  const [peerIds, setPeerIds] = useState<readonly string[]>([]);

  const minInterval = useMemo(() => 1000 / THEATRE_NET.SEND_HZ, []);

  const publishPose = useCallback(
    (pose: Pose) => {
      if (!enabled || !rtmSendMessage) return;

      const now = Date.now();
      if (now - lastSentAt.current < minInterval) return;

      const q = quantise(pose);
      if (!exceedsDeadBand(lastSent.current, q)) return;

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
        t: now,
      });
    },
    [enabled, rtmSendMessage, userId, minInterval],
  );

  // ingest remote poses off the RTM bus
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = onAvatarTransform((pose) => {
      if (pose.userId === userId) return; // defensive; RTM does not echo self
      const map = buffers.current;
      let buf = map.get(pose.userId);
      if (!buf) {
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
        t: pose.t,
      });
    });
    return unsubscribe;
  }, [enabled, userId]);

  // drop peers that have gone quiet
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const map = buffers.current;
      let changed = false;
      for (const [peer, buf] of map) {
        if (buf.isStale()) {
          map.delete(peer);
          changed = true;
        }
      }
      if (changed) setPeerIds([...map.keys()]);
    }, 5000);
    return () => clearInterval(id);
  }, [enabled]);

  // reset when 3D is switched off so we never resume with stale poses
  useEffect(() => {
    if (enabled) return;
    buffers.current.clear();
    lastSent.current = null;
    setPeerIds([]);
  }, [enabled]);

  const samplePeer = useCallback((peerId: string): Pose | null => {
    return buffers.current.get(peerId)?.sample(Date.now()) ?? null;
  }, []);

  return { peerIds, publishPose, samplePeer };
}

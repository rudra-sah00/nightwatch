'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { MathUtils } from 'three';
import { useAvatarAnimation } from '../hooks/use-avatar-animation';
import { type AvatarState, DANCE_CLIPS } from '../lib/animation';
import {
  applyIdentityColour,
  avatarUrlFor,
  instantiateAvatar,
} from '../lib/avatar-instance';
import type { Pose } from '../lib/interpolation';
import { AvatarLabel } from './AvatarLabel';

/** Network sends a short state key; map it onto the animation state machine. */
function toAvatarState(s: string): AvatarState {
  if (s === 'walk' || s === 'sitIdle' || s === 'dance') {
    return s;
  }
  return 'idle';
}

interface RemoteAvatarProps {
  peerId: string;
  url: string;
  sample: (peerId: string) => Pose | null;
  name?: string;
  message?: string | null;
}

/**
 * One peer's avatar, driven by the interpolation buffer.
 *
 * The model is cloned with `SkeletonUtils` (see `instantiateAvatar`) rather than
 * `Object3D.clone()`. A plain clone of a SkinnedMesh keeps a reference to the
 * source skeleton, so every peer would share one pose and animate in lockstep —
 * the most common bug when putting multiple characters in a three.js scene.
 *
 * Clips come from the avatar glb itself (the manifest reports
 * `animations.clipsEmbedded`), and `AnimationClip`s are safe to share across
 * mixers because the per-avatar state lives in the actions, not the clip.
 */
export function RemoteAvatar({
  peerId,
  url,
  sample,
  name,
  message,
}: RemoteAvatarProps) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<Group>(null);

  // Colour is applied per instance, on cloned materials, so each peer is
  // visually distinct without recolouring everyone else.
  const instance = useMemo(() => {
    const obj = instantiateAvatar(scene);
    applyIdentityColour(obj, peerId);
    return obj;
  }, [scene, peerId]);

  const { force } = useAvatarAnimation({
    root: instance,
    clips: animations,
    initial: 'idle',
  });

  const lastState = useRef<AvatarState>('idle');
  const lastDance = useRef<number | undefined>(undefined);

  useEffect(() => {
    instance.name = `avatar-${peerId}`;
  }, [instance, peerId]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const pose = sample(peerId);
    if (!pose) {
      // stay hidden until the first snapshot, rather than parking at the origin
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(pose.x, pose.y, pose.z);
    // The interpolator already smooths between snapshots, so apply yaw directly
    // — easing it again reads as sluggish.
    g.rotation.y = MathUtils.degToRad(pose.r);

    // Drive the clip from the peer's broadcast state. `force` bypasses the
    // transition table on purpose: the sender is authoritative over its own
    // animation, and a dropped packet must not leave us stuck in the wrong clip.
    //
    // The dance index is part of the identity of the state here: switching from
    // Sway to Twist keeps `s === 'dance'`, so comparing state alone would never
    // restart the mixer and the peer would appear stuck on their first dance.
    const next = toAvatarState(pose.s);
    if (next !== lastState.current || pose.d !== lastDance.current) {
      lastState.current = next;
      lastDance.current = pose.d;
      const clip =
        next === 'dance' && pose.d !== undefined
          ? DANCE_CLIPS[pose.d]
          : undefined;
      force(next, clip);
    }
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={instance} />
      <AvatarLabel userId={peerId} name={name} message={message} />
    </group>
  );
}

interface RemoteAvatarsProps {
  peerIds: readonly string[];
  /** Every loaded character model. */
  urls: readonly string[];
  /** The body a peer chose, or null until they have told us. */
  characterOf?: (peerId: string) => 'man' | 'woman' | null;
  /** Resolve a character to one of `urls`. */
  resolve?: (character: 'man' | 'woman') => string | null;
  sample: (peerId: string) => Pose | null;
  names?: Record<string, string>;
  bubbles?: Record<string, string>;
}

export function RemoteAvatars({
  peerIds,
  urls,
  characterOf,
  resolve,
  sample,
  names,
  bubbles,
}: RemoteAvatarsProps) {
  return (
    <group name="remote-avatars">
      {peerIds.map((id) => {
        // Prefer what the peer told us they are. Fall back to a stable hash so
        // an older client that never sends a character still gets a consistent
        // body rather than flickering between models.
        const chosen = characterOf?.(id) ?? null;
        const url =
          (chosen && resolve ? resolve(chosen) : null) ??
          avatarUrlFor(urls, id);
        // No published character yet — render nothing rather than throwing
        // inside useGLTF with an empty url.
        if (!url) return null;
        return (
          <RemoteAvatar
            key={id}
            peerId={id}
            url={url}
            sample={sample}
            name={names?.[id]}
            message={bubbles?.[id] ?? null}
          />
        );
      })}
    </group>
  );
}

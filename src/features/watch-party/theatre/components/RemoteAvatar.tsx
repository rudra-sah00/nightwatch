'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { MathUtils } from 'three';
import { useAvatarAnimation } from '../hooks/use-avatar-animation';
import type { AvatarState } from '../lib/animation';
import { applyIdentityColour, instantiateAvatar } from '../lib/avatar-instance';
import type { Pose } from '../lib/interpolation';
import { AvatarLabel } from './AvatarLabel';

/** Network sends a short state key; map it onto the animation state machine. */
function toAvatarState(s: string): AvatarState {
  if (s === 'walk' || s === 'run' || s === 'sitIdle' || s === 'dance') {
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
    const next = toAvatarState(pose.s);
    if (next !== lastState.current) {
      lastState.current = next;
      force(next);
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
  url: string;
  sample: (peerId: string) => Pose | null;
  names?: Record<string, string>;
  bubbles?: Record<string, string>;
}

export function RemoteAvatars({
  peerIds,
  url,
  sample,
  names,
  bubbles,
}: RemoteAvatarsProps) {
  return (
    <group name="remote-avatars">
      {peerIds.map((id) => (
        <RemoteAvatar
          key={id}
          peerId={id}
          url={url}
          sample={sample}
          name={names?.[id]}
          message={bubbles?.[id] ?? null}
        />
      ))}
    </group>
  );
}

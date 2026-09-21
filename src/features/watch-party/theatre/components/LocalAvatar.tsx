'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useAvatarAnimation } from '../hooks/use-avatar-animation';
import { CAPSULE_CENTRE_TO_FEET } from '../hooks/use-avatar-controls';
import { DANCE_CLIPS } from '../lib/animation';
import { applyIdentityColour, instantiateAvatar } from '../lib/avatar-instance';

interface LocalAvatarProps {
  /** Avatar glb url, the same one peers see for you. */
  url: string;
  /** Your own id, so the identity colour matches what peers render. */
  selfId: string;
  /** Physics body to follow. */
  body: React.RefObject<RapierRigidBody | null>;
  /** Index into DANCE_CLIPS, or null when not dancing. */
  danceIndex: number | null;
  /**
   * How far the camera has pulled back, metres.
   *
   * Doubles as the visibility test. The model is hidden at first person because
   * the camera sits inside its head, and hiding it is cheaper and more reliable
   * than trying to near-plane-clip your way out of a skull.
   */
  cameraDistance: number;
}

/** Below this the camera is close enough to be inside the head. */
const REVEAL_DISTANCE = 0.6;

/**
 * Your own avatar, shown only while the dance camera has pulled back.
 *
 * Peers already see you — `RemoteAvatar` renders everyone else from the network
 * interpolation buffer — but the local player was never drawn, because in first
 * person there is nothing to draw. That makes dancing invisible to the person
 * doing it, which is the whole point of a dance.
 *
 * Driven straight off the physics body rather than through the interpolation
 * buffer that peers use. Routing your own pose through the network smoothing
 * path would add its latency to your own movement, so you would watch yourself
 * lag behind your own keypresses.
 */
export function LocalAvatar({
  url,
  selfId,
  body,
  danceIndex,
  cameraDistance,
}: LocalAvatarProps) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<Group>(null);

  // Cloned with SkeletonUtils via instantiateAvatar: a plain Object3D.clone()
  // of a SkinnedMesh shares the source skeleton, so this avatar would pose in
  // lockstep with every peer's.
  const instance = useMemo(() => {
    const obj = instantiateAvatar(scene);
    applyIdentityColour(obj, selfId);
    return obj;
  }, [scene, selfId]);

  const clip = danceIndex === null ? null : (DANCE_CLIPS[danceIndex] ?? null);

  // `force`, not `play`: `play` refuses transitions the state machine considers
  // illegal, and the local dance state is already authoritative here — it came
  // from this user's own keypress, so there is nothing to arbitrate.
  const { force } = useAvatarAnimation({
    root: instance,
    clips: animations,
    initial: 'idle',
  });

  useEffect(() => {
    force(clip ? 'dance' : 'idle', clip ?? undefined);
  }, [clip, force]);

  useFrame(() => {
    const g = group.current;
    const rb = body.current;
    if (!g || !rb) return;

    const visible = cameraDistance > REVEAL_DISTANCE;
    g.visible = visible;
    if (!visible) return;

    const p = rb.translation();
    // Rapier reports the capsule centre; the model's origin is between its feet.
    g.position.set(p.x, p.y - CAPSULE_CENTRE_TO_FEET, p.z);
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={instance} />
    </group>
  );
}

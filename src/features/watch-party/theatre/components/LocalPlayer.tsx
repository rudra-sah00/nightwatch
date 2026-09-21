'use client';

import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { LOCOMOTION, useAvatarControls } from '../hooks/use-avatar-controls';
import { SPAWN, STANDING_EYE_HEIGHT } from '../lib/layout';

interface LocalPlayerProps {
  enabled: boolean;
  /** Called with the local pose so the network layer can broadcast it. */
  onPose?: (pose: {
    x: number;
    y: number;
    z: number;
    r: number;
    s: string;
  }) => void;
}

/**
 * The local player: a kinematic capsule the camera rides.
 *
 * The camera sits at eye height above the capsule centre rather than being the
 * physics body itself, so collision is resolved against a body with real volume.
 * A camera-as-body approach lets you push your viewpoint into geometry because a
 * point has no radius.
 */
export function LocalPlayer({ enabled, onPose }: LocalPlayerProps) {
  const body = useRef<RapierRigidBody>(null);
  const camera = useThree((s) => s.camera);
  const controls = useAvatarControls(body, enabled);
  const eye = useRef(new Vector3());

  useFrame(() => {
    const rb = body.current;
    if (!rb || !enabled) return;

    const p = rb.translation();
    // capsule centre -> eye: half the capsule plus a cap, minus a little so the
    // eye is inside the head rather than floating above it
    const eyeY =
      p.y -
      (LOCOMOTION.CAPSULE_HALF_HEIGHT + LOCOMOTION.CAPSULE_RADIUS) +
      STANDING_EYE_HEIGHT;
    eye.current.set(p.x, eyeY, p.z);
    camera.position.copy(eye.current);

    if (onPose) {
      const yaw =
        (Math.atan2(-camera.matrix.elements[8], -camera.matrix.elements[10]) *
          180) /
        Math.PI;
      const moving = controls.isMoving();
      const running = controls.isRunning();
      onPose({
        x: p.x,
        y: p.y,
        z: p.z,
        r: yaw,
        s: moving ? (running ? 'run' : 'walk') : 'idle',
      });
    }
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      // spawn the capsule so its feet land on the platform
      position={[
        SPAWN.x,
        SPAWN.y + LOCOMOTION.CAPSULE_HALF_HEIGHT + LOCOMOTION.CAPSULE_RADIUS,
        SPAWN.z,
      ]}
      name="local-player"
    >
      <CapsuleCollider
        args={[LOCOMOTION.CAPSULE_HALF_HEIGHT, LOCOMOTION.CAPSULE_RADIUS]}
      />
    </RigidBody>
  );
}

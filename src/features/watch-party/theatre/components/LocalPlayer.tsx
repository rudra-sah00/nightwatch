'use client';

import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  CAPSULE_CENTRE_TO_FEET,
  LOCOMOTION,
  useAvatarControls,
} from '../hooks/use-avatar-controls';
import { useDanceCamera } from '../hooks/use-dance-camera';
import { STANDING_EYE_HEIGHT, spawnFor } from '../lib/layout';

interface LocalPlayerProps {
  enabled: boolean;
  /**
   * Shared handle on the physics body.
   *
   * Owned by the caller because other systems need to query the player's
   * surroundings — the dance clearance probe casts rays from this collider and
   * must exclude it, which it cannot do without the handle.
   */
  bodyRef?: React.RefObject<RapierRigidBody | null>;
  /**
   * True while a dance clip is playing, which slides the camera off the head so
   * the dancer can actually see themselves.
   */
  dancing?: boolean;
  /** Reports how far the camera pulled back, so the caller can reveal the avatar. */
  onCameraDistance?: (metres: number) => void;
  /**
   * This player's id, which picks their spawn slot.
   *
   * Every client used to start on the same square metre, and since avatars carry
   * no colliders nothing pushed them apart — eight people entering a party stood
   * inside one another.
   */
  selfId: string;
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
export function LocalPlayer({
  enabled,
  selfId,
  onPose,
  bodyRef,
  dancing = false,
  onCameraDistance,
}: LocalPlayerProps) {
  const spawn = useMemo(() => spawnFor(selfId), [selfId]);
  const own = useRef<RapierRigidBody>(null);
  const body = bodyRef ?? own;
  const camera = useThree((s) => s.camera);
  const controls = useAvatarControls(body, enabled);
  const eye = useRef(new Vector3());
  const resolveCamera = useDanceCamera(body);
  const lastDistance = useRef(-1);

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb || !enabled) return;

    const p = rb.translation();
    // Rapier puts a capsule's translation at its centre. Both the camera and
    // the broadcast pose need the point between the feet, so derive it once.
    const groundY = p.y - CAPSULE_CENTRE_TO_FEET;
    eye.current.set(p.x, groundY + STANDING_EYE_HEIGHT, p.z);

    // First person parks the camera on the eye point; dancing slides it back
    // along the look axis, clamped by a ray so it never enters the room shell.
    let distance = 0;
    if (camera instanceof PerspectiveCamera) {
      distance = resolveCamera(eye.current, camera, dancing, delta);
    } else {
      camera.position.copy(eye.current);
    }

    if (onCameraDistance && Math.abs(distance - lastDistance.current) > 0.01) {
      lastDistance.current = distance;
      onCameraDistance(distance);
    }

    if (onPose) {
      const yaw =
        (Math.atan2(-camera.matrix.elements[8], -camera.matrix.elements[10]) *
          180) /
        Math.PI;
      const moving = controls.isMoving();
      onPose({
        x: p.x,
        // Ground level, NOT the capsule centre. Peers place a feet-origin model
        // at this point, so sending p.y floats every avatar 0.88 m off the deck.
        y: groundY,
        z: p.z,
        r: yaw,
        s: moving ? 'walk' : 'idle',
      });
    }
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      // spawn the capsule so its feet land on the platform, in this player's slot
      position={[spawn.x, spawn.y + CAPSULE_CENTRE_TO_FEET, spawn.z]}
      name="local-player"
    >
      <CapsuleCollider
        args={[LOCOMOTION.CAPSULE_HALF_HEIGHT, LOCOMOTION.CAPSULE_RADIUS]}
      />
    </RigidBody>
  );
}

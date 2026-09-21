'use client';

import { type RapierRigidBody, useRapier } from '@react-three/rapier';
import { useCallback, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';

/** Scratch vector, module level so the frame loop allocates nothing. */
const BACK = new Vector3();

/**
 * Pull-back camera for dancing.
 *
 * The theatre camera is first person: `LocalPlayer` parks it at eye height on the
 * player capsule. That is right for watching a film and useless for dancing,
 * because the one person who cannot see your dance is you. So while a dance clip
 * is playing the view slides backwards off the head and looks at your own avatar,
 * then glides back in when the dance ends.
 *
 * The camera must not pass through the room to do it. Sliding a free camera back
 * in an 8 x 8.5 m box puts it inside a wall almost immediately — against the back
 * wall at the spawn point, it would be outside the building. So the pull-back is
 * clamped by a ray cast through the real collision world, which is also what
 * makes the view behave when you dance up against a wall: you get as much
 * distance as the room allows and no more.
 */
export const DANCE_CAMERA = {
  /** How far back the view slides, metres, when there is room. */
  DISTANCE: 3.1,
  /** Lifted above eye level so the view looks slightly down at the avatar. */
  HEIGHT: 0.45,
  /**
   * Gap kept between the camera and whatever the ray hit.
   *
   * Must exceed the camera's near plane (0.1) or geometry clips through the
   * lens and you see the inside of the wall.
   */
  WALL_MARGIN: 0.32,
  /** Seconds for the move in and out. Slow enough to read as a camera move. */
  GLIDE_SECONDS: 0.55,
} as const;

/**
 * Returns a per-frame resolver that writes the final camera position.
 *
 * Call it from the same `useFrame` that computes the eye point, after the look
 * direction for this frame has been applied — the pull-back is along the camera's
 * own forward axis, so a stale quaternion would lag the camera behind the turn.
 */
export function useDanceCamera(body: React.RefObject<RapierRigidBody | null>) {
  const { world, rapier } = useRapier();
  /** Smoothed pull-back distance, metres. Survives across frames. */
  const distance = useRef(0);

  /**
   * @param eye     head position this frame
   * @param camera  the scene camera, already oriented
   * @param active  true while a dance is playing
   * @param delta   frame time, seconds
   * @returns the distance actually applied, so the caller can fade the avatar in
   */
  const resolve = useCallback(
    (
      eye: Vector3,
      camera: PerspectiveCamera,
      active: boolean,
      delta: number,
    ): number => {
      const target = active ? DANCE_CAMERA.DISTANCE : 0;

      // Frame-rate independent glide, same 1 - exp(-k dt) form used by the
      // lighting fade so the two feel consistent.
      const k = 5 / DANCE_CAMERA.GLIDE_SECONDS;
      distance.current +=
        (target - distance.current) * (1 - Math.exp(-k * Math.max(delta, 0)));

      if (distance.current < 0.02) {
        camera.position.copy(eye);
        distance.current = 0;
        return 0;
      }

      // Backwards along the camera's own forward axis.
      camera.getWorldDirection(BACK);
      BACK.negate();

      let allowed = distance.current;
      const rb = body.current;
      if (rb) {
        const ray = new rapier.Ray(
          { x: eye.x, y: eye.y, z: eye.z },
          { x: BACK.x, y: BACK.y, z: BACK.z },
        );
        const hit = world.castRay(
          ray,
          distance.current + DANCE_CAMERA.WALL_MARGIN,
          true,
          undefined,
          undefined,
          rb.collider(0) ?? undefined,
          rb,
        );
        if (hit) {
          allowed = Math.max(0, hit.timeOfImpact - DANCE_CAMERA.WALL_MARGIN);
        }
      }

      camera.position.copy(eye).addScaledVector(BACK, allowed);
      // Rise proportionally, so a dance in a tight corner does not tilt oddly.
      camera.position.y +=
        DANCE_CAMERA.HEIGHT * (allowed / DANCE_CAMERA.DISTANCE);
      return allowed;
    },
    [body, world, rapier],
  );

  return resolve;
}

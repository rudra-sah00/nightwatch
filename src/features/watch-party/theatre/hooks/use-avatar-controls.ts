'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { type RapierRigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { isTypingTarget } from '../lib/keyboard';

/** Movement tuning, metres/second and radians. */
export const LOCOMOTION = {
  WALK_SPEED: 2.2,
  GRAVITY: -18,
  /** Terminal fall speed, so a long drop cannot tunnel through the floor. */
  MAX_FALL: -22,
  /** Capsule half-height (excluding the two end caps) and radius. */
  CAPSULE_HALF_HEIGHT: 0.6,
  CAPSULE_RADIUS: 0.28,
  /**
   * Must exceed the 0.15 m stair riser or the aisle steps become walls.
   * 0.22 clears them with margin without letting you climb onto chairs.
   */
  AUTOSTEP_HEIGHT: 0.22,
  AUTOSTEP_MIN_WIDTH: 0.12,
  /** Stops you walking up the riser face or a wall. */
  MAX_SLOPE_CLIMB_DEG: 50,
  MIN_SLOPE_SLIDE_DEG: 40,
  /** Keeps the capsule glued to the floor over step edges. */
  SNAP_TO_GROUND: 0.3,
  /** Gap Rapier keeps between the capsule and geometry. */
  COLLIDER_OFFSET: 0.01,
} as const;

/**
 * Distance from the capsule's centre to the soles of its feet.
 *
 * Rapier reports a capsule's translation at its CENTRE, but a character model's
 * origin is between its feet. Anything that converts between "where the physics
 * body is" and "where the body appears to stand" must go through this value.
 *
 * Publishing the raw capsule centre as an avatar position is a real bug we
 * shipped: remote avatars rendered 0.88 m in the air, hovering above the seats.
 */
export const CAPSULE_CENTRE_TO_FEET =
  LOCOMOTION.CAPSULE_HALF_HEIGHT + LOCOMOTION.CAPSULE_RADIUS;

type Keys = Record<string, boolean>;

/**
 * WASD locomotion with real collision.
 *
 * Uses Rapier's kinematic character controller rather than hand-rolled
 * movement, because this room genuinely needs sweep-and-slide: there is a
 * 0.45 m riser with stairs at the aisles only, a 2.54 m doorway into the cafe,
 * eight solid chairs and a hard perimeter. Naive position += velocity lets you
 * clip corners and pass through walls at speed.
 *
 * Autostep is what makes the stairs walkable; slope limits are what stop you
 * treating the riser face as a ramp. Both are tuned to the measured geometry in
 * `layout.ts`, so changing the stair height there means revisiting
 * `AUTOSTEP_HEIGHT` here.
 */
export function useAvatarControls(
  body: React.RefObject<RapierRigidBody | null>,
  enabled: boolean,
) {
  const { world, rapier } = useRapier();
  const camera = useThree((s) => s.camera);
  const keys = useRef<Keys>({});
  const vertical = useRef(0);

  // One controller for the lifetime of the scene.
  const controller = useMemo(() => {
    const c = world.createCharacterController(LOCOMOTION.COLLIDER_OFFSET);
    c.enableAutostep(
      LOCOMOTION.AUTOSTEP_HEIGHT,
      LOCOMOTION.AUTOSTEP_MIN_WIDTH,
      true,
    );
    c.enableSnapToGround(LOCOMOTION.SNAP_TO_GROUND);
    c.setMaxSlopeClimbAngle((LOCOMOTION.MAX_SLOPE_CLIMB_DEG * Math.PI) / 180);
    c.setMinSlopeSlideAngle((LOCOMOTION.MIN_SLOPE_SLIDE_DEG * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(true);
    return c;
  }, [world]);

  useEffect(() => {
    return () => {
      world.removeCharacterController(controller);
    };
  }, [world, controller]);

  useEffect(() => {
    if (!enabled) {
      keys.current = {};
      return;
    }
    function down(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      keys.current[e.key.toLowerCase()] = true;
    }
    function up(e: KeyboardEvent) {
      keys.current[e.key.toLowerCase()] = false;
    }
    // Clear on blur, or holding W while tabbing away leaves you walking forever.
    function blur() {
      keys.current = {};
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [enabled]);

  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const wish = useMemo(() => new Vector3(), []);

  useFrame((_, rawDelta) => {
    const rb = body.current;
    if (!enabled || !rb) return;

    // Clamp delta: a background tab can hand us a multi-second step, which
    // would teleport the capsule straight through a wall.
    const delta = Math.min(rawDelta, 1 / 30);

    const k = keys.current;
    const speed = LOCOMOTION.WALK_SPEED;

    // camera-relative, flattened to the floor plane
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    right
      .crossVectors(new Vector3(0, 1, 0), forward)
      .normalize()
      .negate();

    wish.set(0, 0, 0);
    if (k.w || k.arrowup) wish.add(forward);
    if (k.s || k.arrowdown) wish.sub(forward);
    if (k.d || k.arrowright) wish.add(right);
    if (k.a || k.arrowleft) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed * delta);

    // gravity integrated separately from input
    const grounded = controller.computedGrounded();
    if (grounded) {
      vertical.current = 0;
    } else {
      vertical.current = Math.max(
        LOCOMOTION.MAX_FALL,
        vertical.current + LOCOMOTION.GRAVITY * delta,
      );
    }

    const collider = rb.collider(0);
    if (!collider) return;

    controller.computeColliderMovement(collider, {
      x: wish.x,
      y: vertical.current * delta,
      z: wish.z,
    });

    const corrected = controller.computedMovement();
    const p = rb.translation();
    rb.setNextKinematicTranslation({
      x: p.x + corrected.x,
      y: p.y + corrected.y,
      z: p.z + corrected.z,
    });
  });

  return {
    /** Current horizontal speed intent, for driving the animation state. */
    isMoving: () => {
      const k = keys.current;
      return Boolean(
        k.w ||
          k.a ||
          k.s ||
          k.d ||
          k.arrowup ||
          k.arrowdown ||
          k.arrowleft ||
          k.arrowright,
      );
    },
    rapierVersion: rapier.version(),
  };
}

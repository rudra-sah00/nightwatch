'use client';

import { type RapierRigidBody, useRapier } from '@react-three/rapier';
import { useCallback } from 'react';
import {
  DANCE_CLEARANCE_M,
  DANCE_PROBE_DIRECTIONS,
  DANCE_PROBE_HEIGHT_M,
  hasDanceSpace,
  tightestClearance,
} from '../lib/dance-rules';
import { CAPSULE_CENTRE_TO_FEET } from './use-avatar-controls';

/**
 * Is there physically room to dance where you are standing?
 *
 * Measured against the real collision world rather than assumed from position.
 * The auditorium is mostly chairs — the seat pitch is 0.90 m — so "am I in an
 * open space" cannot be answered from coordinates without duplicating the
 * furniture layout in a second place that would then drift out of step with the
 * colliders.
 *
 * Rays are cast horizontally from torso height in a ring around the player. The
 * player's own capsule is excluded, or every probe would immediately hit it and
 * report no clearance anywhere. Torso height also avoids hitting the floor, which
 * a ground-level probe would do everywhere.
 */
export function useDanceSpace(body: React.RefObject<RapierRigidBody | null>) {
  const { world, rapier } = useRapier();

  /** Measured clearance per direction, metres. `Infinity` means nothing hit. */
  const probe = useCallback((): number[] => {
    const rb = body.current;
    if (!rb) return [];
    const collider = rb.collider(0);
    const p = rb.translation();
    // Rapier reports the capsule centre; the probe wants a height above the feet.
    const feetY = p.y - CAPSULE_CENTRE_TO_FEET;
    const origin = { x: p.x, y: feetY + DANCE_PROBE_HEIGHT_M, z: p.z };

    const out: number[] = [];
    for (let i = 0; i < DANCE_PROBE_DIRECTIONS; i += 1) {
      const a = (i / DANCE_PROBE_DIRECTIONS) * Math.PI * 2;
      const dir = { x: Math.sin(a), y: 0, z: Math.cos(a) };
      const ray = new rapier.Ray(origin, dir);
      // Cast a little past the requirement so "just barely enough" is
      // distinguishable from "acres of room", which the prompt text uses.
      const maxToi = DANCE_CLEARANCE_M * 2;
      const hit = world.castRay(
        ray,
        maxToi,
        true,
        undefined,
        undefined,
        collider ?? undefined,
        rb,
      );
      out.push(hit ? hit.timeOfImpact : Number.POSITIVE_INFINITY);
    }
    return out;
  }, [body, world, rapier]);

  /** True when every direction has at least the required clearance. */
  const canDanceHere = useCallback(() => hasDanceSpace(probe()), [probe]);

  /** Tightest direction, for telling the user how much room they actually have. */
  const clearance = useCallback(() => tightestClearance(probe()), [probe]);

  return { canDanceHere, clearance, probe };
}

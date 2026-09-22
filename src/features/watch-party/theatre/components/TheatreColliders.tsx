'use client';

import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  CHAIR_BACK,
  CHAIR_FRONT,
  CHAIR_HALF_WIDTH,
  REAR_DETAIL_FACE_Z,
} from '../lib/geometry';
import { FLOORS, ROOM, SEATS, STAIRS } from '../lib/layout';

/**
 * Static collision for the theatre.
 *
 * Built from `layout.ts` constants rather than a trimesh, for three reasons:
 * boxes are far cheaper to query than a 20k-triangle trimesh, the room is now
 * generated geometry with no mesh to derive a collider from anyway, and a
 * hand-specified set means walkable space is a deliberate decision instead of a
 * side effect of whatever art happens to exist.
 *
 * Coordinates are three.js space (+Y up, screen at z≈0, audience at +z).
 */

/** Convenience: a box collider from min/max bounds instead of half-extents. */
function Box({
  x0,
  x1,
  y0,
  y1,
  z0,
  z1,
}: {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}) {
  return (
    <CuboidCollider
      args={[(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]}
      position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}
    />
  );
}

const WALL_H = ROOM.wallTopY;
const T = 0.3; // wall thickness; generous so fast movement cannot tunnel through

export function TheatreColliders() {
  return (
    <RigidBody type="fixed" colliders={false} name="theatre-static">
      {/* ---------- floors ---------- */}
      {/* front floor, in front of the riser */}
      <Box
        x0={ROOM.minX}
        x1={ROOM.maxX}
        y0={-0.3}
        y1={FLOORS.front.y}
        z0={FLOORS.front.minZ}
        z1={FLOORS.front.maxZ}
      />
      {/* rear platform, 0.45 up */}
      <Box
        x0={ROOM.minX}
        x1={ROOM.maxX}
        y0={-0.3}
        y1={FLOORS.rearPlatform.y}
        z0={FLOORS.rearPlatform.minZ}
        z1={FLOORS.rearPlatform.maxZ}
      />

      {/* ---------- aisle stairs ----------
          One box per tread, both sides. The controller's autostep is set to
          clear a 0.15 m riser, so these are climbed rather than blocked. */}
      {[-1, 1].map((side) =>
        Array.from({ length: STAIRS.risers - 1 }, (_, i) => {
          const step = i + 1; // treads at 0.15 and 0.30; 0.45 is the platform
          const top = step * STAIRS.riserHeight;
          const z1 = STAIRS.maxZ - i * STAIRS.treadDepth;
          const z0 = z1 - STAIRS.treadDepth;
          const x0 = side < 0 ? -STAIRS.outerX : STAIRS.innerX;
          const x1 = side < 0 ? -STAIRS.innerX : STAIRS.outerX;
          return (
            <Box
              key={`stair-${side}-${step}`}
              x0={x0}
              x1={x1}
              y0={-0.3}
              y1={top}
              z0={z0}
              z1={z1}
            />
          );
        }),
      )}

      {/* ---------- riser face ----------
          Blocks the 0.45 m step except where the stairs are, so the only way up
          is the aisles. Without this you could walk straight up the drop. */}
      <Box
        x0={-STAIRS.innerX}
        x1={STAIRS.innerX}
        y0={0}
        y1={FLOORS.rearPlatform.y}
        z0={FLOORS.rearPlatform.minZ - 0.05}
        z1={FLOORS.rearPlatform.minZ + 0.05}
      />

      {/* ---------- auditorium perimeter ---------- */}
      {/* screen wall */}
      <Box
        x0={ROOM.minX - T}
        x1={ROOM.maxX + T}
        y0={0}
        y1={WALL_H}
        z0={-T}
        z1={0}
      />
      {/* side walls, full depth of the auditorium */}
      <Box
        x0={ROOM.minX - T}
        x1={ROOM.minX}
        y0={0}
        y1={WALL_H}
        z0={-T}
        z1={ROOM.maxZ}
      />
      <Box
        x0={ROOM.maxX}
        x1={ROOM.maxX + T}
        y0={0}
        y1={WALL_H}
        z0={-T}
        z1={ROOM.maxZ}
      />

      {/* back wall.
          Stops at the rear DETAIL face, not at the wall plane. The handrail
          stands 0.28 m proud of that wall, so a collider on the plane itself let
          you walk through the rail, its brackets and the battens to reach it. */}
      <Box
        x0={ROOM.minX}
        x1={ROOM.maxX}
        y0={0}
        y1={WALL_H}
        z0={REAR_DETAIL_FACE_Z}
        z1={ROOM.maxZ + T}
      />

      {/* ---------- chairs ----------
          Blocks walking through the seating. Sitting is handled by the seat
          pads in front, so the chair itself is solid.

          Bounds match the generated recliner in `lib/geometry/recliner.ts`:
          0.718 wide, 0.810 deep, 1.097 tall. The box stops at 0.8 because the
          headrest above that is set well back and blocking it would keep you
          further from the seat than the pad radius allows. */}
      {SEATS.map((seat) => (
        <Box
          key={`chair-${seat.id}`}
          x0={seat.position.x - CHAIR_HALF_WIDTH}
          x1={seat.position.x + CHAIR_HALF_WIDTH}
          y0={seat.position.y}
          y1={seat.position.y + 0.8}
          z0={seat.position.z + CHAIR_FRONT}
          z1={seat.position.z + CHAIR_BACK}
        />
      ))}
    </RigidBody>
  );
}

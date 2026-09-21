'use client';

import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { FLOORS, GATE, ROOM, SEATS, STAIRS } from '../lib/layout';

/**
 * Static collision for the theatre.
 *
 * Built from `layout.ts` constants rather than a trimesh of `room.glb`, for
 * three reasons: boxes are far cheaper to query than a 20k-triangle trimesh,
 * the Draco-compressed geometry would have to be fully decoded before it could
 * be used as a collider, and a hand-specified set means walkable space is a
 * deliberate decision instead of a side effect of whatever art happens to exist.
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
      {/* gate threshold, continues the platform through the wall */}
      <Box
        x0={GATE.minX}
        x1={GATE.maxX}
        y0={-0.3}
        y1={FLOORS.gateThreshold.y}
        z0={FLOORS.gateThreshold.minZ}
        z1={FLOORS.gateThreshold.maxZ}
      />
      {/* cafe floor */}
      <Box
        x0={-4.3}
        x1={4.3}
        y0={-0.3}
        y1={FLOORS.cafe.y}
        z0={FLOORS.cafe.minZ}
        z1={FLOORS.cafe.maxZ}
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
      {/* side walls, run the full depth including the cafe */}
      <Box
        x0={ROOM.minX - T}
        x1={ROOM.minX}
        y0={0}
        y1={WALL_H}
        z0={-T}
        z1={FLOORS.cafe.maxZ}
      />
      <Box
        x0={ROOM.maxX}
        x1={ROOM.maxX + T}
        y0={0}
        y1={WALL_H}
        z0={-T}
        z1={FLOORS.cafe.maxZ}
      />

      {/* back wall, split around the gate so the doorway is walkable */}
      <Box
        x0={ROOM.minX}
        x1={GATE.minX}
        y0={0}
        y1={WALL_H}
        z0={FLOORS.rearPlatform.maxZ}
        z1={FLOORS.gateThreshold.maxZ}
      />
      <Box
        x0={GATE.maxX}
        x1={ROOM.maxX}
        y0={0}
        y1={WALL_H}
        z0={FLOORS.rearPlatform.maxZ}
        z1={FLOORS.gateThreshold.maxZ}
      />
      {/* header above the gate opening */}
      <Box
        x0={GATE.minX}
        x1={GATE.maxX}
        y0={GATE.topY}
        y1={WALL_H}
        z0={FLOORS.rearPlatform.maxZ}
        z1={FLOORS.gateThreshold.maxZ}
      />

      {/* ---------- cafe shell ---------- */}
      <Box
        x0={-4.3 - T}
        x1={-4.3}
        y0={0}
        y1={3.4}
        z0={FLOORS.cafe.minZ}
        z1={FLOORS.cafe.maxZ + T}
      />
      <Box
        x0={4.3}
        x1={4.3 + T}
        y0={0}
        y1={3.4}
        z0={FLOORS.cafe.minZ}
        z1={FLOORS.cafe.maxZ + T}
      />
      <Box
        x0={-4.3 - T}
        x1={4.3 + T}
        y0={0}
        y1={3.4}
        z0={FLOORS.cafe.maxZ}
        z1={FLOORS.cafe.maxZ + T}
      />
      {/* cafe service counter — solid, you walk around it not through it */}
      <Box x0={-3.7} x1={0.4} y0={0.45} y1={1.35} z0={12.1} z1={12.95} />
      <Box x0={-3.95} x1={0.6} y0={0.45} y1={1.0} z0={13.8} z1={14.15} />

      {/* ---------- chairs ----------
          Blocks walking through the seating. Sitting is handled by the seat
          pads in front, so the chair itself is solid. */}
      {SEATS.map((seat) => (
        <Box
          key={`chair-${seat.id}`}
          x0={seat.position.x - 0.36}
          x1={seat.position.x + 0.36}
          y0={seat.position.y}
          y1={seat.position.y + 0.8}
          z0={seat.position.z - 0.42}
          z1={seat.position.z + 0.42}
        />
      ))}
    </RigidBody>
  );
}

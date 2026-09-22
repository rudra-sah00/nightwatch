'use client';

import { useEffect, useMemo } from 'react';
import { buildSeating, disposeBuilt } from '../lib/geometry';
import { SEATS, type SeatId } from '../lib/layout';

/** Seat pad tint encodes occupancy so the room reads at a glance. */
const PAD_FREE = '#06b6d4';
const PAD_IN_RANGE = '#ffcc00';

interface TheatreSeatingProps {
  /** seatId -> userId, or null when free */
  seatMap?: Record<SeatId, string | null>;
  /** nearest free seat to the local player, gets the bright prompt tint */
  highlightedSeat?: SeatId | null;
}

/**
 * Eight luxury recliners and their floor pads.
 *
 * Generated in code — there is no `chair.glb`. Proportions come from Blender's
 * `Chair_A3` and match it to within 3 mm on every axis (0.719 x 0.810 x 1.095),
 * with channel-fluted backs, piping, brass-ringed cup-holders, walnut armrest caps
 * and a recline control plate.
 *
 * All eight are built into ONE batch rather than one mesh reused per seat. Reuse
 * would cost eight draw calls per material where a batch costs one, and the chairs
 * never move. Positions come from `layout.ts` — never hand-place a chair here or
 * the two sources will drift.
 *
 * The pads are the exception: they carry per-seat occupancy tint, so they stay
 * separate small meshes.
 */
export function TheatreSeating({
  seatMap,
  highlightedSeat = null,
}: TheatreSeatingProps) {
  const meshes = useMemo(() => buildSeating(), []);
  useEffect(() => () => disposeBuilt(meshes), [meshes]);

  return (
    <group name="seating">
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {SEATS.map((seat) => {
        // Nothing to invite you to once a seat is taken.
        if (seatMap?.[seat.id]) return null;
        const highlighted = highlightedSeat === seat.id;
        return (
          <mesh
            key={seat.id}
            name={`seatpad-${seat.id}`}
            position={[seat.pad.x, seat.pad.y + 0.012, seat.pad.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.6, 0.36]} />
            <meshBasicMaterial
              color={highlighted ? PAD_IN_RANGE : PAD_FREE}
              transparent
              opacity={highlighted ? 0.85 : 0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
}

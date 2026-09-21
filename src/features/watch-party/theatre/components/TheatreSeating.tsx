'use client';

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Mesh } from 'three';
import { SEATS, type Seat, type SeatId } from '../lib/layout';

/** Seat pad tint encodes occupancy so the room reads at a glance. */
const PAD_FREE = '#06b6d4';
const PAD_IN_RANGE = '#ffcc00';

interface TheatreSeatingProps {
  /** chair.glb url from the backend manifest */
  url: string;
  /** seatId -> userId, or null when free */
  seatMap?: Record<SeatId, string | null>;
  /** nearest free seat to the local player, gets the bright prompt tint */
  highlightedSeat?: SeatId | null;
}

/**
 * Eight chairs and their floor pads.
 *
 * The chair glb is loaded once and its geometry reused per seat rather than
 * fetching eight copies. Positions come from `layout.ts`, which is measured
 * from the Blender scene — never hand-place a chair here or the two sources
 * will drift.
 */
export function TheatreSeating({
  url,
  seatMap,
  highlightedSeat = null,
}: TheatreSeatingProps) {
  const { scene } = useGLTF(url);

  // Pull the single chair mesh out of the loaded glb so it can be reused.
  const chair = useMemo(() => {
    let found: Mesh | null = null;
    scene.traverse((child) => {
      if (!found && child instanceof Mesh) found = child;
    });
    return found as Mesh | null;
  }, [scene]);

  if (!chair) return null;

  return (
    <group name="seating">
      {SEATS.map((seat) => (
        <SeatUnit
          key={seat.id}
          seat={seat}
          chair={chair}
          taken={Boolean(seatMap?.[seat.id])}
          highlighted={highlightedSeat === seat.id}
        />
      ))}
    </group>
  );
}

interface SeatUnitProps {
  seat: Seat;
  chair: Mesh;
  taken: boolean;
  highlighted: boolean;
}

function SeatUnit({ seat, chair, taken, highlighted }: SeatUnitProps) {
  return (
    <group name={`seat-${seat.id}`}>
      <mesh
        geometry={chair.geometry}
        material={chair.material}
        position={[seat.position.x, seat.position.y, seat.position.z]}
        castShadow
        receiveShadow
      />
      {/* Pad is hidden once the seat is taken — nothing to invite you to. */}
      {!taken && (
        <mesh
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
      )}
    </group>
  );
}

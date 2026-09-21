/**
 * Theatre layout — single source of truth for the 3D scene.
 *
 * Every number here was MEASURED from the Blender scene (theatre_blockout.blend,
 * kept outside this repo — it is a ~158 MB binary), not copied from the design
 * doc. docs/features/THEATRE_3D.md §2 has drifted from the built scene (it still
 * describes a 6 m room with 0.70 m seat pitch); this file reflects what actually
 * exists and is the value to trust.
 *
 * COORDINATE CONVENTION
 * Blender is Z-up. glTF/three.js are Y-up. The exporter converts:
 *
 *     three.x =  blender.x
 *     three.y =  blender.z        (height)
 *     three.z = -blender.y        (depth; screen at z≈0, audience at +z)
 *
 * All values below are already in three.js space. Facing the screen is -Z.
 */

/** Interior shell of the auditorium, three.js space. */
export const ROOM = {
  width: 8.0,
  minX: -4.0,
  maxX: 4.0,
  /** screen wall at z≈0, back wall at z=8.5 */
  minZ: 0.0,
  maxZ: 8.5,
  floorY: 0.0,
  wallTopY: 4.6,
  /** underside of the coffered ceiling soffit */
  ceilingY: 4.35,
} as const;

/** Projection screen. 7.00 x 2.929 m, 2.39:1 CinemaScope. */
export const SCREEN = {
  width: 7.0,
  height: 2.929,
  aspect: 2.39,
  minX: -3.5,
  maxX: 3.5,
  bottomY: 0.62,
  topY: 3.549,
  centreY: 2.084,
  /** plane sits 20 mm off the wall */
  z: 0.02,
} as const;

/** Walkable floor levels. Row B, the rear platform and the cafe share 0.45. */
export const FLOORS = {
  front: { y: 0.0, minZ: 0.0, maxZ: 5.3 },
  rearPlatform: { y: 0.45, minZ: 5.3, maxZ: 8.5 },
  gateThreshold: { y: 0.45, minZ: 8.5, maxZ: 8.7 },
  cafe: { y: 0.45, minZ: 8.7, maxZ: 14.2 },
} as const;

/**
 * Aisle stairs, 3 risers of 0.15 m with 0.30 m treads.
 * There is NO centre aisle — these are the only way between levels.
 */
export const STAIRS = {
  risers: 3,
  riserHeight: 0.15,
  treadDepth: 0.3,
  /** present on both sides at these |x| bounds */
  innerX: 1.8,
  outerX: 4.0,
  minZ: 4.69,
  maxZ: 5.29,
} as const;

/** Doorway from the auditorium into the cafe. Glazed double doors. */
export const GATE = {
  minX: -1.3,
  maxX: 1.3,
  bottomY: 0.45,
  topY: 2.75,
  z: 8.6,
  clearWidth: 2.54,
  /** leaves swing into the cafe (+z) */
  openDegrees: 85,
} as const;

export const SPAWN = { x: 0, y: 0.45, z: 7.8 } as const;

/** Seated eye height above the seat's own floor, from the seated avatar mesh. */
export const SEATED_EYE_HEIGHT = 1.254;
/** Standing eye height above the floor, from the standing avatar mesh. */
export const STANDING_EYE_HEIGHT = 1.654;

/**
 * Head rotation limits for a seated viewer, degrees, relative to that seat's
 * neutral aim. A seated person turns their head, not their torso, so the
 * camera must be clamped — without this you can spin 360° in a chair, which
 * instantly breaks presence.
 *
 * 55° yaw is the comfortable seated head turn. Verified against the real
 * screen geometry: from every one of the 8 seats both screen edges fall
 * inside this cone, so nobody has to strain to see the picture.
 */
export const HEAD_LIMITS = {
  yaw: 55,
  pitchUp: 30,
  pitchDown: -35,
} as const;

export type SeatRow = 'A' | 'B';
export type SeatId = 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'B4';

export interface SeatView {
  /** three.js Y-rotation, radians, that aims the camera at screen centre */
  yaw: number;
  /** three.js X-rotation, radians, positive is up */
  pitch: number;
  /** absolute clamp range, radians, already offset by yaw */
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
}

export interface Seat {
  id: SeatId;
  row: SeatRow;
  /** chair origin on its floor */
  position: { x: number; y: number; z: number };
  /** camera position when seated */
  eye: { x: number; y: number; z: number };
  /** emissive floor pad you stand on to sit, 0.52 m in front of the chair */
  pad: { x: number; y: number; z: number };
  view: SeatView;
}

const D = Math.PI / 180;

/**
 * Per-seat neutral aim, computed from the measured screen centre.
 * Blender yaw is mirrored because +θ about three's +Y turns left while the
 * Blender figure was computed as "turn toward +x".
 */
const SEAT_AIM: Record<SeatId, { yawDeg: number; pitchDeg: number }> = {
  A1: { yawDeg: -16.77, pitchDeg: 10.06 },
  A2: { yawDeg: -5.74, pitchDeg: 10.45 },
  A3: { yawDeg: 5.74, pitchDeg: 10.45 },
  A4: { yawDeg: 16.77, pitchDeg: 10.06 },
  B1: { yawDeg: -12.32, pitchDeg: 3.44 },
  B2: { yawDeg: -4.16, pitchDeg: 3.51 },
  B3: { yawDeg: 4.16, pitchDeg: 3.51 },
  B4: { yawDeg: 12.32, pitchDeg: 3.44 },
};

const ROW_GEOMETRY: Record<SeatRow, { floorY: number; z: number }> = {
  A: { floorY: 0.0, z: 4.5 },
  B: { floorY: 0.45, z: 6.2 },
};

/** Seat pitch is 0.90 m. x is ordered left-to-right from the audience's view. */
export const SEAT_X = [-1.35, -0.45, 0.45, 1.35] as const;

function buildSeats(): Seat[] {
  const seats: Seat[] = [];
  for (const row of ['A', 'B'] as const) {
    const { floorY, z } = ROW_GEOMETRY[row];
    SEAT_X.forEach((x, i) => {
      const id = `${row}${i + 1}` as SeatId;
      const { yawDeg, pitchDeg } = SEAT_AIM[id];
      seats.push({
        id,
        row,
        position: { x, y: floorY, z },
        eye: { x, y: floorY + SEATED_EYE_HEIGHT, z },
        pad: { x, y: floorY, z: z - 0.52 },
        view: {
          yaw: yawDeg * D,
          pitch: pitchDeg * D,
          yawMin: (yawDeg - HEAD_LIMITS.yaw) * D,
          yawMax: (yawDeg + HEAD_LIMITS.yaw) * D,
          pitchMin: HEAD_LIMITS.pitchDown * D,
          pitchMax: HEAD_LIMITS.pitchUp * D,
        },
      });
    });
  }
  return seats;
}

export const SEATS: readonly Seat[] = buildSeats();

export const SEAT_IDS: readonly SeatId[] = SEATS.map((s) => s.id);

export function getSeat(id: SeatId): Seat {
  const seat = SEATS.find((s) => s.id === id);
  if (!seat) throw new Error(`Unknown seat id: ${id}`);
  return seat;
}

/** Radius around a seat pad within which the "Press E to sit" prompt shows. */
export const SIT_PROMPT_RADIUS = 1.0;

/** Clamp a yaw/pitch pair into a seat's allowed head cone. */
export function clampToSeatView(
  seat: Seat,
  yaw: number,
  pitch: number,
): { yaw: number; pitch: number } {
  const { yawMin, yawMax, pitchMin, pitchMax } = seat.view;
  return {
    yaw: Math.min(yawMax, Math.max(yawMin, yaw)),
    pitch: Math.min(pitchMax, Math.max(pitchMin, pitch)),
  };
}

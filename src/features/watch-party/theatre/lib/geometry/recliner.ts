import type { Mesh } from 'three';
import { SEATS } from '../layout';
import { GeometryBatcher } from './batch';
import { theatreMaterials } from './materials';

/*
  ─── LUXURY RECLINER ────────────────────────────────────────────────────────

  This replaces `chair.glb`. Proportions come from Blender's `Chair_A3`, a
  232-vertex modelled recliner, and are matched to within 3 mm on every axis:
  0.719 wide, 0.810 deep, 1.095 tall. The build is sliced from its silhouette read
  in 0.10 height bands:

      0.00-0.20   |x| 0.315   base, set back 0.108 from the front
      0.30-0.40   |x| 0.350   seat, reaching the very front edge
      0.50-0.70   |x| 0.359   armrest tops, the widest point
      0.90-1.00   |x| 0.315   upper back
      1.00-1.10   |x| 0.230   headrest, narrower cap

  Blender's five chair materials are CHAIR_Upholstery and CHAIR_Headrest (red
  leather, sheen 0.22), CHAIR_Frame (American walnut veneer), CHAIR_Metal (brass,
  metalness 1.0) and CHAIR_Dark. The brass is close enough to the stair nosing that
  `M.nosing` is reused rather than adding a material and the draw call behind it.

  Local frame: the occupant faces -Z, so FRONT is -0.34 and BACK is +0.47 about the
  seat origin, matching Blender's 0.810 depth. Blender's depth-from-front `d` maps
  to local z as -0.34 + d.
*/

export const CHAIR_FRONT = -0.34;
export const CHAIR_BACK = 0.47;
/** Half the 0.719 width. The armrest outer faces land exactly on this. */
export const CHAIR_HALF_WIDTH = 0.359;
/** Headrest crown. Blender measures 1.095; this build lands within a millimetre. */
export const CHAIR_HEIGHT = 1.0954;
/** Top of the seat cushion, which is what the seated avatar lift is measured to. */
export const CHAIR_SEAT_TOP = 0.42;

/**
 * Add one recliner to a batch, with its origin at the floor centre of the seat
 * footprint.
 */
export function buildRecliner(
  b: GeometryBatcher,
  ox: number,
  oy: number,
  oz: number,
): void {
  const M = theatreMaterials();

  const P = (
    mat: Parameters<GeometryBatcher['box']>[0],
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rot?: readonly [number, number, number],
  ) => b.box(mat, w, h, d, ox + x, oy + y, oz + z, rot);

  // ── Base. Recessed toe kick under a solid plinth, capped with a brass reveal,
  //    so the chair sits on a shadow line instead of meeting the carpet flat.
  //    Blender's base band is d 0.108-0.740, so it stops short of the back and the
  //    backrest overhangs it.
  const baseD = 0.632;
  const baseCz = CHAIR_FRONT + 0.108 + baseD / 2;
  P(M.seatWell, 0.58, 0.04, baseD - 0.04, 0, 0.02, baseCz);
  P(M.seatPlinth, 0.63, 0.13, baseD, 0, 0.105, baseCz);
  P(M.nosing, 0.645, 0.014, baseD + 0.01, 0, 0.178, baseCz);

  // ── Seat. Pan, a proud cushion, then a round roll at the knee edge. That roll
  //    matters: a square front edge is what makes a cushion read as a crate.
  P(M.seatFrame, 0.64, 0.115, 0.63, 0, 0.243, 0.015);
  P(M.seatCushion, 0.6, 0.12, 0.6, 0, 0.36, 0);
  b.cylinder(
    M.seatCushion,
    0.06,
    0.6,
    ox,
    oy + 0.36,
    oz + CHAIR_FRONT + 0.06,
    'x',
    16,
  );
  // Dark panel under the cushion overhang, so the gap over the base is not hollow.
  P(M.seatWell, 0.56, 0.09, 0.1, 0, 0.245, CHAIR_FRONT + 0.05);
  for (const px of [-0.295, 0.295]) {
    P(M.seatPiping, 0.014, 0.014, 0.58, px, 0.418, 0);
  }

  /*
    Backrest, tilted as ONE assembly.

    Tilting each block on its own axis does not work: boxes rotate about their own
    centres, so their faces stop lining up and the join shows as a hard step with a
    wedge of shadow in it. A single tilt is applied to every piece and the offsets
    are computed in the tilted frame, so the back stays one continuous surface.

    The tilt SIGN is worth recording. An earlier version used -0.13, and `place`
    derives z from `ly * sin(tilt)`, so every piece higher up moved toward -Z: the
    backrest leaned FORWARD over the occupant, the opposite of a recliner. Positive
    tilt rotates local +Y toward +Z, leaning the head end back, which is also what
    Blender shows — its backrest runs d 0.56-0.74 at knee height and d 0.64-0.80 at
    head height.
  */
  const tilt = 0.13;
  const by = 0.4;
  const bz = 0.3;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const place = (
    mat: Parameters<GeometryBatcher['box']>[0],
    w: number,
    h: number,
    d: number,
    lx: number,
    ly: number,
    lz: number,
  ) => {
    P(
      mat,
      w,
      h,
      d,
      lx,
      by + (ly * cosT - lz * sinT),
      bz + (ly * sinT + lz * cosT),
      [tilt, 0, 0],
    );
  };
  const placeCylinder = (
    mat: Parameters<GeometryBatcher['box']>[0],
    r: number,
    len: number,
    lx: number,
    ly: number,
    lz: number,
    seg: number,
  ) => {
    b.cylinder(
      mat,
      r,
      len,
      ox + lx,
      oy + by + (ly * cosT - lz * sinT),
      oz + bz + (ly * sinT + lz * cosT),
      'x',
      seg,
    );
  };

  place(M.seatFrame, 0.62, 0.62, 0.12, 0, 0.31, 0.06);
  // Walnut inset on the outer back, not a full-size panel. At 0.60 square it was
  // the brightest thing in the room from behind, and in a raked auditorium the
  // backs of the chairs are most of what you see.
  place(M.seatWood, 0.44, 0.42, 0.02, 0, 0.31, 0.118);
  place(M.seatBack, 0.56, 0.58, 0.05, 0, 0.3, -0.01);

  /*
    Channel fluting: five raised pads with stitched seams between them. This is
    the detail that reads as upholstery rather than a painted box, and it is why
    the backrest is built as pads on a face instead of one slab.
  */
  for (let i = 0; i < 5; i += 1) {
    const px = -0.224 + i * 0.112;
    place(M.seatBack, 0.1, 0.5, 0.03, px, 0.32, -0.045);
    if (i < 4) {
      place(M.seatPiping, 0.008, 0.48, 0.012, px + 0.056, 0.32, -0.055);
    }
  }

  placeCylinder(M.seatBack, 0.045, 0.52, 0, 0.07, -0.045, 14); // lumbar bolster
  placeCylinder(M.seatBack, 0.04, 0.5, 0, 0.55, -0.045, 14); // shoulder bolster

  for (const px of [-0.285, 0.285]) {
    place(M.seatPiping, 0.014, 0.58, 0.014, px, 0.31, -0.02);
  }

  // Headrest: Blender narrows it to 0.46 for the top 0.095, so it is a separate
  // cap rather than the top of the back.
  place(M.seatBack, 0.46, 0.15, 0.13, 0, 0.62, 0);
  // 0.6875, not 0.7. The piping is a ROTATED box, so its bounding extent in y is
  // 0.010*cos(tilt) + 0.135*sin(tilt) = 0.027 — nearly three times its thickness.
  // Placing it by thickness alone put the crown at 1.105 against Blender's 1.095.
  place(M.seatPiping, 0.46, 0.01, 0.135, 0, 0.6875, 0);
  place(M.seatPiping, 0.46, 0.01, 0.135, 0, 0.54, 0);

  /*
    Armrests. Blender's chair is 0.719 across with a 0.60 cushion, which leaves
    only 0.059 per arm — far too thin to sink a cup-holder into. So the side panel
    stays slim and the padded top is a 0.13 pad that overhangs INWARD over the
    cushion edge, which is how a real recliner is built and keeps the outer face on
    Blender's 0.359 line.

    The pad is a box with a rounded nose, not a cylinder along its whole length: a
    0.065-radius tube running the full 0.63 read as a bolster laid on the arm. Only
    the front end of an armrest is actually round.
  */
  for (const s of [-1, 1]) {
    const panelX = s * 0.3295;
    const padX = s * 0.294;
    const armZ = 0.05;
    const armD = 0.63;

    P(M.seatFrame, 0.059, 0.4, armD, panelX, 0.38, armZ);
    P(M.seatCushion, 0.13, 0.06, armD, padX, 0.61, armZ);
    b.cylinder(
      M.seatCushion,
      0.03,
      0.13,
      ox + padX,
      oy + 0.61,
      oz + armZ - armD / 2,
      'x',
      14,
    );
    P(M.seatWood, 0.12, 0.014, 0.22, padX, 0.647, 0.24);

    // Cup-holder sunk into the pad, brass ring round the lip.
    b.cylinder(
      M.nosing,
      0.042,
      0.01,
      ox + padX,
      oy + 0.638,
      oz - 0.14,
      'y',
      14,
    );
    b.cylinder(
      M.seatWell,
      0.036,
      0.06,
      ox + padX,
      oy + 0.61,
      oz - 0.14,
      'y',
      14,
    );

    // Recline control: a dark plate with one warm indicator.
    P(M.seatWell, 0.046, 0.008, 0.085, padX, 0.645, 0.05);
    P(M.ledWarm, 0.014, 0.006, 0.014, padX, 0.65, 0.05);
  }
}

/**
 * Build all ten recliners as one batch.
 *
 * Deliberately not one mesh per seat reused eight times: that would cost eight
 * draw calls per material instead of one, and the chairs never move. Seat pads are
 * the exception — they carry per-seat occupancy tint, so `TheatreSeating` renders
 * those separately.
 */
export function buildSeating(): Mesh[] {
  const b = new GeometryBatcher();
  for (const seat of SEATS) {
    buildRecliner(b, seat.position.x, seat.position.y, seat.position.z);
  }
  return b.build();
}

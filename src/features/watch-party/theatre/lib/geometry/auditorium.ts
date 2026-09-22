import type { Mesh } from 'three';
import { FLOORS, ROOM, SCREEN, STAIRS } from '../layout';
import { GeometryBatcher } from './batch';
import { theatreMaterials } from './materials';

/*
  The auditorium shell, generated rather than loaded.

  This replaces `room.glb` — a 2.3 MB Blender export whose blockout measured 307
  draw calls across 19 materials. Every surface here is a primitive placed from the
  same measurements, batched per material, so the whole room draws in about a dozen
  calls and ships as zero bytes.

  Dimensions come from `layout.ts`, which stays the single source of truth shared
  with the colliders and the seat anchors. Nothing in this file may hardcode a
  figure that exists there.

  COORDINATES  three.js, Y up, metres. The screen is at z ~ 0 and the audience at
  greater z, so facing the screen is -Z and yaw 0 looks at it.
*/

/**
 * Ceiling tray.
 *
 * `ROOM.ceilingY` (4.35) is the perimeter soffit; the recessed star panel sits
 * 0.30 above it. `ROOM.wallTopY` (4.6) is the nominal wall height the colliders
 * use — the visual wall runs a little past it so no hairline gap shows at the top
 * of the tray reveal.
 */
const TRAY_Y = ROOM.ceilingY + 0.3;
const TRAY_INSET_X = 1.05;
const TRAY_INSET_Z = 1.05;

/** Inner face of the side walls, and the pilaster/panel runs along them. */
const WALL_FACE = 3.94;
const PILASTER_Z = [1.7, 3.6, 5.5, 7.4] as const;
const PANEL_Z = [2.65, 4.55, 6.45] as const;

/** Inner face of the rear wall. The Blender equivalent face is its 8.50. */
const REAR_FACE = ROOM.maxZ - 0.12;
/** Blender's batten and felt head height on the rear wall. */
const BATTEN_TOP = 4.12;

/**
 * Front speakers: left, centre, right.
 *
 * Three cabinets, not five. Blender carries two corner subwoofers (`SPK_Sub_L/R`)
 * and six wall surrounds as well, but a screening room reads correctly off the LCR
 * alone and the corner subs were the two boxes with no visible purpose.
 *
 * X is fitted to this room's wall build rather than copied from Blender, whose
 * `SPK_Front_R` reaches 3.940 while its own `Plinth_R_0` occupies 3.900-4.000 —
 * the reference cabinet is buried in its own skirting. Here the plinth mouldings
 * stand proud of the 3.94 wall face to x 3.84, so 3.84 is the real obstruction.
 * The screen ends at 3.50. The cabinet sits in that slot: 0.32 wide, 3.52-3.84.
 */
const SPK_X = 3.68;
const SPK_W = 0.32;
const SPK_FRONT = 0.46;
const SPK_TOP = 2.4;

/** Centre channel, under the picture. Blender SPK_Center, 1.5 wide, 0.16-0.48. */
const CTR_FRONT = 0.42;
const CTR_Y = 0.32;

/**
 * Build the auditorium.
 *
 * Returns one mesh per material. The caller owns them and must pass them to
 * `disposeBuilt` on unmount.
 */
export function buildAuditorium(): Mesh[] {
  const M = theatreMaterials();
  const b = new GeometryBatcher();

  const platformY = FLOORS.rearPlatform.y;
  const platformZ = FLOORS.rearPlatform.minZ;

  // ─── FLOORS ────────────────────────────────────────────────────────────────
  b.box(M.floor, ROOM.width, 0.3, platformZ, 0, -0.15, platformZ / 2);
  b.box(
    M.floor,
    ROOM.width,
    0.3 + platformY,
    ROOM.maxZ - platformZ,
    0,
    (platformY - 0.3) / 2,
    platformZ + (ROOM.maxZ - platformZ) / 2,
  );

  /*
    Rectangular border tape inlaid into the carpet.

    Cheap, and it does a lot: a single flat carpet colour over 8 x 8.5 m reads as
    a void with no sense of scale, and these give the eye something to measure the
    room against.
  */
  const inlayRing = (
    halfX: number,
    zNear: number,
    zFar: number,
    y: number,
  ): void => {
    const t = 0.05;
    b.box(M.floorInlay, halfX * 2, 0.006, t, 0, y, zNear);
    b.box(M.floorInlay, halfX * 2, 0.006, t, 0, y, zFar);
    b.box(M.floorInlay, t, 0.006, zFar - zNear, -halfX, y, (zNear + zFar) / 2);
    b.box(M.floorInlay, t, 0.006, zFar - zNear, halfX, y, (zNear + zFar) / 2);
  };
  inlayRing(3.6, 0.4, 4.5, 0.004);
  inlayRing(3.45, 0.55, 4.35, 0.004);
  inlayRing(2.9, 1.1, 3.8, 0.004);
  inlayRing(3.6, 5.7, 8.1, platformY + 0.004);
  inlayRing(3.45, 5.85, 7.95, platformY + 0.004);

  /*
    ─── CEILING: stepped tray with a recessed star panel ─────────────────────

    A single flat plane read as a lid. Real starlight ceilings sit in a recess: the
    perimeter drops to a soffit, steps up through a shadow gap, and the star panel
    is the highest and darkest surface. That step is what the cove washes, and what
    stops the stars looking painted on.
  */
  const soffitSpanZ = ROOM.maxZ - 2 * TRAY_INSET_Z;
  const trayHalfW = ROOM.width / 2 - TRAY_INSET_X;

  for (const side of [-1, 1]) {
    b.box(
      M.moulding,
      TRAY_INSET_X,
      0.22,
      ROOM.maxZ,
      side * (ROOM.width / 2 - TRAY_INSET_X / 2),
      ROOM.ceilingY + 0.11,
      ROOM.maxZ / 2,
    );
    // Inner reveal — the face the cove grazes; this is what sells the recess.
    b.box(
      M.trayReveal,
      0.03,
      TRAY_Y - ROOM.ceilingY,
      soffitSpanZ,
      side * trayHalfW,
      (ROOM.ceilingY + TRAY_Y) / 2,
      ROOM.maxZ / 2,
    );
    // Hidden uplight tucked in the channel.
    b.box(
      M.glowCove,
      0.04,
      0.03,
      soffitSpanZ - 0.2,
      side * (trayHalfW - 0.05),
      ROOM.ceilingY + 0.24,
      ROOM.maxZ / 2,
    );
  }
  for (const z of [TRAY_INSET_Z / 2, ROOM.maxZ - TRAY_INSET_Z / 2]) {
    b.box(
      M.moulding,
      ROOM.width - 2 * TRAY_INSET_X,
      0.22,
      TRAY_INSET_Z,
      0,
      ROOM.ceilingY + 0.11,
      z,
    );
  }
  for (const z of [TRAY_INSET_Z, ROOM.maxZ - TRAY_INSET_Z]) {
    b.box(
      M.trayReveal,
      ROOM.width - 2 * TRAY_INSET_X,
      TRAY_Y - ROOM.ceilingY,
      0.03,
      0,
      (ROOM.ceilingY + TRAY_Y) / 2,
      z,
    );
  }
  b.box(
    M.ceiling,
    ROOM.width - 2 * TRAY_INSET_X,
    0.2,
    soffitSpanZ,
    0,
    TRAY_Y + 0.1,
    ROOM.maxZ / 2,
  );

  // ─── WALLS ─────────────────────────────────────────────────────────────────
  for (const side of [-1, 1]) {
    b.box(
      M.wall,
      0.12,
      TRAY_Y + 0.2,
      ROOM.maxZ,
      side * (ROOM.width / 2),
      (TRAY_Y + 0.2) / 2,
      ROOM.maxZ / 2,
    );
  }

  /*
    Screen wall, built as a surround so the picture sits in a black frame.

    The aperture itself is left empty: `TheatreScreen` owns the video plane, and
    this must not put anything in front of it.
  */
  b.box(
    M.dark,
    ROOM.width,
    TRAY_Y - SCREEN.topY,
    0.12,
    0,
    (SCREEN.topY + TRAY_Y) / 2,
    0.06,
  );
  b.box(M.dark, ROOM.width, SCREEN.bottomY, 0.12, 0, SCREEN.bottomY / 2, 0.06);
  const sideW = ROOM.width / 2 - SCREEN.width / 2;
  for (const side of [-1, 1]) {
    b.box(
      M.dark,
      sideW,
      SCREEN.height,
      0.12,
      side * (SCREEN.width / 2 + sideW / 2),
      SCREEN.centreY,
      0.06,
    );
  }

  // Rear wall, solid. Nothing lies behind the auditorium.
  b.box(M.wall, ROOM.width, TRAY_Y, 0.12, 0, TRAY_Y / 2, ROOM.maxZ - 0.06);

  // ─── WALL DETAIL: pilasters, frames, crown, plinth, sconces ────────────────
  /*
    Everything on the walls is referenced to the floor BENEATH it, not to datum.

    The room has two levels and the wall detail crosses the step: pilasters at
    z 5.5 and 7.4 and the framed panel at 6.45 all stand on the rear platform,
    0.45 up. Basing them on datum buried their feet under it — the panel's lower
    rail sat 0.73 above the platform instead of 1.18, and the pilaster bases
    disappeared into the deck.
  */
  const floorAt = (z: number): number =>
    z >= platformZ ? platformY : ROOM.floorY;

  for (const side of [-1, 1]) {
    const f = WALL_FACE;

    for (const pz of PILASTER_Z) {
      /*
        The capital is a datum: it stays at 3.62 whichever floor the pilaster
        stands on, so a pilaster on the platform is simply shorter. Lifting the
        whole thing instead would push the capitals out of line, and the crown
        mouldings run straight through at a single height.
      */
      const base = floorAt(pz) + 0.2;
      const capitalY = 3.62;
      const shaftH = capitalY - base;
      const shaftY = (base + capitalY) / 2;

      // Back plate, then a proud shaft, which is what gives the stepped edge.
      b.box(M.pilaster, 0.1, shaftH, 0.62, f * side - side * 0.05, shaftY, pz);
      b.box(M.pilaster, 0.08, shaftH, 0.48, f * side - side * 0.1, shaftY, pz);
      b.box(M.moulding, 0.1, 0.07, 0.62, f * side - side * 0.075, 3.655, pz);
      b.box(M.moulding, 0.1, 0.06, 0.7, f * side - side * 0.08, 3.72, pz);
      // Sconce: body plus an up-glow and a down-glow slot. Mounted relative to
      // its own floor so it stays at eye height on both levels.
      const sconceY = floorAt(pz) + 2.21;
      b.box(M.sconce, 0.08, 0.1, 0.3, f * side - side * 0.17, sconceY, pz);
      b.box(
        M.glowSconce,
        0.07,
        0.025,
        0.26,
        f * side - side * 0.17,
        sconceY + 0.075,
        pz,
      );
      b.box(
        M.glowSconce,
        0.07,
        0.025,
        0.26,
        f * side - side * 0.17,
        sconceY - 0.062,
        pz,
      );
    }

    for (const fz of PANEL_Z) {
      const t = 0.035;
      const dp = 0.055;
      const y0 = floorAt(fz);
      b.box(M.moulding, dp, t, 0.9, f * side - side * 0.017, y0 + 3.02, fz);
      b.box(M.moulding, dp, t, 0.9, f * side - side * 0.017, y0 + 1.18, fz);
      b.box(
        M.moulding,
        dp,
        1.79,
        t,
        f * side - side * 0.017,
        y0 + 2.1,
        fz - 0.45,
      );
      b.box(
        M.moulding,
        dp,
        1.79,
        t,
        f * side - side * 0.017,
        y0 + 2.1,
        fz + 0.45,
      );
    }

    /*
      Plinth in two runs, one per floor level, so the skirting line steps with the
      platform instead of vanishing into it. The crown is unaffected — it is
      referenced to the ceiling, which does not step.
    */
    for (const level of [
      { y: ROOM.floorY, z0: 0, z1: platformZ },
      { y: platformY, z0: platformZ, z1: ROOM.maxZ },
    ]) {
      const depth = level.z1 - level.z0;
      const cz = (level.z0 + level.z1) / 2;
      b.box(
        M.moulding,
        0.1,
        0.12,
        depth,
        f * side - side * 0.05,
        level.y + 0.06,
        cz,
      );
      b.box(
        M.moulding,
        0.06,
        0.08,
        depth,
        f * side - side * 0.03,
        level.y + 0.16,
        cz,
      );
    }

    // Crown, straight through at a single height.
    b.box(
      M.moulding,
      0.05,
      0.09,
      ROOM.maxZ,
      f * side - side * 0.025,
      4.105,
      ROOM.maxZ / 2,
    );
    b.box(
      M.moulding,
      0.13,
      0.09,
      ROOM.maxZ,
      f * side - side * 0.065,
      4.195,
      ROOM.maxZ / 2,
    );
    b.box(
      M.moulding,
      0.07,
      0.11,
      ROOM.maxZ,
      f * side - side * 0.035,
      4.295,
      ROOM.maxZ / 2,
    );
  }

  buildSpeakers(b);
  buildStairs(b, platformY, platformZ);
  buildRearWall(b, platformY);

  return b.build();
}

/**
 * One speaker driver: chassis ring, cone set back inside it, dust cap proud at
 * the centre.
 *
 * Three discs is the minimum that reads as a driver rather than a dot — the ring
 * gives it a rim to catch a highlight, the recessed cone gives it depth, and the
 * cap stops the middle looking hollow. `z` is the baffle plane it mounts on.
 */
function driver(
  b: GeometryBatcher,
  r: number,
  x: number,
  y: number,
  z: number,
  withCap = true,
): void {
  const M = theatreMaterials();
  b.cylinder(M.railMetal, r, 0.016, x, y, z + 0.01);
  b.cylinder(M.grille, r * 0.84, 0.02, x, y, z + 0.004);
  if (withCap) b.cylinder(M.speakerDark, r * 0.3, 0.012, x, y, z + 0.014);
}

/** Grille mounting frame round a baffle, as four thin metal strips. */
function grilleFrame(
  b: GeometryBatcher,
  cx: number,
  cy: number,
  w: number,
  h: number,
  z: number,
): void {
  const M = theatreMaterials();
  const t = 0.015;
  b.box(M.railMetal, w, t, t, cx, cy + h / 2, z);
  b.box(M.railMetal, w, t, t, cx, cy - h / 2, z);
  b.box(M.railMetal, t, h, t, cx - w / 2, cy, z);
  b.box(M.railMetal, t, h, t, cx + w / 2, cy, z);
}

function buildSpeakers(b: GeometryBatcher): void {
  const M = theatreMaterials();

  for (const side of [-1, 1]) {
    const x = side * SPK_X;

    // Plinth, cabinet, and a darker baffle panel set proud of it. The plinth is
    // proud in Z only — widening it as usual would push it into the skirting.
    b.box(M.speakerDark, SPK_W, 0.05, 0.4, x, 0.025, 0.29);
    b.box(
      M.speaker,
      SPK_W,
      SPK_TOP - 0.05,
      0.34,
      x,
      (0.05 + SPK_TOP) / 2,
      0.29,
    );
    b.box(
      M.speakerDark,
      SPK_W - 0.04,
      SPK_TOP - 0.15,
      0.02,
      x,
      (0.15 + SPK_TOP) / 2,
      SPK_FRONT,
    );

    /*
      Three-way, laid out as a real tower: tweeter at the top near ear height for
      a seated audience, midrange under it, then the woofers stacked down the
      cabinet. All of it inside Blender's 0.70-2.40 acoustic band.
    */
    driver(b, 0.034, x, 2.24, SPK_FRONT);
    driver(b, 0.058, x, 2.04, SPK_FRONT);
    driver(b, 0.105, x, 1.72, SPK_FRONT);
    driver(b, 0.105, x, 1.42, SPK_FRONT);
    driver(b, 0.105, x, 1.12, SPK_FRONT);
    b.cylinder(M.speakerDark, 0.048, 0.02, x, 0.82, SPK_FRONT);

    grilleFrame(
      b,
      x,
      (0.15 + SPK_TOP) / 2,
      SPK_W - 0.04,
      SPK_TOP - 0.15,
      SPK_FRONT + 0.016,
    );

    // Badge, and Blender's SPK_LEDs standby light.
    b.box(M.railMetal, 0.1, 0.022, 0.008, x, 0.56, SPK_FRONT + 0.012);
    b.box(M.ledWarm, 0.045, 0.012, 0.008, x, 0.42, SPK_FRONT + 0.012);
  }

  // Centre channel. Horizontal two-and-a-half way, drivers symmetric about the
  // tweeter so the image sits centred on the screen rather than off to one side.
  b.box(M.speakerDark, 1.5, 0.16, 0.3, 0, 0.08, 0.27);
  b.box(M.speaker, 1.5, 0.32, 0.3, 0, CTR_Y, 0.27);
  b.box(M.speakerDark, 1.44, 0.28, 0.02, 0, CTR_Y, CTR_FRONT);
  for (const dx of [-0.48, 0.48]) driver(b, 0.092, dx, CTR_Y, CTR_FRONT);
  for (const dx of [-0.22, 0.22]) driver(b, 0.054, dx, CTR_Y, CTR_FRONT);
  driver(b, 0.032, 0, CTR_Y, CTR_FRONT, false);
  grilleFrame(b, 0, CTR_Y, 1.44, 0.28, CTR_FRONT + 0.016);
  b.box(M.ledWarm, 0.045, 0.012, 0.008, 0.68, CTR_Y, CTR_FRONT + 0.012);
}

/*
  ─── STAIRS ─────────────────────────────────────────────────────────────────

  Blender's run is TWO steps, not three: surfaces at 0.150 and 0.300 spanning
  z 4.69-4.99 and 4.99-5.29, with the platform edge at 5.30 serving as the third
  rise up to 0.450.

  Worth recording, because it was wrong in the version this replaces and the same
  mistake is easy to repeat: that build made three treads and put each one's top
  at `i * riserHeight + 0.04` — the FOOT of its own riser rather than its head — so
  every tread sat 0.11 low while the floor-height function returned the head
  height. You walked in the air above the steps.

  Blender wraps the run in one carpet solid, so the steps are solid boxes here too:
  step 2 spans the full height and step 1 occludes its lower part, which leaves
  exactly the right riser face showing without needing separate pieces.
*/
function buildStairs(
  b: GeometryBatcher,
  platformY: number,
  platformZ: number,
): void {
  const M = theatreMaterials();

  /*
    Surface height, riser front face, and nosing front, for each of the three
    rises. The last is the platform itself, and it needs `z` and `nz` to differ:
    Blender's Step_Riser occupies 5.290-5.310 while the platform surface starts at
    5.300, so the marker sits off the riser face and the nosing lands on the deck.
  */
  const steps = [
    { y: STAIRS.riserHeight, z: STAIRS.minZ, nz: STAIRS.minZ },
    {
      y: STAIRS.riserHeight * 2,
      z: STAIRS.minZ + STAIRS.treadDepth,
      nz: STAIRS.minZ + STAIRS.treadDepth,
    },
    { y: platformY, z: platformZ - 0.01, nz: platformZ },
  ];

  // Face of the step up to the rear platform — the stairs' third rise.
  b.box(M.riser, ROOM.width, platformY, 0.02, 0, platformY / 2, platformZ);
  // Blender only nosings the platform edge across the stair runs; it is carried
  // the full width here because the edge itself is full width and needs the line.
  b.box(
    M.nosing,
    ROOM.width,
    0.012,
    0.06,
    0,
    platformY + 0.006,
    platformZ + 0.02,
  );

  for (const side of [-1, 1]) {
    const cx = (side * (STAIRS.innerX + STAIRS.outerX)) / 2;
    const sw = STAIRS.outerX - STAIRS.innerX;

    // Two solid carpeted steps.
    for (const i of [0, 1]) {
      const top = steps[i].y;
      b.box(
        M.floor,
        sw,
        top,
        STAIRS.treadDepth,
        cx,
        top / 2,
        steps[i].z + STAIRS.treadDepth / 2,
      );
    }

    for (const st of steps) {
      // Brass nosing lipping the front edge, 0.06 deep and 0.012 proud.
      b.box(M.nosing, sw, 0.012, 0.06, cx, st.y + 0.006, st.nz + 0.03);
      // Step marker recessed into the riser face just under the nosing, inset
      // 0.1 from each side. Blender models it as a flat quad 0.004 off the face;
      // as a box it is given 0.008 of depth centred on that plane.
      b.box(
        M.glowStep,
        sw - 0.2,
        0.025,
        0.008,
        cx,
        st.y - 0.0475,
        st.z - 0.004,
      );
    }
  }
}

/*
  ─── REAR WALL ──────────────────────────────────────────────────────────────

  Ported from the Blender scene's BW_* assembly: felt panel, 32 battens on 0.26
  centres with the middle nine cut short, a recessed niche with a lit border, a
  rail on two brackets, and rail/skirt/cove LED strips.

  Blender is Z-up with the room running toward -Y; this file is Y-up with the room
  running toward +Z. The mapping is (bx, by, bz) -> (bx, bz, -by), which is why
  every height below is Blender's Z verbatim.

  Three deliberate departures:
    - Blender's room is 8.6 wide against this one's 8.0, so full-width pieces are
      clamped to ROOM.width and the outermost batten each side falls outside.
    - Blender puts the skirt LED at 0.14 and the batten feet at 0.22, both buried
      under this room's 0.45 rear platform. They are lifted to sit on it.
    - Blender's niche border is BW_GreenGlow and its niche signage is
      NEO_ExitSign, both green. The border is warm here and the signage dropped.
*/
function buildRearWall(b: GeometryBatcher, platformY: number): void {
  const M = theatreMaterials();
  const accent = M.ledWarm;

  b.box(
    M.felt,
    ROOM.width,
    ROOM.ceilingY - platformY,
    0.02,
    0,
    (platformY + ROOM.ceilingY) / 2,
    REAR_FACE - 0.01,
  );

  /*
    32 battens on 0.26 centres, from Blender's x = -4.0975 + i * 0.26.

    The middle nine (12-20) are short and stop above the niche. That gap is the
    whole composition: it is what makes the niche read as set into the batten field
    rather than hung in front of it. Blender stops those nine at 2.85, which is
    below the top of the niche border at 2.94 — so their cut ends show as a row of
    stubs inside the frame. They start at the border here instead.
  */
  for (let i = 0; i < 32; i += 1) {
    const x = -4.0975 + i * 0.26;
    if (x < ROOM.minX + 0.1 || x > ROOM.maxX - 0.1) continue;
    const short = i >= 12 && i <= 20;
    const y0 = short ? 2.94 : platformY;
    b.box(
      M.batten,
      0.085,
      BATTEN_TOP - y0,
      0.075,
      x,
      (y0 + BATTEN_TOP) / 2,
      REAR_FACE - 0.0575,
    );
  }

  // Niche: a recessed plate inside a lit border, centred over the rear aisle.
  b.box(M.niche, 2.1, 0.98, 0.08, 0, 2.37, REAR_FACE - 0.06);
  for (const s of [-1, 1]) {
    b.box(accent, 0.06, 1.14, 0.04, s * 1.11, 2.37, REAR_FACE - 0.1);
  }
  b.box(accent, 2.28, 0.06, 0.04, 0, 2.91, REAR_FACE - 0.1);
  b.box(accent, 2.28, 0.06, 0.04, 0, 1.83, REAR_FACE - 0.1);

  // Rail across the back of the platform, on two brackets, washed underneath.
  b.box(M.railMetal, 6.6, 0.07, 0.16, 0, 1.015, REAR_FACE - 0.08);
  b.box(M.ledWarm, 6.48, 0.03, 0.06, 0, 0.955, REAR_FACE - 0.09);
  for (const s of [-1, 1]) {
    // Blender's bracket spans 0.16-0.98; lifted to start at the platform.
    b.box(
      M.railMetal,
      0.08,
      0.98 - platformY,
      0.1,
      s * 3.06,
      (platformY + 0.98) / 2,
      REAR_FACE - 0.08,
    );
  }

  // Skirt and cove strips, both clamped to this room's width.
  b.box(
    M.ledWarm,
    ROOM.width - 0.2,
    0.04,
    0.04,
    0,
    platformY + 0.05,
    REAR_FACE - 0.05,
  );
  b.box(M.ledWarm, ROOM.width - 0.2, 0.04, 0.03, 0, 3.68, REAR_FACE - 0.025);
}

/**
 * Figures the collider module and the geometry tests assert against.
 *
 * Only what is genuinely consumed — a metrics bag that accretes unused fields
 * stops being a contract and becomes a place for stale numbers to hide.
 */
export const AUDITORIUM_METRICS = {
  trayY: TRAY_Y,
  wallFace: WALL_FACE,
  rearFace: REAR_FACE,
  battenTop: BATTEN_TOP,
  speakerX: SPK_X,
  speakerWidth: SPK_W,
} as const;

/**
 * How far into the room the rear wall's detail reaches.
 *
 * The frontmost thing on that wall is the handrail: 0.16 deep, centred 0.08 off
 * the 8.38 inner face, so its face is at 8.22 — a quarter of a metre proud of the
 * wall. `TheatreColliders` stops the player here rather than at `ROOM.maxZ`,
 * because a collider on the wall plane lets you walk through the rail, the
 * brackets and the battens to reach it.
 */
export const REAR_DETAIL_FACE_Z = REAR_FACE - 0.08 - 0.16 / 2;

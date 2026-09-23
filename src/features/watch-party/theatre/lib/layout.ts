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
  width: 9.6,
  minX: -4.8,
  maxX: 4.8,
  /** screen wall at z≈0, back wall at z=8.5 */
  minZ: 0.0,
  maxZ: 8.5,
  floorY: 0.0,
  wallTopY: 4.6,
  /** underside of the coffered ceiling soffit */
  ceilingY: 4.35,
} as const;

/**
 * Projection screen. 7.40 x 3.096 m, 2.39:1 CinemaScope.
 *
 * WIDTH IS SET BY THE WORST SEAT, NOT BY THE WALL.
 *
 * The wall would take 8.48 m — that is where the speaker towers start, and an
 * earlier pass sized it exactly there. Every framing guarantee in
 * `tests/.../seat-framing.test.ts` broke: the front-row outer seats crop the
 * picture at narrow window aspects, 16:9 needed a 77° lens against the 65° bar,
 * and 4:3 started dollying the view backwards.
 *
 * Solved by sweeping width against the real `seatCamera` for all ten seats at
 * every aspect from 21:9 to 0.5. 7.40 m is the largest that passes; at 7.41 m the
 * worst seat (A1) exceeds the 65° limit. It is deliberately at that edge — A1
 * needs 63.8° at 16:9, so there is about 1.2° of headroom and no more.
 *
 * Five seats a row is what tightened this. The outer pair moved from |x| 1.8 to
 * 2.4, so they sit further off axis and frame the screen at a wider angle than any
 * seat did before — the limit got harder even though the room got wider.
 *
 * `bottomY` 0.52 rather than the old 0.62: the screen is 0.167 m taller than it
 * was, and dropping the foot keeps `centreY` at 2.068 (against 2.084 before) so a
 * seated viewer's sightline is unchanged. It still clears the centre channel,
 * whose cabinet tops out at 0.48.
 */
export const SCREEN = {
  width: 7.4,
  height: 3.096,
  aspect: 2.39,
  minX: -3.7,
  maxX: 3.7,
  bottomY: 0.52,
  topY: 3.616,
  centreY: 2.068,
  /** plane sits 20 mm off the wall */
  z: 0.02,
} as const;

/**
 * Walkable floor levels. Row B shares the rear platform at 0.45.
 *
 * The cafe and its gate threshold used to continue this to z = 14.2. Both are
 * gone: the auditorium is now generated in code (`lib/geometry`), and the cafe was
 * a second room reached through glazed doors whose transmissive glass forced a
 * whole extra scene pass — measured at 0.36 ms against 12.92 ms for a single pane.
 * The rear wall is solid.
 */
export const FLOORS = {
  front: { y: 0.0, minZ: 0.0, maxZ: 5.3 },
  rearPlatform: { y: 0.45, minZ: 5.3, maxZ: 8.5 },
} as const;

/**
 * Aisle stairs, 3 risers of 0.15 m with 0.30 m treads.
 * There is NO centre aisle — these are the only way between levels.
 *
 * 1.4 m per run, with the outer edge flush to the side wall at 4.8 m. Both bounds
 * moved with the room: at five seats a row the outer chair edge reaches 2.76 m, so
 * an inner edge at the old 2.8 m would have left the end seats overhanging the run
 * by almost nothing and the aisle unwalkable. 3.4 m gives 0.64 m of clearance.
 *
 * `minZ`/`maxZ` bound the whole run. Only TWO of the three rises are stair
 * geometry — surfaces at 0.15 and 0.30 — because the rear platform edge at
 * z = 5.3 is itself the third. `lib/geometry/auditorium.ts` builds it that way.
 */
export const STAIRS = {
  risers: 3,
  riserHeight: 0.15,
  treadDepth: 0.3,
  /** present on both sides at these |x| bounds */
  innerX: 3.4,
  outerX: 4.8,
  minZ: 4.69,
  maxZ: 5.29,
} as const;

/**
 * Where a player appears when they enter 3D.
 *
 * `SPAWN` is the nominal point — rear platform, on the centreline, facing the
 * screen. Use `spawnFor(userId)` for an actual player: everyone arriving on the
 * same square metre stacks them inside one another, and because avatars carry no
 * colliders nothing pushes them apart again.
 */
export const SPAWN = { x: 0, y: 0.45, z: 7.8 } as const;

/**
 * Spawn slots across the rear platform, widest first from the centre.
 *
 * 0.8 m apart, which clears the 0.56 m player capsule with margin. Ordered
 * outward from the middle so the first arrivals get the centre and the room fills
 * symmetrically rather than from one wall.
 *
 * All eight sit at `SPAWN.z`, behind Row B (which ends at z 6.67) and well clear
 * of the stair runs (z 4.69-5.29), so nobody spawns inside furniture.
 */
const SPAWN_SLOT_X = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.2] as const;

/**
 * A player's spawn point, derived from their id.
 *
 * Deterministic so a reconnect returns you to the same slot rather than teleporting
 * you across the platform, and so two clients agree on where a given person
 * started. Hash-derived rather than index-derived on purpose: an index into the
 * member list would shift every existing player's slot each time someone joined.
 *
 * Collisions are possible and harmless — two people share a slot and overlap,
 * which is what ALL eight did before this existed.
 */
export function spawnFor(userId: string): { x: number; y: number; z: number } {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const slot = Math.abs(hash) % SPAWN_SLOT_X.length;
  return { x: SPAWN_SLOT_X[slot], y: SPAWN.y, z: SPAWN.z };
}

/** Number of distinct spawn slots, for tests and capacity checks. */
export const SPAWN_SLOT_COUNT = SPAWN_SLOT_X.length;

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
 * screen geometry: from every one of the 10 seats both screen edges fall
 * inside this cone, so nobody has to strain to see the picture.
 */
export const HEAD_LIMITS = {
  yaw: 55,
  pitchUp: 30,
  pitchDown: -35,
} as const;

export type SeatRow = 'A' | 'B';
export type SeatId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5';

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
  /** Screen framing from this seat's eye, for the per-seat FOV. */
  framing: SeatFraming;
}

const D = Math.PI / 180;

/**
 * Aim and field of view for a seat, computed from the measured screen rather
 * than tabulated.
 *
 * This used to be a hand-written `SEAT_AIM` table of eight yaw/pitch pairs. The
 * numbers were right for a 0.90 m seat pitch and became silently wrong the
 * moment the seats moved — nothing referenced the screen, so nothing complained.
 * Deriving both from `SCREEN` means any change to seat spacing, row depth, eye
 * height or screen size stays correct with no second edit.
 *
 * The FOV half is what keeps the picture uncropped. A fixed 60 degree vertical
 * FOV is fine dead centre, but an outer seat sits 1.8 m off axis and 4.5 m back,
 * so the far screen edge is a much wider angle than the near one, and the window
 * can be any shape the user drags it to. A tall narrow window has a NARROW
 * horizontal FOV for the same vertical one, which crops the sides of a 2.39:1
 * screen first. So the horizontal requirement is converted into the vertical FOV
 * three.js actually takes, given the live aspect ratio.
 */
export interface SeatFraming {
  /** three.js Y-rotation, radians, that aims the camera at screen centre. */
  yaw: number;
  /** three.js X-rotation, radians, positive is up. */
  pitch: number;
  /** Half-angle, radians, from the aim axis to the widest screen corner. */
  halfAngleH: number;
  halfAngleV: number;
}

/**
 * Widest horizontal and vertical half-angles from an eye point to the screen,
 * measured about the axis that points at screen centre.
 */
function frameScreenFrom(eye: {
  x: number;
  y: number;
  z: number;
}): SeatFraming {
  // Screen centre. The screen plane is at z = SCREEN.z, audience at greater z,
  // so the view direction is -Z and depth is positive.
  const depth = eye.z - SCREEN.z;
  const yaw = Math.atan2(-(0 - eye.x), depth);
  const pitch = Math.atan2(SCREEN.centreY - eye.y, depth);

  // Every corner, so an off-axis seat is framed by whichever is worst.
  let halfAngleH = 0;
  let halfAngleV = 0;
  for (const cx of [SCREEN.minX, SCREEN.maxX]) {
    const a = Math.abs(
      Math.atan2(cx - eye.x, depth) - Math.atan2(-eye.x, depth),
    );
    if (a > halfAngleH) halfAngleH = a;
  }
  for (const cy of [SCREEN.bottomY, SCREEN.topY]) {
    const a = Math.abs(
      Math.atan2(cy - eye.y, depth) - Math.atan2(SCREEN.centreY - eye.y, depth),
    );
    if (a > halfAngleV) halfAngleV = a;
  }
  return { yaw, pitch, halfAngleH, halfAngleV };
}

/** Breathing room around the picture so it is framed, not jammed to the edges. */
export const SCREEN_FRAMING_MARGIN = 1.08;

/** Never go below this: a narrow FOV on a near seat looks like a zoom lens. */
export const SEAT_FOV_MIN_DEG = 55;
/** Nor above it: past this the room visibly distorts at the corners. */
export const SEAT_FOV_MAX_DEG = 82;

/**
 * Hard ceiling, used only when widening the lens is the last way to avoid
 * cropping the film. Ugly, but it beats losing the edges of the picture.
 */
export const SEAT_FOV_ABSOLUTE_MAX_DEG = 100;

/** Furthest the view may slide back from the seat to fit the screen, metres. */
export const SEAT_MAX_DOLLY = 2.2;

/** Widest half-angles to the screen from a point `extraDepth` behind the eye. */
function halfAnglesAt(
  eye: { x: number; y: number; z: number },
  extraDepth: number,
): { h: number; v: number } {
  const depth = eye.z - SCREEN.z + extraDepth;
  const centreH = Math.atan2(-eye.x, depth);
  const centreV = Math.atan2(SCREEN.centreY - eye.y, depth);
  let h = 0;
  let v = 0;
  for (const cx of [SCREEN.minX, SCREEN.maxX]) {
    const a = Math.abs(Math.atan2(cx - eye.x, depth) - centreH);
    if (a > h) h = a;
  }
  for (const cy of [SCREEN.bottomY, SCREEN.topY]) {
    const a = Math.abs(Math.atan2(cy - eye.y, depth) - centreV);
    if (a > v) v = a;
  }
  return { h, v };
}

/** Vertical FOV, radians, that contains both half-angles at `aspect`. */
function fovForHalfAngles(
  half: { h: number; v: number },
  aspect: number,
): number {
  const safeAspect = aspect > 0.01 ? aspect : 0.01;
  const fromV = 2 * half.v * SCREEN_FRAMING_MARGIN;
  // Inverse of three.js's own hFov = 2*atan(tan(vFov/2) * aspect).
  const fromH =
    2 * Math.atan(Math.tan(half.h * SCREEN_FRAMING_MARGIN) / safeAspect);
  return Math.max(fromV, fromH);
}

export interface SeatCamera {
  /** Vertical FOV in degrees to assign to the camera. */
  fovDeg: number;
  /** Metres to slide the view back along its aim axis, away from the screen. */
  dolly: number;
}

/**
 * Camera settings that show the WHOLE screen from a seat, at a live aspect ratio.
 *
 * Two knobs, used in order. Widening the FOV is free and invisible, so it goes
 * first. But an outer front-row seat at a square window needs about 92 degrees,
 * which bends the room badly at the corners, so past {@link SEAT_FOV_MAX_DEG} the
 * view slides backwards instead — more distance shrinks the angle the screen
 * subtends without touching the lens.
 *
 * `aspect` is width / height. Solved by bisection because the half-angle is not
 * invertible in closed form once both screen edges are involved.
 */
export function seatCamera(
  eye: { x: number; y: number; z: number },
  aspect: number,
): SeatCamera {
  const maxFov = (SEAT_FOV_MAX_DEG * Math.PI) / 180;

  if (fovForHalfAngles(halfAnglesAt(eye, 0), aspect) <= maxFov) {
    const fov = fovForHalfAngles(halfAnglesAt(eye, 0), aspect);
    return {
      fovDeg: Math.max(SEAT_FOV_MIN_DEG, (fov * 180) / Math.PI),
      dolly: 0,
    };
  }

  // Need to move back. Bisect on extra depth; monotonic, so 24 steps is exact
  // to well under a millimetre over this range.
  let lo = 0;
  let hi = SEAT_MAX_DOLLY;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (fovForHalfAngles(halfAnglesAt(eye, mid), aspect) <= maxFov) hi = mid;
    else lo = mid;
  }

  const atLimit = fovForHalfAngles(halfAnglesAt(eye, hi), aspect);
  if (atLimit <= maxFov) return { fovDeg: SEAT_FOV_MAX_DEG, dolly: hi };

  /*
    Both knobs exhausted. This needs a window taller than it is wide — a 2.39:1
    screen seen from a front-row seat through a 0.6 aspect viewport cannot be
    contained by 82 degrees, and sliding further back would put the view behind
    the rear row and eventually outside the room.

    A cropped film is worse than a distorted room, because the film is the reason
    anyone is sitting here, so the lens gives way last rather than never.
  */
  return {
    fovDeg: Math.min(SEAT_FOV_ABSOLUTE_MAX_DEG, (atLimit * 180) / Math.PI),
    dolly: hi,
  };
}

const ROW_GEOMETRY: Record<SeatRow, { floorY: number; z: number }> = {
  A: { floorY: 0.0, z: 4.5 },
  B: { floorY: 0.45, z: 6.2 },
};

/**
 * Seat pitch is 1.20 m, x ordered left-to-right from the audience's view.
 *
 * FIVE a row, ten in all, and that is what the room widened for. At the 1.20 m
 * pitch the outer pair reach |x| 2.76, which needs 9.6 m of room to keep a 1.88 m
 * aisle either side — at the old 8.0 m they would have sat in the stair runs.
 *
 * The pitch itself is unchanged and stays the point: it was 0.90 m, which left
 * only 0.18 m between 0.719 m wide chairs and read as a bench rather than separate
 * recliners. 1.20 m gives 0.48 m.
 *
 * Adding a fifth seat a row widens `SeatId`, which travels over RTM in seat
 * claims. A client on an older build treats 'A5'/'B5' as unknown and ignores the
 * claim, so a mixed-version party degrades to that person appearing unseated
 * rather than to anything breaking.
 */
export const SEAT_PITCH = 1.2;
export const SEAT_X = [-2.4, -1.2, 0, 1.2, 2.4] as const;

function buildSeats(): Seat[] {
  const seats: Seat[] = [];
  for (const row of ['A', 'B'] as const) {
    const { floorY, z } = ROW_GEOMETRY[row];
    SEAT_X.forEach((x, i) => {
      const id = `${row}${i + 1}` as SeatId;
      const eye = { x, y: floorY + SEATED_EYE_HEIGHT, z };
      const framing = frameScreenFrom(eye);
      const yawDeg = (framing.yaw * 180) / Math.PI;
      seats.push({
        id,
        row,
        position: { x, y: floorY, z },
        eye,
        pad: { x, y: floorY, z: z - 0.52 },
        view: {
          yaw: framing.yaw,
          pitch: framing.pitch,
          // Head limits stay relative to the neutral aim, so the clamp follows
          // the seat instead of being baked around an old angle.
          yawMin: (yawDeg - HEAD_LIMITS.yaw) * D,
          yawMax: (yawDeg + HEAD_LIMITS.yaw) * D,
          pitchMin: HEAD_LIMITS.pitchDown * D,
          pitchMax: HEAD_LIMITS.pitchUp * D,
        },
        framing,
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

/**
 * Lift applied to a seated avatar so its body rests ON the cushion.
 *
 * An avatar's origin is between its feet and the seated clip puts the hips
 * 0.461 m above it, against a cushion 0.530 m above the row floor. The old
 * 0.069 value came from aligning the hip JOINT with the cushion surface, which
 * is the wrong test: the buttock mesh hangs ~80 mm below that joint, so the
 * body sank into the seat. Measured against the skinned mesh in Blender, 644 of
 * 3980 body vertices were inside the chair solid — buttocks and thighs up to
 * 79 mm deep, shins up to 123 mm, feet up to 103 mm.
 *
 * Solved numerically by sweeping lift against the chair's collision geometry:
 * this is the smallest value that leaves zero vertices inside the chair, with
 * the underside 2.1 mm clear of the cushion.
 *
 * Coupled to the cushion height and to SEATED_AVATAR_FORWARD — all three move
 * together or the body clips again.
 */
export const SEATED_AVATAR_LIFT = 0.199;

/**
 * Forward offset, metres toward the screen, for a seated avatar's body.
 *
 * The seat pan is 0.58 m deep (z 4.16 to 4.74 on row A) but this avatar's thigh
 * is only 0.31 m long, so parking its origin on the chair origin left the shins
 * descending straight down THROUGH the cushion at z ≈ 4.37 and the feet tucked
 * under the seat on the chair's base — the "knees inside the chair" this fixes.
 * The back was buried in the backrest by up to 59 mm at the same time.
 *
 * 0.30 m puts the knees 95 mm clear of the pan's front edge so the lower legs
 * hang in free air, and brings the back to z 4.694, just off the backrest face.
 * Because the pan is deeper than the thigh is long, the occupant cannot both
 * touch the backrest and clear the front edge; clearing the front edge wins,
 * since clipping through upholstery is far more visible than a small gap.
 */
export const SEATED_AVATAR_FORWARD = 0.3;

/**
 * Body yaw, degrees, for someone sitting in a seat.
 *
 * The characters face +Z at rotation 0 (Mixamo's -Y front becomes +Z through
 * Blender's Y-up conversion — measured, not assumed), and the screen is at
 * z ≈ 0 with the seats at z = 4.5 and 6.2. Facing the screen is therefore a
 * half turn. Bodies do not get the per-seat aim from `SEAT_AIM`: a seated person
 * turns their head toward the screen, not their torso, and the chairs are all
 * bolted facing forward anyway.
 */
export const SEATED_BODY_YAW_DEG = 180;

/**
 * Where a seated avatar's body goes, for a given seat.
 *
 * Both the live path and the passive path need this. Broadcasting the walking
 * position with a 'sitIdle' state was a real bug: the last walking position is
 * the floor pad 0.52 m IN FRONT of the chair, so remote viewers saw people
 * sitting in mid-air ahead of their seat rather than in it.
 */
export function seatedAvatarPose(seatId: SeatId): {
  x: number;
  y: number;
  z: number;
  r: number;
} {
  const seat = getSeat(seatId);
  return {
    x: seat.position.x,
    y: seat.position.y + SEATED_AVATAR_LIFT,
    z: seat.position.z - SEATED_AVATAR_FORWARD,
    r: SEATED_BODY_YAW_DEG,
  };
}

/**
 * Which seat each non-3D member is shown in.
 *
 * Pure and deterministic on purpose. Every client runs this independently with no
 * coordination, so the inputs are sorted and the seats filled in a fixed order —
 * that is what makes two people looking at the same room see the same person in
 * the same chair.
 *
 * Crucially the seat is assigned from the FULL member list, and only then are the
 * viewer and the live peers filtered out of the RESULT. Filtering first was a bug
 * caught by test: removing yourself before numbering the seats shifts everyone
 * after you along by one, so the same member landed in a different chair
 * depending on who was looking. Assigning first also means a member keeps their
 * chair when they toggle 3D on and off, instead of the room reshuffling.
 *
 * Seats already claimed by someone in 3D are excluded: two avatars in one chair
 * looks worse than one person missing. Overflow beyond the ten seats is
 * dropped for the same reason.
 */
export function assignPassiveSeats(
  memberIds: readonly string[],
  livePeerIds: readonly string[],
  selfId: string,
  seatMap: Record<string, string | null>,
): readonly { id: string; seatId: SeatId }[] {
  const taken = new Set(
    Object.entries(seatMap)
      .filter(([, occupant]) => occupant !== null)
      .map(([seat]) => seat),
  );
  const free = SEAT_IDS.filter((s) => !taken.has(s));

  // Viewer-independent: sort every member, then hand out the free seats in order.
  const ordered = [...new Set(memberIds)].filter(Boolean).sort();

  const live = new Set(livePeerIds);
  const out: { id: string; seatId: SeatId }[] = [];
  ordered.forEach((id, i) => {
    if (i >= free.length) return; // no chair left for them
    // Drawn elsewhere: self by LocalPlayer, live peers by RemoteAvatars. Their
    // slot is still consumed above so nobody else's chair moves.
    if (id === selfId || live.has(id)) return;
    out.push({ id, seatId: free[i] as SeatId });
  });
  return out;
}

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

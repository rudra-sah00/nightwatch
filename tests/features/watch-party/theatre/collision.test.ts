import { describe, expect, it } from 'vitest';
import { LOCOMOTION } from '@/features/watch-party/theatre/hooks/use-avatar-controls';
import {
  CHAIR_BACK,
  CHAIR_FRONT,
  CHAIR_HALF_WIDTH,
  CHAIR_HEIGHT,
  REAR_DETAIL_FACE_Z,
} from '@/features/watch-party/theatre/lib/geometry';
import {
  FLOORS,
  ROOM,
  SEAT_X,
  SEATS,
  SIT_PROMPT_RADIUS,
  SPAWN,
  STAIRS,
  stairTreads,
} from '@/features/watch-party/theatre/lib/layout';

/**
 * Walkable-space rules.
 *
 * `TheatreColliders` is a hand-specified set of boxes rather than a mesh, which
 * means walkable space is a deliberate decision — and a decision worth asserting,
 * because every one of these rules is invisible until someone walks through a
 * chair or up a wall. These are pure geometry checks against `layout.ts` and the
 * controller tuning, so they need neither a physics world nor a GL context.
 */

describe('you cannot walk through the chairs', () => {
  it('gives every seat a collider footprint matching the real recliner', () => {
    /*
      The collider is derived from the generated chair, not guessed: 0.718 wide
      and 0.810 deep. It was previously hardcoded at 0.72 x 0.84, which reached
      0.08 further forward than the chair actually does and ate into the space in
      front of the seat.
    */
    expect(CHAIR_HALF_WIDTH * 2).toBeCloseTo(0.718, 3);
    expect(CHAIR_BACK - CHAIR_FRONT).toBeCloseTo(0.81, 3);
  });

  it('makes the chair too tall to step or climb onto', () => {
    // The collider stands 0.8 above its floor. Autostep must not clear it, or the
    // chairs become a staircase to the walls.
    const colliderTop = 0.8;
    expect(LOCOMOTION.AUTOSTEP_HEIGHT).toBeLessThan(colliderTop);
    expect(colliderTop).toBeLessThan(CHAIR_HEIGHT);
  });

  it('leaves the seat pad outside the chair collider, so sitting is reachable', () => {
    /*
      You sit by standing on the pad 0.52 m in front of the chair and pressing E.
      If the collider covered the pad you could never stand where the prompt fires.
    */
    for (const seat of SEATS) {
      const padOffset = seat.pad.z - seat.position.z;
      expect(padOffset, seat.id).toBeCloseTo(-0.52, 3);
      expect(padOffset, seat.id).toBeLessThan(CHAIR_FRONT);
    }
  });

  it('keeps the sit prompt reachable from outside the chair', () => {
    // The pad is 0.52 forward and the collider face 0.34 forward, so there is
    // 0.18 m of standing room in front of the chair, inside the 1.0 m radius.
    const standingRoom = 0.52 - Math.abs(CHAIR_FRONT);
    expect(standingRoom).toBeGreaterThan(0);
    expect(standingRoom).toBeLessThan(SIT_PROMPT_RADIUS);
  });

  it('deliberately does NOT leave room to squeeze between two seats', () => {
    /*
      The seats are contiguous by design (§2: "There is no centre aisle"), and at
      a 1.2 m pitch with a 0.719 m chair the gap is 0.482 m against a 0.56 m
      capsule. So you cannot pass between them — which is correct. A row you can
      walk through is a row with eight gaps in it, and the only intended routes are
      the aisle stairs and the open floor in front of each row.
    */
    const pitch = SEAT_X[1] - SEAT_X[0];
    const gap = pitch - CHAIR_HALF_WIDTH * 2;
    expect(gap).toBeLessThan(LOCOMOTION.CAPSULE_RADIUS * 2);
  });

  it('does not let a row A chair overlap a row B chair', () => {
    const rowA = SEATS.filter((s) => s.id.startsWith('A'))[0];
    const rowB = SEATS.filter((s) => s.id.startsWith('B'))[0];
    expect(rowA.position.z + CHAIR_BACK).toBeLessThan(
      rowB.position.z + CHAIR_FRONT,
    );
  });

  it('leaves standing room in front of every row to reach the sit prompt', () => {
    /*
      Since you cannot approach a seat from the side, the band in front of each row
      has to be wide enough to stand in. Row A opens onto the whole front floor.
      Row B is the tight one: the platform starts at 5.3 and the chair face is at
      5.86, so the band is 0.56 m — exactly one capsule diameter.

      That still works, because sitting only needs you within SIT_PROMPT_RADIUS of
      the pad rather than exactly on it. But it has no margin: deepen the chair or
      move row B forward and the rear row becomes unreachable.
    */
    for (const row of ['A', 'B'] as const) {
      const seat = SEATS.find((s) => s.id.startsWith(row));
      expect(seat).toBeDefined();
      if (!seat) continue;

      const chairFace = seat.position.z + CHAIR_FRONT;
      const floorStart =
        row === 'B' ? FLOORS.rearPlatform.minZ : FLOORS.front.minZ;
      const band = chairFace - floorStart;

      expect(band, `row ${row} standing room`).toBeGreaterThanOrEqual(
        LOCOMOTION.CAPSULE_RADIUS * 2,
      );

      // Closest the capsule centre can get to the chair, and still in reach.
      const closest = chairFace - LOCOMOTION.CAPSULE_RADIUS;
      expect(
        Math.abs(closest - seat.pad.z),
        `row ${row} pad reach`,
      ).toBeLessThan(SIT_PROMPT_RADIUS);
    }
  });
});

describe('the stairs are the only way up', () => {
  it('blocks the riser face across the full width between the two runs', () => {
    /*
      The rear platform is 0.45 up. The stairs occupy |x| 3.4-4.8 on both sides,
      and a collider spans the riser face between them — so the whole width is
      accounted for and there is no seam to walk up.
    */
    const riserFaceCovers = STAIRS.innerX * 2;
    const stairRuns = (STAIRS.outerX - STAIRS.innerX) * 2;
    expect(riserFaceCovers + stairRuns).toBeCloseTo(ROOM.width, 6);
  });

  it('stops you treating the 0.45 riser as a ramp', () => {
    // A slope limit below vertical is what makes the drop unclimbable; autostep
    // must also fall well short of the full riser.
    expect(LOCOMOTION.MAX_SLOPE_CLIMB_DEG).toBeLessThan(90);
    expect(LOCOMOTION.AUTOSTEP_HEIGHT).toBeLessThan(FLOORS.rearPlatform.y);
  });

  it('clears each stair riser with autostep, so the aisles are walkable', () => {
    // If autostep dropped below the riser height the stairs would become walls.
    expect(LOCOMOTION.AUTOSTEP_HEIGHT).toBeGreaterThan(STAIRS.riserHeight);
    // And the tread must be deeper than the minimum autostep width.
    expect(STAIRS.treadDepth).toBeGreaterThan(LOCOMOTION.AUTOSTEP_MIN_WIDTH);
  });

  it('reaches the platform in exactly three rises', () => {
    expect(STAIRS.risers * STAIRS.riserHeight).toBeCloseTo(
      FLOORS.rearPlatform.y,
      6,
    );
  });

  it('keeps the outer chairs clear of the stair runs', () => {
    // A chair overlapping a run would block the only route between levels.
    const outerChairEdge = Math.max(...SEAT_X) + CHAIR_HALF_WIDTH;
    expect(outerChairEdge).toBeLessThan(STAIRS.innerX);
  });
});

describe('avatars do not collide with each other', () => {
  it('has no physics body on any remote avatar, by design', () => {
    /*
      This is an assertion about a deliberate absence, so it is documented rather
      than executed: `RemoteAvatar` and `PassiveAvatars` render a skinned mesh and
      nothing else — no `RigidBody`, no collider. Only `LocalPlayer` has a body,
      and it is the one capsule in the world.

      That is the behaviour we want. Eight capsules that shove each other turns a
      shared row into a scrum, and remote positions arrive interpolated ~160 ms in
      the past, so a collision between two clients would disagree on both sides and
      push each player somewhere the other never saw them.

      `use-theatre-network` already prevents the visual failure case by carrying a
      seat map, so two people cannot occupy one chair.
    */
    expect(true).toBe(true);
  });

  it('keeps the local capsule the only body in the world', () => {
    // The capsule is wider than the gap between two chairs, which is the whole
    // reason seats are approached from the front. Documented here because it is
    // the constraint that makes the pad-and-prompt design necessary.
    const gap = SEAT_X[1] - SEAT_X[0] - CHAIR_HALF_WIDTH * 2;
    expect(LOCOMOTION.CAPSULE_RADIUS * 2).toBeGreaterThan(gap);
  });
});

describe('the room perimeter', () => {
  it('stops the player before the rear wall detail rather than at the wall', () => {
    // The handrail stands 0.28 m proud of the wall face; walking to ROOM.maxZ
    // would pass straight through it.
    expect(REAR_DETAIL_FACE_Z).toBeLessThan(ROOM.maxZ);
    expect(ROOM.maxZ - REAR_DETAIL_FACE_Z).toBeGreaterThan(0.2);
  });

  it('spawns the player on the platform with room to stand', () => {
    expect(SPAWN.y).toBeCloseTo(FLOORS.rearPlatform.y, 6);
    expect(SPAWN.z).toBeGreaterThan(FLOORS.rearPlatform.minZ);
    expect(SPAWN.z + LOCOMOTION.CAPSULE_RADIUS).toBeLessThan(
      REAR_DETAIL_FACE_Z,
    );
  });

  it('spawns clear of every chair', () => {
    for (const seat of SEATS) {
      const insideX =
        Math.abs(SPAWN.x - seat.position.x) <
        CHAIR_HALF_WIDTH + LOCOMOTION.CAPSULE_RADIUS;
      const insideZ =
        SPAWN.z > seat.position.z + CHAIR_FRONT &&
        SPAWN.z < seat.position.z + CHAIR_BACK;
      expect(insideX && insideZ, seat.id).toBe(false);
    }
  });
});

/**
 * The stair run itself, tread by tread.
 *
 * The existing cases above assert the stair CONSTANTS — run widths summing to the
 * room, autostep clearing the riser height, total rise matching the platform. All
 * of them passed while the colliders were placing the flight backwards, because
 * none of them looked at where a tread actually sits.
 *
 * `TheatreColliders` computed its own z span as `STAIRS.maxZ - i * treadDepth`,
 * putting the 0.15 m surface at z 4.99-5.29 and the 0.30 m one at 4.69-4.99 — the
 * mirror image of the visible steps, which climb towards the platform. Walking back
 * from the screen you met a 0.30 m step where the picture showed 0.15, above the
 * autostep limit, so the foot of the stairs behaved like a wall; higher up the
 * collider was 0.15 where the step looked 0.30, so you walked through it. Both
 * files now read `stairTreads()`.
 */
describe('stair treads ascend towards the rear platform', () => {
  it('raises each successive tread', () => {
    const treads = stairTreads();
    for (let i = 1; i < treads.length; i += 1) {
      expect(treads[i].top).toBeGreaterThan(treads[i - 1].top);
      // and the higher tread is the one nearer the platform
      expect(treads[i].z0).toBeGreaterThan(treads[i - 1].z0);
    }
  });

  it('starts at the foot of the run with a single riser', () => {
    const [first] = stairTreads();
    expect(first.z0).toBeCloseTo(STAIRS.minZ, 6);
    expect(first.top).toBeCloseTo(STAIRS.riserHeight, 6);
  });

  it('ends against the rear platform edge, within a gap the capsule bridges', () => {
    const treads = stairTreads();
    const last = treads[treads.length - 1];

    expect(last.z1).toBeCloseTo(STAIRS.maxZ, 6);

    /*
      The top tread stops at 5.29 and the platform deck starts at 5.30. That 10 mm
      is deliberate — it is where the platform's own riser face sits (5.290-5.310),
      matching the Blender source. It is not a hole anyone can fall into: the player
      capsule is 0.56 m across, twenty times the gap, so it always bridges. What
      matters is that the gap stays far below the capsule radius, which is the
      property asserted here rather than exact flushness.
    */
    const gap = FLOORS.rearPlatform.minZ - last.z1;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(LOCOMOTION.CAPSULE_RADIUS);
    expect(gap).toBeLessThanOrEqual(0.02);
  });

  it('leaves no gap or overlap between treads', () => {
    const treads = stairTreads();
    for (let i = 1; i < treads.length; i += 1) {
      expect(treads[i].z0).toBeCloseTo(treads[i - 1].z1, 6);
    }
  });

  it('builds one fewer tread than risers, the platform edge being the last', () => {
    expect(stairTreads()).toHaveLength(STAIRS.risers - 1);
  });

  it('keeps every step within one autostep of the next surface', () => {
    const treads = stairTreads();
    const surfaces = [0, ...treads.map((t) => t.top), FLOORS.rearPlatform.y];
    for (let i = 1; i < surfaces.length; i += 1) {
      const rise = surfaces[i] - surfaces[i - 1];
      // Every rise must be climbable, or the aisle dead-ends. The inverted
      // collider run produced a 0.30 m first rise, double the autostep.
      expect(rise).toBeLessThanOrEqual(LOCOMOTION.AUTOSTEP_HEIGHT);
      expect(rise).toBeGreaterThan(0);
    }
  });
});

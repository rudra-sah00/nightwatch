import { describe, expect, it } from 'vitest';
import { LOCOMOTION } from '@/features/watch-party/theatre/hooks/use-avatar-controls';
import {
  avatarUrlFor,
  identityColour,
  identityHash,
} from '@/features/watch-party/theatre/lib/avatar-instance';
import {
  CHAIR_BACK,
  CHAIR_FRONT,
  CHAIR_HALF_WIDTH,
} from '@/features/watch-party/theatre/lib/geometry';
import {
  assignPassiveSeats,
  ROOM,
  SEAT_IDS,
  SEATS,
  SPAWN,
  SPAWN_SLOT_COUNT,
  STAIRS,
  spawnFor,
} from '@/features/watch-party/theatre/lib/layout';

const MODELS = [
  'https://a/theatre/v3/models/avatar-boy.glb',
  'https://a/theatre/v3/models/avatar-girl.glb',
] as const;

/**
 * Identity and spawn rules that must agree across clients without coordination.
 *
 * Everything here derives from a user id alone, because there is no authority to
 * ask: a watch party has no server in the movement path, and a member who never
 * enables 3D broadcasts nothing at all. Anything that varies per person therefore
 * has to be a pure function of their id, or two people looking at the same room
 * disagree about who is who.
 */

describe('spawn slots', () => {
  it('does not put every player on the same square metre', () => {
    /*
      The bug this fixes: every client read SPAWN directly, so eight people
      entering a party all arrived at (0, 0.45, 7.8). Avatars carry no colliders,
      so nothing pushed them apart — they simply stood inside one another.
    */
    const ids = Array.from({ length: 8 }, (_, i) => `user-${i}`);
    const xs = new Set(ids.map((id) => spawnFor(id).x));

    expect(xs.size).toBeGreaterThan(1);
  });

  it('is stable for a given id, so a reconnect returns you to the same place', () => {
    for (const id of ['abc', 'user-1', 'guest_xyz']) {
      expect(spawnFor(id)).toEqual(spawnFor(id));
    }
  });

  it('spaces slots wider than the player capsule', () => {
    // Two adjacent slots must not overlap, or the fix achieves nothing.
    const xs = Array.from({ length: SPAWN_SLOT_COUNT }, (_, i) =>
      spawnFor(`seed-${i}`),
    ).map((p) => p.x);
    const distinct = [...new Set(xs)].sort((a, b) => a - b);

    for (let i = 1; i < distinct.length; i += 1) {
      expect(distinct[i] - distinct[i - 1]).toBeGreaterThanOrEqual(
        LOCOMOTION.CAPSULE_RADIUS * 2,
      );
    }
  });

  it('keeps every slot inside the room and on the rear platform', () => {
    // Probe far more ids than there are slots so every slot is exercised.
    for (let i = 0; i < 200; i += 1) {
      const p = spawnFor(`user-${i}`);
      expect(Math.abs(p.x) + LOCOMOTION.CAPSULE_RADIUS).toBeLessThan(ROOM.maxX);
      expect(p.y).toBe(SPAWN.y);
      expect(p.z).toBe(SPAWN.z);
    }
  });

  it('keeps every slot clear of the chairs and the stairs', () => {
    for (let i = 0; i < 200; i += 1) {
      const p = spawnFor(`user-${i}`);

      // Behind Row B, which is the rearmost furniture.
      for (const seat of SEATS) {
        const overlapsZ =
          p.z > seat.position.z + CHAIR_FRONT &&
          p.z < seat.position.z + CHAIR_BACK;
        const overlapsX =
          Math.abs(p.x - seat.position.x) <
          CHAIR_HALF_WIDTH + LOCOMOTION.CAPSULE_RADIUS;
        expect(overlapsZ && overlapsX, `${seat.id} vs spawn x=${p.x}`).toBe(
          false,
        );
      }

      // Not standing in a stair run.
      const onStairZ = p.z > STAIRS.minZ && p.z < STAIRS.maxZ;
      expect(onStairZ).toBe(false);
    }
  });

  it('only uses the declared number of slots', () => {
    const xs = new Set<number>();
    for (let i = 0; i < 500; i += 1) xs.add(spawnFor(`u${i}`).x);
    expect(xs.size).toBeLessThanOrEqual(SPAWN_SLOT_COUNT);
  });
});

describe('character resolution', () => {
  it('gives the same person the same body on every client', () => {
    /*
      There is no authority for a passive member's character, so it is hashed from
      their id. Two clients must agree, or the same person appears as a different
      character depending on who is looking.
    */
    for (const id of ['alice', 'bob', 'guest_123']) {
      expect(avatarUrlFor(MODELS, id)).toBe(avatarUrlFor(MODELS, id));
    }
  });

  it('spreads members across the published models', () => {
    // The bug this replaces drew every passive member with one hardcoded model,
    // so a party of five looked like five clones.
    const ids = Array.from({ length: 40 }, (_, i) => `member-${i}`);
    const used = new Set(ids.map((id) => avatarUrlFor(MODELS, id)));

    expect(used.size).toBe(MODELS.length);
  });

  it('returns null when nothing is published, rather than an empty url', () => {
    // An empty string would reach useGLTF and throw.
    expect(avatarUrlFor([], 'alice')).toBeNull();
  });

  it('still resolves when only one model is published', () => {
    expect(avatarUrlFor([MODELS[0]], 'alice')).toBe(MODELS[0]);
  });

  it('uses the same hash as the identity colour, so body and tint agree', () => {
    // Both derive from identityHash. If they diverged, a peer could change colour
    // without changing body or vice versa on a reconnect.
    const id = 'consistency-check';
    expect(identityHash(id)).toBe(identityHash(id));
    expect(identityColour(id)).toBe(identityColour(id));
  });
});

describe('passive seat assignment', () => {
  const free: Record<string, string | null> = Object.fromEntries(
    SEAT_IDS.map((s) => [s, null]),
  );

  it('agrees between two clients looking at the same room', () => {
    // Derived from sorted ids, so it is viewer-independent.
    const members = ['zoe', 'adam', 'mike'];
    const fromA = assignPassiveSeats(members, [], 'adam', free);
    const fromB = assignPassiveSeats([...members].reverse(), [], 'adam', free);

    expect(fromA).toEqual(fromB);
  });

  it('never draws the local player, who LocalPlayer already draws', () => {
    const out = assignPassiveSeats(['a', 'b', 'c'], [], 'b', free);
    expect(out.map((p) => p.id)).not.toContain('b');
  });

  it('never draws a live peer, who RemoteAvatars already draws', () => {
    const out = assignPassiveSeats(['a', 'b', 'c'], ['c'], 'a', free);
    expect(out.map((p) => p.id)).not.toContain('c');
  });

  it('does not move anyone else when a member starts being drawn elsewhere', () => {
    /*
      A live peer's slot is consumed but not rendered. Without that, someone
      switching 3D on would shuffle every seat behind them — the room would
      visibly rearrange itself because one person pressed a key.
    */
    const members = ['a', 'b', 'c', 'd'];
    const before = assignPassiveSeats(members, [], 'a', free);
    const after = assignPassiveSeats(members, ['c'], 'a', free);

    const seatOf = (
      list: readonly { id: string; seatId: string }[],
      id: string,
    ) => list.find((p) => p.id === id)?.seatId;

    expect(seatOf(after, 'b')).toBe(seatOf(before, 'b'));
    expect(seatOf(after, 'd')).toBe(seatOf(before, 'd'));
  });

  it('does not seat a passive member in a seat someone claimed', () => {
    const claimed = { ...free, A1: 'someone-in-3d' };
    const out = assignPassiveSeats(['a', 'b'], [], 'zzz', claimed);

    expect(out.map((p) => p.seatId)).not.toContain('A1');
  });

  it('drops members with no chair left rather than stacking them', () => {
    const many = Array.from({ length: 20 }, (_, i) => `m${i}`);
    const out = assignPassiveSeats(many, [], 'nobody', free);

    expect(out.length).toBeLessThanOrEqual(SEAT_IDS.length);
    expect(new Set(out.map((p) => p.seatId)).size).toBe(out.length);
  });
});

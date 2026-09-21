import { describe, expect, it } from 'vitest';
import {
  assignPassiveSeats,
  getSeat,
  SEAT_IDS,
  SEATED_AVATAR_FORWARD,
  SEATED_AVATAR_LIFT,
  SEATED_BODY_YAW_DEG,
  seatedAvatarPose,
} from '@/features/watch-party/theatre/lib/layout';

const EMPTY: Record<string, string | null> = Object.fromEntries(
  SEAT_IDS.map((id) => [id, null]),
);

describe('seatedAvatarPose', () => {
  it('places the body at the seat, not at the pad in front of it', () => {
    const pose = seatedAvatarPose('A2');
    const seat = getSeat('A2');
    expect(pose.x).toBe(seat.position.x);
    // the pad is 0.52 m in front — the bug was publishing that instead
    expect(pose.z).toBeGreaterThan(seat.pad.z);
    expect(Math.abs(pose.z - seat.pad.z)).toBeCloseTo(0.22, 6);
  });

  it('sits the body forward of the chair origin so the legs clear the pan', () => {
    const pose = seatedAvatarPose('A2');
    const seat = getSeat('A2');
    // The pan is 0.58 m deep but the thigh only 0.31 m, so parking the origin
    // on the chair origin drove the shins down through the cushion.
    expect(seat.position.z - pose.z).toBeCloseTo(SEATED_AVATAR_FORWARD, 6);
    expect(SEATED_AVATAR_FORWARD).toBeGreaterThan(0);
    // still within the pan footprint, measured in Blender as z 4.16 to 4.74
    expect(pose.z).toBeGreaterThan(4.16);
    expect(pose.z).toBeLessThan(4.74);
  });

  it('lifts the avatar onto the cushion rather than burying it in the seat', () => {
    const pose = seatedAvatarPose('A2');
    expect(pose.y).toBeCloseTo(
      getSeat('A2').position.y + SEATED_AVATAR_LIFT,
      6,
    );
    // The buttock mesh hangs ~80 mm below the hip joint, so aligning the joint
    // with the 0.530 m cushion is not enough to keep the body out of it.
    expect(SEATED_AVATAR_LIFT).toBeGreaterThan(0.08);
  });

  it('faces the screen', () => {
    // characters face +Z at yaw 0, the screen is at z ~ 0 and seats at z > 4
    expect(seatedAvatarPose('B3').r).toBe(SEATED_BODY_YAW_DEG);
    expect(SEATED_BODY_YAW_DEG).toBe(180);
  });

  it('respects the raised rear row', () => {
    expect(seatedAvatarPose('B1').y).toBeGreaterThan(seatedAvatarPose('A1').y);
  });
});

describe('assignPassiveSeats', () => {
  it('seats members who are not broadcasting a pose', () => {
    const out = assignPassiveSeats(['me', 'alice', 'bob'], [], 'me', EMPTY);
    expect(out.map((p) => p.id)).toEqual(['alice', 'bob']);
  });

  it('never seats the local user, who is drawn by LocalPlayer', () => {
    const out = assignPassiveSeats(['me', 'alice'], [], 'me', EMPTY);
    expect(out.some((p) => p.id === 'me')).toBe(false);
  });

  it('drops members who went 3D, so they are not drawn twice', () => {
    const out = assignPassiveSeats(
      ['me', 'alice', 'bob'],
      ['alice'],
      'me',
      EMPTY,
    );
    expect(out.map((p) => p.id)).toEqual(['bob']);
  });

  it('is identical on every client regardless of member order', () => {
    const a = assignPassiveSeats(
      ['me', 'zoe', 'alice', 'bob'],
      [],
      'me',
      EMPTY,
    );
    const b = assignPassiveSeats(
      ['bob', 'me', 'zoe', 'alice'],
      [],
      'me',
      EMPTY,
    );
    expect(a).toEqual(b);
  });

  it('is stable for a different viewer looking at the same room', () => {
    const seenByMe = assignPassiveSeats(
      ['me', 'alice', 'bob'],
      [],
      'me',
      EMPTY,
    );
    const seenByAlice = assignPassiveSeats(
      ['me', 'alice', 'bob'],
      [],
      'alice',
      EMPTY,
    );
    // bob is passive for both viewers, and must be in the SAME chair for both
    const mine = seenByMe.find((p) => p.id === 'bob');
    const theirs = seenByAlice.find((p) => p.id === 'bob');
    expect(mine?.seatId).toBeDefined();
    expect(theirs?.seatId).toBe(mine?.seatId);
  });

  it('avoids seats already claimed by someone in 3D', () => {
    const claimed = { ...EMPTY, A1: 'alice' };
    const out = assignPassiveSeats(['me', 'bob'], ['alice'], 'me', claimed);
    expect(out.map((p) => p.seatId)).not.toContain('A1');
  });

  it('drops overflow rather than stacking avatars in one chair', () => {
    const many = Array.from({ length: 20 }, (_, i) => `user-${i}`);
    const out = assignPassiveSeats(many, [], 'nobody', EMPTY);
    expect(out.length).toBe(SEAT_IDS.length);
    expect(new Set(out.map((p) => p.seatId)).size).toBe(out.length);
  });

  it('gives every placement a distinct seat', () => {
    const out = assignPassiveSeats(
      ['a', 'b', 'c', 'd', 'e'],
      [],
      'self',
      EMPTY,
    );
    expect(new Set(out.map((p) => p.seatId)).size).toBe(out.length);
  });

  it('ignores duplicate and empty member ids', () => {
    const out = assignPassiveSeats(
      ['alice', 'alice', '', 'bob'],
      [],
      'me',
      EMPTY,
    );
    expect(out.map((p) => p.id)).toEqual(['alice', 'bob']);
  });
});

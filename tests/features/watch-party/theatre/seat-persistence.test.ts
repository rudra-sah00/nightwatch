import { describe, expect, it } from 'vitest';
import {
  assignPassiveSeats,
  autoSeatOrder,
  pickAutoSeat,
  SEAT_IDS,
  type SeatId,
} from '@/features/watch-party/theatre/lib/layout';
import {
  applyClaim,
  type ClaimMap,
  seatOf,
  toSeatMap,
} from '@/features/watch-party/theatre/lib/seat-claims';

const EMPTY: Record<string, string | null> = Object.fromEntries(
  SEAT_IDS.map((id) => [id, null]),
);

describe('autoSeatOrder', () => {
  it('covers every seat exactly once', () => {
    const order = autoSeatOrder('alice');
    expect([...order].sort()).toEqual([...SEAT_IDS].sort());
  });

  it('is identical on every client for the same person', () => {
    // No coordination is possible: a claim can arrive before the roster does, so
    // the order must be a pure function of the id.
    expect(autoSeatOrder('alice')).toEqual(autoSeatOrder('alice'));
  });

  it('does not send everybody to the same chair first', () => {
    /*
      The reason this is derived from the id rather than being a fixed preference
      list. With a fixed list, eight people entering together all claim A1, seven
      lose the deterministic contest, and each is visibly bounced out of the same
      seat before retrying.
    */
    const firsts = new Set(
      ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'].map(
        (id) => autoSeatOrder(id)[0],
      ),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe('pickAutoSeat', () => {
  it('seats someone entering an empty room', () => {
    expect(SEAT_IDS).toContain(pickAutoSeat('alice', EMPTY) as SeatId);
  });

  it('never offers a seat somebody already holds', () => {
    const first = pickAutoSeat('alice', EMPTY) as SeatId;
    const taken = { ...EMPTY, [first]: 'bob' };
    expect(pickAutoSeat('alice', taken)).not.toBe(first);
  });

  it('follows the user order, so the choice is predictable', () => {
    const order = autoSeatOrder('alice');
    const taken = { ...EMPTY, [order[0]]: 'bob' };
    expect(pickAutoSeat('alice', taken)).toBe(order[1]);
  });

  it('returns null for a full room rather than stacking two to a chair', () => {
    const full = Object.fromEntries(SEAT_IDS.map((id) => [id, 'someone']));
    expect(pickAutoSeat('alice', full)).toBeNull();
  });

  it('is stable under repeated entry — the same free room gives the same seat', () => {
    expect(pickAutoSeat('alice', EMPTY)).toBe(pickAutoSeat('alice', EMPTY));
  });
});

describe('a seat survives the 2D <-> 3D round trip', () => {
  /**
   * The claim map is owned above the renderer, so switching to 2D and back is not
   * a new session. These tests pin the properties that makes rely on.
   */
  it('keeps the claim when the scene goes away and comes back', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'B3', 'alice', 1_000);

    // 3D -> 2D -> 3D. Nothing happens to the claim in between, which is the point.
    expect(seatOf(claims, 'alice')).toBe('B3');
  });

  it('lets the holder re-take their own seat whatever the timestamps say', () => {
    // Re-entry re-asserts, and a person can never lose their seat to themselves.
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'B3', 'alice', 5_000);
    expect(applyClaim(claims, 'B3', 'alice', 9_999)).toBe(true);
    expect(toSeatMap(claims).B3).toBe('alice');
  });

  it('draws a claimant in their claimed seat even once they stop broadcasting', () => {
    /*
      The switch to 2D stops pose traffic, so peers fall back to the passive layer.
      It must place them in the seat they hold — otherwise they appear in some other
      free chair while their real claim sits empty and untakeable, which is one
      person rendered as two facts about the room.
    */
    const claimed = { ...EMPTY, B3: 'alice' };

    const in3D = assignPassiveSeats(['alice', 'bob'], ['alice'], 'me', claimed);
    expect(in3D.some((p) => p.id === 'alice')).toBe(false); // drawn live

    const in2D = assignPassiveSeats(['alice', 'bob'], [], 'me', claimed);
    expect(in2D.find((p) => p.id === 'alice')?.seatId).toBe('B3');
  });

  it('does not move anybody else when a claimant stops broadcasting', () => {
    const claimed = { ...EMPTY, B3: 'alice' };
    const before = assignPassiveSeats(
      ['alice', 'bob', 'carol'],
      ['alice'],
      'me',
      claimed,
    );
    const after = assignPassiveSeats(
      ['alice', 'bob', 'carol'],
      [],
      'me',
      claimed,
    );

    for (const id of ['bob', 'carol']) {
      expect(after.find((p) => p.id === id)?.seatId).toBe(
        before.find((p) => p.id === id)?.seatId,
      );
    }
  });

  it('gives a claimed seat to nobody else', () => {
    const claimed = { ...EMPTY, A1: 'alice' };
    const out = assignPassiveSeats(
      ['alice', 'bob', 'carol'],
      [],
      'me',
      claimed,
    );
    const a1 = out.filter((p) => p.seatId === 'A1');
    expect(a1).toHaveLength(1);
    expect(a1[0].id).toBe('alice');
  });
});

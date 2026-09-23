import { describe, expect, it } from 'vitest';
import {
  SEAT_IDS,
  type SeatId,
} from '@/features/watch-party/theatre/lib/layout';
import {
  applyClaim,
  type ClaimMap,
  incomingWins,
  isSeatId,
  seatOf,
  toSeatMap,
  vacate,
} from '@/features/watch-party/theatre/lib/seat-claims';

/** A claim, as it would arrive over RTM. */
interface Wire {
  seat: SeatId;
  userId: string;
  at: number;
}

/** Replay a set of claims in the given order onto a fresh map. */
function replay(order: readonly Wire[]): ClaimMap {
  const claims: ClaimMap = new Map();
  for (const c of order) applyClaim(claims, c.seat, c.userId, c.at);
  return claims;
}

/** Every ordering of a list, for exhaustive order-independence checks. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([items[i], ...p]);
  }
  return out;
}

describe('incomingWins', () => {
  it('gives the seat to the earlier claim', () => {
    expect(
      incomingWins({ userId: 'a', at: 100 }, { userId: 'b', at: 200 }),
    ).toBe(true);
    expect(
      incomingWins({ userId: 'a', at: 300 }, { userId: 'b', at: 200 }),
    ).toBe(false);
  });

  it('breaks an exact tie on the lower userId', () => {
    /*
      Ties are not hypothetical: Date.now() is millisecond resolution and two
      people can click in the same millisecond. Without a tiebreak the two clients
      would disagree about who won, which is exactly the desync the deterministic
      rule exists to prevent.
    */
    expect(
      incomingWins({ userId: 'aaa', at: 100 }, { userId: 'bbb', at: 100 }),
    ).toBe(true);
    expect(
      incomingWins({ userId: 'bbb', at: 100 }, { userId: 'aaa', at: 100 }),
    ).toBe(false);
  });

  it('lets a person re-assert their own claim', () => {
    // Re-announcing on a member join must not fail against yourself.
    expect(
      incomingWins({ userId: 'a', at: 500 }, { userId: 'a', at: 100 }),
    ).toBe(true);
  });
});

describe('applyClaim', () => {
  it('seats the first claimant', () => {
    const claims: ClaimMap = new Map();
    expect(applyClaim(claims, 'A1', 'alice', 100)).toBe(true);
    expect(seatOf(claims, 'alice')).toBe('A1');
  });

  it('rejects a later claim on a taken seat', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 100);

    expect(applyClaim(claims, 'A1', 'bob', 200)).toBe(false);
    expect(seatOf(claims, 'alice')).toBe('A1');
    expect(seatOf(claims, 'bob')).toBeNull();
  });

  it('evicts a later occupant when an earlier claim arrives out of order', () => {
    /*
      Messages do not arrive in timestamp order. If bob's 200 ms claim is
      delivered first, alice's 100 ms claim must still win when it turns up —
      otherwise the result would depend on network timing.
    */
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'bob', 200);

    expect(applyClaim(claims, 'A1', 'alice', 100)).toBe(true);
    expect(seatOf(claims, 'alice')).toBe('A1');
    expect(seatOf(claims, 'bob')).toBeNull();
  });

  it('keeps one person to one seat', () => {
    // Otherwise moving seats leaves a phantom occupant blocking the old chair.
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 100);
    applyClaim(claims, 'B3', 'alice', 200);

    expect(seatOf(claims, 'alice')).toBe('B3');
    expect(toSeatMap(claims).A1).toBeNull();
  });

  it('does not vacate the seat it is re-asserting', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 100);
    applyClaim(claims, 'A1', 'alice', 100);

    expect(seatOf(claims, 'alice')).toBe('A1');
  });
});

describe('order independence', () => {
  /**
   * The property the whole design rests on.
   *
   * Nobody arbitrates, so each client applies whatever claims reach it in whatever
   * order RTM delivers them. If the outcome depended on order, two people in the
   * same room would disagree about who is sitting where — and there would be no
   * authority to ask.
   */
  it('converges on the same seat map for every delivery order', () => {
    const wire: Wire[] = [
      { seat: 'A1', userId: 'alice', at: 100 },
      { seat: 'A1', userId: 'bob', at: 150 },
      { seat: 'A2', userId: 'bob', at: 300 },
      { seat: 'A2', userId: 'carol', at: 120 },
    ];

    const orders = permutations(wire);
    expect(orders.length).toBe(24);

    const reference = JSON.stringify(toSeatMap(replay(orders[0])));
    for (const order of orders) {
      expect(
        JSON.stringify(toSeatMap(replay(order))),
        order.map((c) => `${c.userId}->${c.seat}@${c.at}`).join(' '),
      ).toBe(reference);
    }
  });

  it('converges when two people tie on the same seat, whichever arrives first', () => {
    const wire: Wire[] = [
      { seat: 'B2', userId: 'zoe', at: 500 },
      { seat: 'B2', userId: 'adam', at: 500 },
    ];

    const forward = toSeatMap(replay(wire));
    const backward = toSeatMap(replay([...wire].reverse()));

    expect(forward).toEqual(backward);
    // Lower id wins the tie.
    expect(forward.B2).toBe('adam');
  });
});

describe('late joiner convergence', () => {
  /**
   * The bug this covers: claims were only ever broadcast at the instant they
   * happened, so a member who joined afterwards started with every seat apparently
   * free. They could then claim an occupied chair and it STUCK locally — their
   * client knew of no earlier claim to lose to — while everyone else rejected it.
   * Two avatars in one seat, and no authority to settle it.
   *
   * The fix is each client re-asserting its own claim when someone joins, carrying
   * the ORIGINAL timestamp.
   */
  it('a newcomer who claims a taken seat loses once the re-announce arrives', () => {
    // Alice sat down long before dave joined.
    const alice: Wire = { seat: 'A3', userId: 'alice', at: 1_000 };

    // Dave's client starts empty and he grabs the same chair.
    const dave: ClaimMap = new Map();
    expect(applyClaim(dave, 'A3', 'dave', 5_000)).toBe(true);
    expect(seatOf(dave, 'dave')).toBe('A3');

    // Alice re-asserts with her original timestamp.
    applyClaim(dave, alice.seat, alice.userId, alice.at);

    expect(seatOf(dave, 'alice')).toBe('A3');
    expect(seatOf(dave, 'dave')).toBeNull();
  });

  it('re-announcing with a FRESH timestamp would lose the seat — hence the original', () => {
    /*
      This is why the re-announce must carry `claim.at` and not `Date.now()`. Shown
      as a test because it is the kind of detail that gets "tidied" into a bug.
    */
    const dave: ClaimMap = new Map();
    applyClaim(dave, 'A3', 'dave', 5_000);

    // Alice re-announces incorrectly, with a fresh clock reading.
    applyClaim(dave, 'A3', 'alice', 9_000);

    expect(seatOf(dave, 'alice')).toBeNull();
    expect(seatOf(dave, 'dave')).toBe('A3');
  });

  it('converges the newcomer on the full room after everyone re-announces', () => {
    const seated: Wire[] = [
      { seat: 'A1', userId: 'alice', at: 1_000 },
      { seat: 'A2', userId: 'bob', at: 1_100 },
      { seat: 'B4', userId: 'carol', at: 1_200 },
    ];
    const established = toSeatMap(replay(seated));

    // A newcomer receives the same re-announcements in a different order.
    const newcomer = replay([...seated].reverse());

    expect(toSeatMap(newcomer)).toEqual(established);
  });
});

describe('vacate', () => {
  it('frees the seat and reports the change', () => {
    const claims: ClaimMap = new Map();
    applyClaim(claims, 'A1', 'alice', 100);

    expect(vacate(claims, 'alice')).toBe(true);
    expect(toSeatMap(claims).A1).toBeNull();
  });

  it('reports no change for someone who was not seated', () => {
    // The hook skips a re-render on false, so this must not lie.
    expect(vacate(new Map(), 'nobody')).toBe(false);
  });
});

describe('toSeatMap', () => {
  it('lists every seat, free ones as null', () => {
    const map = toSeatMap(new Map());
    expect(Object.keys(map).sort()).toEqual([...SEAT_IDS].sort());
    expect(Object.values(map).every((v) => v === null)).toBe(true);
  });
});

describe('isSeatId', () => {
  it('accepts real seats and rejects anything else', () => {
    // Guards the claim handler against a malformed or hostile message.
    expect(isSeatId('A1')).toBe(true);
    expect(isSeatId('B4')).toBe(true);
    expect(isSeatId('C9')).toBe(false);
    expect(isSeatId('')).toBe(false);
    expect(isSeatId(null)).toBe(false);
    expect(isSeatId(3)).toBe(false);
  });
});

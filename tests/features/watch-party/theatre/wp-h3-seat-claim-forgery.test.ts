/**
 * Tests for the seat-claim timestamp validation, and for the part of AUDIT.md WP-H3 that is **still
 * open**.
 *
 * Seat claims are resolved with no arbiter by a rule that is deterministic and order-independent. Both
 * properties genuinely hold. The defect is the number the rule is decided on: `at` is the claimant's own
 * `Date.now()`, sent in the payload, and `rtm-events` read it as `(msg.at as number) ?? Date.now()` —
 * `??` catches only `null` and `undefined`, so a string, `NaN`, `0` and `-1` all passed through.
 *
 * What is fixed here is narrow: a value nobody can order is dropped rather than compared. A string makes
 * `incoming.at < existing.at` a coercion instead of a comparison, and `NaN` loses every contest silently.
 *
 * **WP-H3 itself is NOT fixed.** Because the rule is earliest-wins and `applyClaim` compares against the
 * *sitting occupant*, any well-formed early number still evicts whoever is seated and holds the seat
 * afterwards. Clamping `at` into a window around the receiver's clock was tried and abandoned — the
 * window must tolerate ordinary clock skew, real claims are seconds old, so a forged claim floored at
 * `now − window` is still earlier than every honest one. The last two tests here pin that residual
 * deliberately, so it cannot be mistaken for closed.
 */
import { describe, expect, it } from 'vitest';
import { SEAT_IDS } from '@/features/watch-party/theatre/lib/layout';
import {
  applyClaim,
  type ClaimMap,
  sanitizeClaimAt,
  toSeatMap,
} from '@/features/watch-party/theatre/lib/seat-claims';

const NOW = 1_700_000_000_000;
const seat = SEAT_IDS[0];

/** Applies a claim the way the inbound handler now does: validate, then apply. */
function inboundClaim(
  claims: ClaimMap,
  s: (typeof SEAT_IDS)[number],
  claimant: string,
  rawAt: unknown,
  now = NOW,
): boolean {
  const at = sanitizeClaimAt(rawAt, now);
  if (at === null) return false;
  return applyClaim(claims, s, claimant, at);
}

describe('sanitizeClaimAt', () => {
  it('accepts a real timestamp', () => {
    expect(sanitizeClaimAt(NOW - 500, NOW)).toBe(NOW - 500);
  });

  it.each([
    ['a string', '0'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['undefined', undefined],
    ['null', null],
    ['an object', {}],
    ['a boolean', true],
  ])('rejects %s as unorderable', (_label, raw) => {
    expect(sanitizeClaimAt(raw, NOW)).toBeNull();
  });
});

describe('seat claims — unorderable timestamps are dropped', () => {
  /*
    A string `at` is the interesting one: `'0' < 1699999999000` is a coercion, not a comparison, so it
    used to win. It is now not applied at all.
  */
  it('ignores a claim whose timestamp is a string', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'honest', NOW - 1000);

    const stuck = inboundClaim(claims, seat, 'attacker', '0');

    expect(stuck).toBe(false);
    expect(toSeatMap(claims)[seat]).toBe('honest');
  });

  it('ignores a claim whose timestamp is NaN', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'honest', NOW - 1000);

    expect(inboundClaim(claims, seat, 'attacker', Number.NaN)).toBe(false);
    expect(toSeatMap(claims)[seat]).toBe('honest');
  });

  it('ignores a claim with no timestamp at all', () => {
    const claims: ClaimMap = new Map();
    expect(inboundClaim(claims, seat, 'attacker', undefined)).toBe(false);
    expect(toSeatMap(claims)[seat]).toBeNull();
  });
});

describe('seat claims — the contest itself still works', () => {
  it('resolves a genuine race by earliest claim', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'later', NOW - 100);
    inboundClaim(claims, seat, 'earlier', NOW - 400);

    expect(toSeatMap(claims)[seat]).toBe('earlier');
  });

  /* Order-independence is the property that removes the need for a referee. */
  it('breaks an exact tie on the lower userId, identically whatever the arrival order', () => {
    const a: ClaimMap = new Map();
    inboundClaim(a, seat, 'zoe', NOW - 200);
    inboundClaim(a, seat, 'adam', NOW - 200);

    const b: ClaimMap = new Map();
    inboundClaim(b, seat, 'adam', NOW - 200);
    inboundClaim(b, seat, 'zoe', NOW - 200);

    expect(toSeatMap(a)[seat]).toBe('adam');
    expect(toSeatMap(b)[seat]).toBe('adam');
  });
});

describe('WP-H3 residual — STILL OPEN, pinned so it stays visible', () => {
  /*
    These two assert the defect, not the fix. They exist because the validation above is easy to mistake
    for a fix for WP-H3, and it is not: bounding the *type* of `at` does nothing about its *value*.

    If a future change closes WP-H3 — by refusing to evict an occupied seat, or by stamping claims from a
    trusted timebase — these two tests SHOULD fail, and should be rewritten to assert the new behaviour.
  */
  it('a well-formed early timestamp still evicts a seated occupant', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'honest', NOW - 1000);

    const stuck = inboundClaim(claims, seat, 'attacker', 1);

    expect(stuck).toBe(true);
    expect(toSeatMap(claims)[seat]).toBe('attacker');
  });

  it('and then holds the seat against every later honest claim', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'attacker', 1);

    expect(inboundClaim(claims, seat, 'victim', NOW)).toBe(false);
    expect(toSeatMap(claims)[seat]).toBe('attacker');
  });

  /* A merely slow clock wins too — the same defect without any malice. */
  it('a clock five seconds slow takes the seat from a punctual user', () => {
    const claims: ClaimMap = new Map();
    inboundClaim(claims, seat, 'punctual', NOW);

    expect(inboundClaim(claims, seat, 'slow-by-5s', NOW - 5000)).toBe(true);
    expect(toSeatMap(claims)[seat]).toBe('slow-by-5s');
  });
});

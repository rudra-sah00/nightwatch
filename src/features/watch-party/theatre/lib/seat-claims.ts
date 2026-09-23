import { SEAT_IDS, type SeatId } from './layout';

/**
 * Seat claim arbitration, with no arbiter.
 *
 * Admission to the party is already the permission boundary — once the host has
 * approved a member they may sit anywhere — so routing every claim through the
 * host would add a round trip and a single point of failure to guard something
 * that is not actually restricted. Claims are broadcast and applied optimistically
 * instead.
 *
 * That means two people can grab the same seat in the same instant, and it has to
 * resolve the same way on every machine without anyone adjudicating. The rule is
 * therefore deterministic and, critically, ORDER-INDEPENDENT: apply the same set of
 * claims in any sequence and every client lands on the same occupant. That property
 * is what makes a referee unnecessary, and it is the one worth testing — see
 * `seat-claims.test.ts`.
 */

export interface SeatClaim {
  userId: string;
  /** Claim timestamp. The only field the contest is decided on. */
  at: number;
}

export type ClaimMap = Map<SeatId, SeatClaim>;

/**
 * Does `incoming` beat `existing` for the same seat?
 *
 * Earliest timestamp wins. An exact tie breaks on the lower userId, which is
 * arbitrary but identical everywhere — and ties are not hypothetical, because
 * `Date.now()` has millisecond resolution and two clicks can land on the same ms.
 */
export function incomingWins(
  incoming: SeatClaim,
  existing: SeatClaim,
): boolean {
  if (incoming.userId === existing.userId) return true;
  if (incoming.at !== existing.at) return incoming.at < existing.at;
  return incoming.userId < existing.userId;
}

/**
 * Apply a claim, mutating `claims`. Returns whether it stuck.
 *
 * A person occupies at most one seat, so any previous seat of theirs is vacated
 * first — otherwise standing up and sitting elsewhere would leave a phantom
 * occupant behind, and that phantom would block the seat for everyone.
 */
export function applyClaim(
  claims: ClaimMap,
  seat: SeatId,
  claimant: string,
  at: number,
): boolean {
  for (const [s, c] of claims) {
    if (c.userId === claimant && s !== seat) claims.delete(s);
  }

  const existing = claims.get(seat);
  if (existing && !incomingWins({ userId: claimant, at }, existing)) {
    return false;
  }

  claims.set(seat, { userId: claimant, at });
  return true;
}

/** Free whatever seat a person holds. Returns whether anything changed. */
export function vacate(claims: ClaimMap, claimant: string): boolean {
  let changed = false;
  for (const [s, c] of claims) {
    if (c.userId === claimant) {
      claims.delete(s);
      changed = true;
    }
  }
  return changed;
}

/** Flatten to the seatId -> userId shape the scene renders from. */
export function toSeatMap(claims: ClaimMap): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const id of SEAT_IDS) out[id] = claims.get(id)?.userId ?? null;
  return out;
}

/** Which seat a given person holds, or null. */
export function seatOf(claims: ClaimMap, userId: string): SeatId | null {
  for (const [seat, claim] of claims) {
    if (claim.userId === userId) return seat;
  }
  return null;
}

/** Is this a seat id we know about? Guards against a malformed message. */
export function isSeatId(value: unknown): value is SeatId {
  return (
    typeof value === 'string' && (SEAT_IDS as readonly string[]).includes(value)
  );
}

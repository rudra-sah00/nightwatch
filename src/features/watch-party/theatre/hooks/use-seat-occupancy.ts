'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickAutoSeat, SEAT_IDS, type SeatId } from '../lib/layout';
import {
  applyClaim as applyClaimTo,
  type ClaimMap,
  isSeatId,
  seatOf,
  toSeatMap,
  vacate as vacateIn,
} from '../lib/seat-claims';

interface UseSeatOccupancyOptions {
  userId: string;
  /**
   * Broadcast a claim, or a stand-up with null. Returns the server time it was
   * stamped with.
   *
   * Supplied by the relay rather than by a generic message sender, because the
   * timestamp has to come from the same clock everybody else's does — see the note on
   * `at` below.
   */
  claimSeatOnRelay?: (seatId: string | null) => number;
  /**
   * Ids the party roster says are present right now.
   *
   * With the relay this is the roster itself: a socket closing IS the departure, so a
   * member absent from here has genuinely gone rather than merely being quiet.
   *
   * Seats are still reconciled against it, because a seat held by someone no longer in
   * the room is worse than a stale avatar — the deterministic rule makes it
   * UNTAKEABLE. A ghost claim carries an early timestamp, so every later claim on that
   * chair loses to it and the seat is reserved for somebody who left.
   */
  memberIds?: readonly string[];
  /** Track claims at all. True for the whole party session, in 2D as well as 3D. */
  enabled: boolean;
  /**
   * Whether the 3D scene is on screen.
   *
   * The ONLY thing this gates is the automatic first seat: you are sat down when you
   * enter the room, not when the party starts around you. Claim traffic is tracked
   * either way.
   */
  active?: boolean;
}

/**
 * Who is sitting where.
 *
 * ---- WHERE THIS LIVES, AND WHY IT IS NOT IN THE SCENE ----
 *
 * Mounted by `WatchPartyVideoArea`, ABOVE the 2D/3D switch, and runs for the whole
 * party — not inside `TheatreScene`, which is unmounted the moment the view mode goes
 * back to `2d`.
 *
 * It used to live in the scene, and that single fact caused every seating bug in the
 * 2D <-> 3D round trip: your own seat was destroyed on the way out, you never told
 * anyone you had got up, and everyone else's claims went stale while you were away.
 *
 * Nothing here touches three.js, and `layout.ts` is dependency-free constants.
 *
 * ---- WHY THERE IS NO ARBITER, EVEN NOW THERE IS A SERVER ----
 *
 * The relay observes claims and replays them to late joiners, but it does not judge
 * them. Admission to the party is already the permission boundary — once the host has
 * approved a member they may sit anywhere — so arbitrating a claim guards nothing
 * while adding a round trip and a single point of failure.
 *
 * Claims are broadcast and applied optimistically, and two people can grab the same
 * seat in the same instant. That resolves without a referee because the rule is
 * deterministic and ORDER-INDEPENDENT: earliest timestamp wins, an exact tie breaks on
 * the lower userId, and applying the same set of claims in any sequence lands every
 * client on the same occupant. `seat-claims.test.ts` covers that property, and it is
 * what lets the relay replay a claim set in arbitrary order.
 *
 * ---- WHAT THE RELAY CHANGED ----
 *
 *  - `at` is now SERVER time. The contest is decided on that field alone, so with wall
 *    clocks two people could each genuinely believe they claimed first. One clock
 *    removes the ambiguity rather than papering over it.
 *  - The relay replays observed claims in `hello`, which retires the "each seated
 *    client re-asserts its own claim on MEMBER_JOINED" mechanism. That existed only
 *    because a late joiner never heard the claims that already fired; a relay that saw
 *    them all can simply say so.
 *  - A claim is released when its holder's socket closes, in the same tick, so a ghost
 *    claim can no longer outlive its owner.
 */
export function useSeatOccupancy({
  userId,
  claimSeatOnRelay,
  memberIds,
  enabled,
  active = false,
}: UseSeatOccupancyOptions) {
  const claims = useRef<ClaimMap>(new Map());
  const [seatMap, setSeatMap] = useState<Record<string, string | null>>({});
  const [mySeat, setMySeat] = useState<SeatId | null>(null);
  /**
   * Whether the automatic seat has had its say.
   *
   * Set once this user is seated, once they stand up of their own accord, or once it is
   * established there is no free chair. The automatic seat is a courtesy on arrival,
   * not a rule: without this, pressing `E` to stand and then flicking to 2D and back
   * would drop you into a chair again, and standing in the aisle would be unreachable.
   */
  const autoSeatResolved = useRef(false);

  const publish = useCallback(() => {
    setSeatMap(toSeatMap(claims.current));
    setMySeat(seatOf(claims.current, userId));
  }, [userId]);

  /**
   * Apply a claim under the deterministic rule. Returns true if it stuck.
   *
   * The rule lives in `lib/seat-claims.ts` so it can be tested without a React tree —
   * it is the thing that makes this design work without a referee, and
   * order-independence is not a property to take on trust.
   */
  const applyClaim = useCallback(
    (seat: SeatId, claimant: string, at: number): boolean => {
      const stuck = applyClaimTo(claims.current, seat, claimant, at);
      publish();
      return stuck;
    },
    [publish],
  );

  const vacate = useCallback(
    (claimant: string) => {
      if (vacateIn(claims.current, claimant)) publish();
    },
    [publish],
  );

  /** Take a seat, or stand up when passed null. */
  const claimSeat = useCallback(
    (seat: SeatId | null) => {
      if (!enabled) return;
      // Stamped by the relay in SERVER time, so every client's contest compares one
      // clock. The local application below uses the very same value.
      const at = claimSeatOnRelay?.(seat) ?? Date.now();
      if (seat === null) {
        // Deliberate, so the automatic seat must not put them back.
        autoSeatResolved.current = true;
        vacate(userId);
      } else {
        applyClaim(seat, userId, at);
      }
    },
    [enabled, userId, claimSeatOnRelay, applyClaim, vacate],
  );

  /**
   * Apply a claim that arrived from the relay, or was replayed in `hello`.
   *
   * Returned rather than subscribed internally, so the component that owns the relay
   * connection can route claims in. Our own claims are already applied optimistically
   * and are skipped here.
   */
  const acceptRemoteClaim = useCallback(
    (claim: { userId: string; seatId: string | null; at: number }) => {
      if (!enabled) return;
      if (claim.userId === userId) return;
      if (claim.seatId === null) {
        vacate(claim.userId);
        return;
      }
      if (!isSeatId(claim.seatId)) return;
      applyClaim(claim.seatId, claim.userId, claim.at);
    },
    [enabled, userId, applyClaim, vacate],
  );

  /*
    ---- release seats held by people who are no longer here ----

    Still reconciled against the roster, even though the relay frees a seat when its
    holder's socket closes. This is the correctness guarantee behind that optimisation:
    it does not matter whether an event fired or was missed, because anyone absent from
    the roster loses their claim on the next pass.

    A stale claim is worse than a stale avatar. The deterministic rule compares
    timestamps, so a ghost claim made minutes ago beats every fresh claim on that chair:
    the seat looks empty, and refuses to be taken.

    `memberIds.length === 0` is treated as "not loaded yet", not "nobody is here". The
    local user is always a member of their own party, so a genuinely populated roster is
    never empty, and without this guard the first pass would evict everyone including
    ourselves.
  */
  useEffect(() => {
    if (!enabled || !memberIds || memberIds.length === 0) return;

    const present = new Set(memberIds);
    // Collected first, vacated after: `vacate` deletes from the same Map, and deleting
    // during a `for...of` over it happens to work here only because nobody holds two
    // seats.
    const ghosts = new Set<string>();
    for (const [, claim] of claims.current) {
      if (!present.has(claim.userId)) ghosts.add(claim.userId);
    }
    if (ghosts.size === 0) return;

    let changed = false;
    for (const ghost of ghosts) {
      if (vacateIn(claims.current, ghost)) changed = true;
    }
    if (changed) publish();
  }, [enabled, memberIds, publish]);

  /*
    ---- sit down on arrival ----

    Everyone is seated when they enter 3D. The room's whole point is the screen, and the
    spawn point is on the rear platform behind both rows, so an unseated arrival's first
    frame is the backs of other people's heads with the picture below eye line. Walking
    is something you then choose to do.

    Which chair is derived from the user id (`pickAutoSeat`), not from a fixed preference
    order: a fixed list would have every simultaneous arrival reach for A1 and lose the
    contest in turn, visibly bounced out of the same chair.

    Contests are still possible, and this effect IS the retry — it re-runs when `seatMap`
    changes, which is exactly what a lost claim produces, and picks the next seat free by
    then. `attempts` bounds that: a full room must not spin.
  */
  const attempts = useRef(0);
  useEffect(() => {
    if (!enabled || !active) return;
    if (autoSeatResolved.current) return;
    if (mySeat !== null) {
      // Seated: nothing to do, and the run of failures is over. NOT latched — a claim
      // with an earlier timestamp can still evict us at any point, and being dumped on
      // our feet in the aisle is the state this exists to avoid.
      attempts.current = 0;
      return;
    }
    // An empty roster means it has not loaded yet. Claiming before then is harmless but
    // pointless: nobody is listening to broadcast it to.
    if (!memberIds || memberIds.length === 0) return;

    if (attempts.current >= SEAT_IDS.length) {
      // Ten consecutive losses without ever sitting down is not contention, it is a
      // loop. Stop, rather than broadcast a claim per render for ever.
      autoSeatResolved.current = true;
      return;
    }

    const seat = pickAutoSeat(userId, seatMap);
    if (!seat) {
      // Nowhere to put them. Standing is the honest answer, and it must STAY the
      // answer: latching here is what stops someone being yanked into a chair twenty
      // minutes later, mid-stride, because a seat happened to free up.
      autoSeatResolved.current = true;
      return;
    }
    attempts.current += 1;
    claimSeat(seat);
  }, [enabled, active, userId, memberIds, seatMap, mySeat, claimSeat]);

  /*
    ---- leaving 3D keeps your seat ----

    There is nothing to reset here, and that is the point. A claim is party state, not
    scene state: it must outlive the renderer so returning to 3D puts you back in your
    own chair, and so peers who fall back to drawing you passively draw you where you
    actually are (see `assignPassiveSeats`).

    The claim map is only ever emptied by leaving the party, which unmounts this hook
    along with the rest of the room.
  */

  return { seatMap, mySeat, claimSeat, acceptRemoteClaim };
}

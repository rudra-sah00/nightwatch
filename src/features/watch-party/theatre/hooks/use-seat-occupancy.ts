'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  onMemberJoined,
  onMemberLeft,
  onSeatClaim,
} from '../../room/services/watch-party.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { pickAutoSeat, SEAT_IDS, type SeatId } from '../lib/layout';
import {
  applyClaim as applyClaimTo,
  type ClaimMap,
  isSeatId,
  type SeatClaim,
  seatOf,
  toSeatMap,
  vacate as vacateIn,
} from '../lib/seat-claims';

interface UseSeatOccupancyOptions {
  userId: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  /**
   * Ids the party roster says are present right now, already excluding
   * `disconnected` members (see `presentMemberIds`).
   *
   * Seats are reconciled against this for the same reason avatars are: a seat held
   * by someone who is no longer in the room is worse than a stale avatar, because
   * the deterministic rule makes it UNTAKEABLE. A ghost claim carries an early
   * timestamp, so every later claim on that chair loses to it and the seat is
   * reserved for somebody who left.
   */
  memberIds?: readonly string[];
  /**
   * Track claims at all. True for the whole party session, in 2D as well as 3D —
   * see the note on this hook's placement below.
   */
  enabled: boolean;
  /**
   * Whether the 3D scene is on screen.
   *
   * The ONLY thing this gates is the automatic first seat: you are sat down when
   * you enter the room, not when the party starts around you. Claim traffic is
   * tracked either way.
   */
  active?: boolean;
}

/**
 * Who is sitting where.
 *
 * ---- WHERE THIS LIVES, AND WHY IT IS NOT IN THE SCENE ----
 *
 * This hook is mounted by `WatchPartyVideoArea`, ABOVE the 2D/3D switch, and runs
 * for the whole party — not inside `TheatreScene`, which is unmounted the moment
 * the view mode goes back to `2d`.
 *
 * It used to live in the scene, and that single fact caused every seating bug in
 * the 2D <-> 3D round trip:
 *
 *  - Your own seat was DESTROYED on the way out. Coming back re-mounted the hook
 *    with an empty claim map, so you respawned standing on the rear platform
 *    however long you had been sitting.
 *  - You never told anyone you had got up, because nothing broadcast
 *    `SEAT_CLAIM null`. Peers kept your claim, so the chair stayed yours — and
 *    the deterministic rule made it untakeable, since your old timestamp beats
 *    every later claim on it.
 *  - Everyone else's claims went stale while you were in 2D, because the
 *    subscription was gone. On re-entry you could sit in a chair the rest of the
 *    room had watched somebody else take.
 *
 * Nothing here touches three.js, and `layout.ts` is dependency-free constants, so
 * hoisting it costs the 2D bundle a few kilobytes of arithmetic and no renderer.
 *
 * ---- WHY THERE IS NO ARBITER ----
 *
 * Admission to the party is already the permission boundary — once the host has
 * approved a member they may sit anywhere, so routing every claim through the
 * host would add a round trip and a single point of failure to guard something
 * that is not actually restricted.
 *
 * Claims are broadcast and applied optimistically, which means two people can
 * grab the same seat in the same instant. That is resolved without a referee by
 * making the rule deterministic and identical on every client: earliest
 * timestamp wins, and an exact tie breaks on the lower userId. Every client
 * therefore converges on the same occupant without anyone adjudicating, and the
 * loser is bounced back to standing.
 */
export function useSeatOccupancy({
  userId,
  rtmSendMessage,
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
   * Set once this user is seated, once they stand up of their own accord, or once
   * it is established there is no free chair. The automatic seat is a courtesy on
   * arrival, not a rule: without this, pressing `E` to stand and then flicking
   * 2D and back would drop you into a chair again, and standing in the aisle
   * would be unreachable.
   */
  const autoSeatResolved = useRef(false);

  const publish = useCallback(() => {
    setSeatMap(toSeatMap(claims.current));
    setMySeat(seatOf(claims.current, userId));
  }, [userId]);

  /**
   * Apply a claim under the deterministic rule. Returns true if it stuck.
   *
   * The rule itself lives in `lib/seat-claims.ts` so it can be tested without a
   * React tree — it is the thing that makes this design work without a referee,
   * and order-independence is not a property you want to take on trust.
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
      const at = Date.now();
      if (seat === null) {
        // Deliberate, so the automatic seat must not put them back.
        autoSeatResolved.current = true;
        vacate(userId);
      } else {
        applyClaim(seat, userId, at);
      }
      rtmSendMessage?.({
        type: 'SEAT_CLAIM',
        userId,
        seatId: seat,
        at,
      });
    },
    [enabled, userId, rtmSendMessage, applyClaim, vacate],
  );

  useEffect(() => {
    if (!enabled) return;
    const offClaim = onSeatClaim((c) => {
      if (c.userId === userId) return; // our own claim is already applied
      if (c.seatId === null) {
        vacate(c.userId);
        return;
      }
      if (!isSeatId(c.seatId)) return;
      applyClaim(c.seatId, c.userId, c.at);
    });
    // someone leaving the party frees their seat immediately
    const offLeave = onMemberLeft((id) => vacate(id));
    return () => {
      offClaim();
      offLeave();
    };
  }, [enabled, userId, applyClaim, vacate]);

  /*
    ---- re-assert our own seat when somebody new arrives ----

    Claims are only ever broadcast at the moment they happen, so a member who
    joins later never hears the ones that already fired and starts with every seat
    apparently free. That is worse than cosmetic: they can claim an occupied chair
    and it STICKS locally, because their client knows of no earlier claim to lose
    to. Everyone else rejects it on timestamp, so the newcomer believes they are
    seated in a chair the rest of the room shows as someone else's, and two avatars
    end up in one seat. Their passive-avatar layer would also seat 2D members into
    chairs it thinks are empty.

    Each client re-asserting its OWN claim is the fix that preserves the no-referee
    design: broadcasting a whole SEAT_MAP would mean electing an authority to own
    it, which is the host-arbitrated model this hook deliberately avoids.

    The original timestamp is re-sent, never a fresh one. `at` is what the
    deterministic rule compares, so re-announcing with `Date.now()` would make a
    sitting player lose their own seat to whoever claimed it most recently.
  */
  useEffect(() => {
    if (!enabled || !rtmSendMessage) return;
    return onMemberJoined(() => {
      const seat = seatOf(claims.current, userId);
      if (seat === null) return;
      const claim: SeatClaim | undefined = claims.current.get(seat);
      if (!claim) return;
      rtmSendMessage({
        type: 'SEAT_CLAIM',
        userId,
        seatId: seat,
        at: claim.at,
      });
    });
  }, [enabled, rtmSendMessage, userId]);

  /*
    ---- release seats held by people who are no longer here ----

    `MEMBER_LEFT` covers a deliberate exit, but the common case is a closed tab or
    a dropped connection, which only ever surfaces as an Agora presence LEAVE —
    that marks the member `disconnected` and leaves them in `room.members`. No
    MEMBER_LEFT is emitted, so this hook never heard about it and their claim
    stayed in the map for the rest of the session.

    A stale claim is worse than a stale avatar. The deterministic rule compares
    timestamps, so a ghost claim made minutes ago beats every fresh claim on that
    chair: the seat looks empty, and refuses to be taken.

    Reconciling against the roster is idempotent and self-healing, exactly as it is
    for poses — it does not matter which signal fired or whether one was missed.

    `memberIds.length === 0` is treated as "not loaded yet", not "nobody is here".
    The local user is always a member of their own party, so a genuinely populated
    roster is never empty, and without this guard the first pass would evict
    everyone including ourselves.
  */
  useEffect(() => {
    if (!enabled || !memberIds || memberIds.length === 0) return;

    const present = new Set(memberIds);
    // Collected first, vacated after. `vacate` deletes from the same Map, and
    // deleting during a `for...of` over it is a pattern that happens to work here
    // only because nobody holds two seats. `use-theatre-network` reconciles the
    // same way, for the same reason.
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

    Everyone is seated when they enter 3D. The room's whole point is the screen,
    and the spawn point is on the rear platform behind both rows, so an unseated
    arrival's first frame is the backs of other people's heads with the picture
    2 m below eye line. Walking is something you then choose to do.

    Which chair is derived from the user id (`pickAutoSeat`), not from a fixed
    preference order: a fixed list would have every simultaneous arrival reach for
    A1 and lose the contest in turn, visibly bounced out of the same chair.

    Contests are still possible, and this effect IS the retry — it re-runs when
    `seatMap` changes, which is exactly what a lost claim produces, and picks the
    next seat that is free by then. `attempts` bounds that: a full room must not
    spin, and ten tries is more than the ten seats can justify.

    Deliberately not run while `stoodUp` — see the ref.
  */
  const attempts = useRef(0);
  useEffect(() => {
    if (!enabled || !active) return;
    if (autoSeatResolved.current) return;
    if (mySeat !== null) {
      // Seated: nothing to do, and the run of failures is over. NOT latched —
      // a claim with an earlier timestamp can still evict us at any point, and
      // being dumped on our feet in the aisle is the state this exists to avoid.
      attempts.current = 0;
      return;
    }
    // An empty roster means it has not loaded yet. Claiming before then is
    // harmless but pointless: nobody is listening to broadcast it to.
    if (!memberIds || memberIds.length === 0) return;

    if (attempts.current >= SEAT_IDS.length) {
      // Ten consecutive losses without ever sitting down is not contention, it is
      // a loop. Stop, rather than broadcast a claim per render for ever.
      autoSeatResolved.current = true;
      return;
    }

    const seat = pickAutoSeat(userId, seatMap);
    if (!seat) {
      // Nowhere to put them. Standing is the honest answer, and it must STAY the
      // answer: latching here is what stops someone being yanked into a chair
      // twenty minutes later, mid-stride, because a seat happened to free up.
      autoSeatResolved.current = true;
      return;
    }
    attempts.current += 1;
    claimSeat(seat);
  }, [enabled, active, userId, memberIds, seatMap, mySeat, claimSeat]);

  /*
    ---- leaving 3D keeps your seat ----

    There is nothing to reset here, and that is the point. A claim is party state,
    not scene state: it must outlive the renderer so returning to 3D puts you back
    in your own chair, and so peers who fall back to drawing you passively draw you
    where you actually are (see `assignPassiveSeats`).

    The claim map is only ever emptied by leaving the party, which unmounts this
    hook along with the rest of the room.
  */

  return { seatMap, mySeat, claimSeat };
}

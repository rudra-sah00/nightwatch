'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  onMemberJoined,
  onMemberLeft,
  onSeatClaim,
} from '../../room/services/watch-party.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import type { SeatId } from '../lib/layout';
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
  enabled: boolean;
}

/**
 * Who is sitting where.
 *
 * Deliberately NOT host-arbitrated. Admission to the party is already the
 * permission boundary — once the host has approved a member they may sit
 * anywhere, so routing every claim through the host would add a round trip and a
 * single point of failure to guard something that is not actually restricted.
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
}: UseSeatOccupancyOptions) {
  const claims = useRef<ClaimMap>(new Map());
  const [seatMap, setSeatMap] = useState<Record<string, string | null>>({});
  const [mySeat, setMySeat] = useState<SeatId | null>(null);

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
    let changed = false;
    for (const [, claim] of claims.current) {
      if (present.has(claim.userId)) continue;
      if (vacateIn(claims.current, claim.userId)) changed = true;
    }
    if (changed) publish();
  }, [enabled, memberIds, publish]);

  useEffect(() => {
    if (enabled) return;
    claims.current.clear();
    setSeatMap({});
    setMySeat(null);
  }, [enabled]);

  return { seatMap, mySeat, claimSeat };
}

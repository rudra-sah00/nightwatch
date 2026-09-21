'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { onMemberLeft, onSeatClaim } from '../../room/services/watch-party.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { SEAT_IDS, type SeatId } from '../lib/layout';

interface Claim {
  userId: string;
  /** Claim timestamp, used only to resolve two people grabbing one seat. */
  at: number;
}

interface UseSeatOccupancyOptions {
  userId: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
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
  enabled,
}: UseSeatOccupancyOptions) {
  const claims = useRef<Map<SeatId, Claim>>(new Map());
  const [seatMap, setSeatMap] = useState<Record<string, string | null>>({});
  const [mySeat, setMySeat] = useState<SeatId | null>(null);

  const publish = useCallback(() => {
    const next: Record<string, string | null> = {};
    for (const id of SEAT_IDS) {
      next[id] = claims.current.get(id)?.userId ?? null;
    }
    setSeatMap(next);
    let mine: SeatId | null = null;
    for (const [seat, claim] of claims.current) {
      if (claim.userId === userId) mine = seat;
    }
    setMySeat(mine);
  }, [userId]);

  /** Apply a claim under the deterministic rule. Returns true if it stuck. */
  const applyClaim = useCallback(
    (seat: SeatId, claimant: string, at: number): boolean => {
      // a person occupies at most one seat; vacate any previous one
      for (const [s, c] of claims.current) {
        if (c.userId === claimant && s !== seat) claims.current.delete(s);
      }
      const existing = claims.current.get(seat);
      if (existing && existing.userId !== claimant) {
        const incomingWins =
          at < existing.at ||
          (at === existing.at && claimant < existing.userId);
        if (!incomingWins) {
          publish();
          return false;
        }
      }
      claims.current.set(seat, { userId: claimant, at });
      publish();
      return true;
    },
    [publish],
  );

  const vacate = useCallback(
    (claimant: string) => {
      let changed = false;
      for (const [s, c] of claims.current) {
        if (c.userId === claimant) {
          claims.current.delete(s);
          changed = true;
        }
      }
      if (changed) publish();
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
      if (!SEAT_IDS.includes(c.seatId as SeatId)) return;
      applyClaim(c.seatId as SeatId, c.userId, c.at);
    });
    // someone leaving the party frees their seat immediately
    const offLeave = onMemberLeft((id) => vacate(id));
    return () => {
      offClaim();
      offLeave();
    };
  }, [enabled, userId, applyClaim, vacate]);

  useEffect(() => {
    if (enabled) return;
    claims.current.clear();
    setSeatMap({});
    setMySeat(null);
  }, [enabled]);

  return { seatMap, mySeat, claimSeat };
}

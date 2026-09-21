'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEATS, type SeatId, SIT_PROMPT_RADIUS } from '../lib/layout';

interface UseSitInteractionOptions {
  /** seatId -> occupant, or null when free. */
  seatMap: Record<string, string | null>;
  /** Seat the local player currently occupies. */
  mySeat: SeatId | null;
  /** Take a seat, or stand when passed null. */
  claimSeat: (seat: SeatId | null) => void;
  enabled: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * `E` to sit down and stand up.
 *
 * Proximity is measured against the seat PAD, not the chair mesh — the pad is the
 * spot you stand on to sit, so this stays readable at a distance and does not
 * depend on precise aim. Same pattern as VRChat stations.
 *
 * Only free seats are offered. Because seat claims are not host-arbitrated, two
 * people can still grab one seat in the same instant; that is resolved in
 * `use-seat-occupancy` by a rule every client evaluates identically, and the
 * loser is returned to standing.
 */
export function useSitInteraction({
  seatMap,
  mySeat,
  claimSeat,
  enabled,
}: UseSitInteractionOptions) {
  const camera = useThree((s) => s.camera);
  const [nearestFree, setNearestFree] = useState<SeatId | null>(null);
  const nearestRef = useRef<SeatId | null>(null);
  const seatMapRef = useRef(seatMap);
  seatMapRef.current = seatMap;
  const mySeatRef = useRef(mySeat);
  mySeatRef.current = mySeat;

  useFrame(() => {
    if (!enabled || mySeatRef.current) {
      if (nearestRef.current !== null) {
        nearestRef.current = null;
        setNearestFree(null);
      }
      return;
    }
    const p = camera.position;
    let best: SeatId | null = null;
    let bestDist = SIT_PROMPT_RADIUS;
    for (const seat of SEATS) {
      if (seatMapRef.current[seat.id]) continue; // taken
      const dx = p.x - seat.pad.x;
      const dz = p.z - seat.pad.z;
      const d = Math.hypot(dx, dz);
      if (d < bestDist) {
        bestDist = d;
        best = seat.id;
      }
    }
    if (best !== nearestRef.current) {
      nearestRef.current = best;
      setNearestFree(best);
    }
  });

  const toggle = useCallback(() => {
    if (mySeatRef.current) {
      claimSeat(null);
      return;
    }
    const target = nearestRef.current;
    if (target) claimSeat(target);
  }, [claimSeat]);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;
      // chat is the real hazard: typing "e" must not seat you mid-sentence
      if (isTypingTarget(e.target)) return;
      if (!mySeatRef.current && !nearestRef.current) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, toggle]);

  return {
    /** Free seat in range, for the "Press E to sit" prompt. */
    nearestFree,
    /** True when seated, so the caller can disable the walk controller. */
    seated: mySeat !== null,
  };
}

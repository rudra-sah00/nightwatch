'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DANCE_CLIPS } from '../lib/animation';
import { wheelSelection } from '../lib/dance-rules';
import { isTypingTarget } from '../lib/keyboard';

/** Human labels for the wheel. Clip names are internal, not user-facing. */
export const DANCE_LABELS: Readonly<Record<string, string>> = {
  'Dance.Sway': 'Sway',
  'Dance.Bounce': 'Bounce',
  'Dance.Twist': 'Twist',
  'Emote.Cheer': 'Cheer',
  'Emote.Clap': 'Clap',
};

export interface DanceMenuState {
  /** Wheel is on screen because R is held. */
  open: boolean;
  /** Screen position the wheel is drawn around. */
  origin: { x: number; y: number };
  /** Index into DANCE_CLIPS under the cursor, or null inside the dead zone. */
  hovered: number | null;
  /** Currently playing dance clip, or null. */
  dance: string | null;
}

interface UseDanceMenuOptions {
  /** Available at all only while free-walking in 3D. */
  enabled: boolean;
  /** Sitting down blocks dancing. */
  seated: boolean;
  /** Is there physically room here? Evaluated when D is pressed. */
  canDanceHere: () => boolean;
  /** Called when a dance is refused, so the caller can explain why. */
  onRefused?: (reason: 'seated' | 'no-space') => void;
}

/**
 * Hold-D radial dance picker.
 *
 * Press and hold R to open a wheel of dances, move the cursor toward one, release
 * to commit. Releasing without moving cancels — see `WHEEL_DEAD_ZONE_PX`. This
 * replaces the old number-key bindings: 1/2/3 were undiscoverable, gave no
 * indication that dances existed at all, and silently did nothing when a dance
 * was not possible.
 *
 * The pointer must be UNLOCKED while the wheel is open, because a locked pointer
 * reports only relative movement and has no on-screen cursor to aim with. The
 * caller is responsible for that: it switches `usePointerLook` off while `open`
 * is true, which releases the pointer, and back on afterwards, which re-acquires
 * it. Doing it here would mean two hooks fighting over the same lock.
 *
 * Eligibility is checked on PRESS, not on release. Being told why you cannot
 * dance is useful the moment you ask; discovering it after choosing a dance from
 * a menu that should not have opened is not.
 */
export function useDanceMenu({
  enabled,
  seated,
  canDanceHere,
  onRefused,
}: UseDanceMenuOptions) {
  const [state, setState] = useState<DanceMenuState>({
    open: false,
    origin: { x: 0, y: 0 },
    hovered: null,
    dance: null,
  });

  // Read inside window listeners that are registered once.
  const openRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<number | null>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const seatedRef = useRef(seated);
  seatedRef.current = seated;
  const canRef = useRef(canDanceHere);
  canRef.current = canDanceHere;
  const refusedRef = useRef(onRefused);
  refusedRef.current = onRefused;

  const stop = useCallback(() => {
    setState((s) => (s.dance === null ? s : { ...s, dance: null }));
  }, []);

  useEffect(() => {
    if (!enabled) {
      openRef.current = false;
      setState({
        open: false,
        origin: { x: 0, y: 0 },
        hovered: null,
        dance: null,
      });
      return;
    }

    function track(e: MouseEvent) {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      if (!openRef.current) return;
      const o = originRef.current;
      const next = wheelSelection(
        e.clientX - o.x,
        e.clientY - o.y,
        DANCE_CLIPS.length,
      );
      if (next !== hoveredRef.current) {
        hoveredRef.current = next;
        setState((s) => ({ ...s, hovered: next }));
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();

      // Moving cancels a dance: the walk controller owns the animation state
      // while you are walking and the two would otherwise fight. `d` is now a
      // plain movement key, so there is no longer an exception here.
      if (['w', 'a', 's', 'd'].includes(key)) {
        stop();
        return;
      }

      if (key !== 'r') return;
      e.preventDefault();
      if (e.repeat) return; // holding fires repeats; only the first opens

      if (seatedRef.current) {
        refusedRef.current?.('seated');
        return;
      }
      if (!canRef.current()) {
        refusedRef.current?.('no-space');
        return;
      }

      // Centre the wheel where the cursor already is, so the first flick in any
      // direction is a deliberate choice rather than a correction.
      openRef.current = true;
      originRef.current = { ...cursorRef.current };
      hoveredRef.current = null;
      setState((s) => ({
        ...s,
        open: true,
        origin: { ...cursorRef.current },
        hovered: null,
      }));
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'r') return;
      if (!openRef.current) return;
      openRef.current = false;
      const picked = hoveredRef.current;
      const clip = picked === null ? null : (DANCE_CLIPS[picked] ?? null);
      setState((s) => ({
        ...s,
        open: false,
        hovered: null,
        // Releasing inside the dead zone cancels and leaves any current dance
        // alone, rather than stopping it — opening the wheel by accident should
        // not interrupt what you were already doing.
        dance: clip === null ? s.dance : clip === s.dance ? null : clip,
      }));
    }

    // Losing focus mid-hold would otherwise leave the wheel stuck open with the
    // pointer unlocked.
    function onBlur() {
      if (!openRef.current) return;
      openRef.current = false;
      hoveredRef.current = null;
      setState((s) => ({ ...s, open: false, hovered: null }));
    }

    window.addEventListener('mousemove', track);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('mousemove', track);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, stop]);

  // Standing up or sitting down must not leave you dancing in a chair.
  useEffect(() => {
    if (seated) stop();
  }, [seated, stop]);

  return { ...state, stop };
}

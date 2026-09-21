'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isTypingTarget } from '../lib/keyboard';
import { GATE } from '../lib/layout';

/**
 * How close you must stand for `E` to work on the doors, metres.
 *
 * Deliberately larger than `SIT_PROMPT_RADIUS` (1.0): a doorway is approached
 * head-on from open floor, whereas a seat is stepped onto precisely. The two
 * ranges cannot overlap — the gate is at z = 8.6 and the nearest seat pad is at
 * z = 5.68, so the closest they come is 1.3 m apart — which is why the sit and
 * gate handlers can both listen on `E` without arbitrating between them.
 */
export const GATE_PROMPT_RADIUS = 1.6;

/** Seconds for a leaf to swing through its full arc. */
const SWING_SECONDS = 0.9;

export interface GateInteraction {
  /** True when the local player is close enough to use the doors. */
  inRange: boolean;
  /** Current door state. */
  open: boolean;
  /** 0 shut, 1 fully open. Drives the leaf rotation. */
  progress: number;
}

/**
 * `E` opens and closes the cafe doors.
 *
 * The doors were modelled and exported but never wired to anything, so they
 * stood permanently shut. They are two leaves hinged at the jambs, swinging into
 * the cafe.
 *
 * The doorway itself has no collider either way — `TheatreColliders` splits the
 * back wall around the gate so the threshold is always walkable. Blocking a shut
 * door would need the state shared over RTM first, or one client's shut door
 * becomes an invisible wall to everyone standing on the other side of it.
 */
export function useGateInteraction(enabled: boolean): GateInteraction {
  const camera = useThree((s) => s.camera);
  const [inRange, setInRange] = useState(false);
  const [open, setOpen] = useState(false);
  const inRangeRef = useRef(false);
  const openRef = useRef(false);
  const progress = useRef(0);
  const [progressState, setProgressState] = useState(0);

  useFrame((_, delta) => {
    if (!enabled) return;

    const p = camera.position;
    // Horizontal distance to the doorway centre. Height is ignored: the platform
    // and the cafe floor are both at 0.45 so it adds nothing but noise.
    const cx = Math.min(GATE.maxX, Math.max(GATE.minX, p.x));
    const near =
      Math.hypot(p.x - cx, p.z - GATE.z) <= GATE_PROMPT_RADIUS ||
      Math.hypot(p.x, p.z - GATE.z) <= GATE_PROMPT_RADIUS;

    if (near !== inRangeRef.current) {
      inRangeRef.current = near;
      setInRange(near);
    }

    const target = openRef.current ? 1 : 0;
    if (progress.current !== target) {
      const step = delta / SWING_SECONDS;
      progress.current =
        target > progress.current
          ? Math.min(target, progress.current + step)
          : Math.max(target, progress.current - step);
      setProgressState(progress.current);
    }
  });

  const toggle = useCallback(() => {
    openRef.current = !openRef.current;
    setOpen(openRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (!inRangeRef.current) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, toggle]);

  return { inRange, open, progress: progressState };
}

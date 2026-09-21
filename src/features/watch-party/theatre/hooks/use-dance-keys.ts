'use client';

import { useCallback, useEffect, useState } from 'react';
import { DANCE_CLIPS } from '../lib/animation';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * Dance toggles on the number keys.
 *
 * `1`–`3` pick a dance, and pressing the same key again stops it. Only in-place
 * clips are registered in `DANCE_CLIPS`; a travelling clip would walk the avatar
 * out of the room, since locomotion is driven by physics and the clip has no say
 * in where the capsule goes.
 *
 * Dancing is dropped the moment you move, because the walk controller owns the
 * animation state while you are walking and the two would otherwise fight.
 */
export function useDanceKeys(enabled: boolean) {
  const [dance, setDance] = useState<string | null>(null);

  const stop = useCallback(() => setDance(null), []);

  useEffect(() => {
    if (!enabled) {
      setDance(null);
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;

      // movement cancels a dance
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        setDance(null);
        return;
      }
      const index = Number.parseInt(e.key, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= DANCE_CLIPS.length) {
        return;
      }
      e.preventDefault();
      const clip = DANCE_CLIPS[index];
      setDance((current) => (current === clip ? null : clip));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  return { dance, stop };
}

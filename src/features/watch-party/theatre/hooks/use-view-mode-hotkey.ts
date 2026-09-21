'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useTheatreView, viewModeLabel } from '../lib/view-mode';

/** True when the user is typing and must keep the keystroke. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * `V` cycles 2D -> 3D -> screen focus -> 2D.
 *
 * `V` was chosen because it is unbound in the existing player, which uses
 * K/J/L/M/F, Space and the arrow keys. Chat is the real hazard here, not the
 * player: without the typing guard, typing "v" in a message would throw the
 * room into 3D mid-sentence.
 *
 * Modifier combinations are ignored so Ctrl/Cmd+V still pastes.
 */
export function useViewModeHotkey(active: boolean) {
  const cycle = useTheatreView((s) => s.cycle);
  const phase = useTheatreView((s) => s.phase);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'v' && e.key !== 'V') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave paste alone
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;

      if (phase !== 'ready') {
        toast.info('3D theatre is not enabled', {
          description: 'Turn it on in watch party settings.',
        });
        return;
      }

      e.preventDefault();
      cycle();
      // read the mode after the store has advanced
      const next = useTheatreView.getState().mode;
      toast(viewModeLabel(next), { duration: 1500 });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, cycle, phase]);
}

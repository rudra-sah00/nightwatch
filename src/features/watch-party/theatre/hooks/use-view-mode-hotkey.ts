'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { isTypingTarget } from '../lib/keyboard';
import { useTheatreView, viewModeLabel } from '../lib/view-mode';

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
  const enabled = useTheatreView((s) => s.enabled);
  const progress = useTheatreView((s) => s.progress);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'v' && e.key !== 'V') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave paste alone
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;

      // Each not-ready state needs its own explanation. Telling someone to
      // "turn it on in settings" while their download is at 60% is simply wrong,
      // and it was what this said before.
      if (phase !== 'ready') {
        e.preventDefault();
        if (!enabled) {
          toast.info('3D theatre is not enabled', {
            description: 'Turn it on in watch party settings.',
          });
        } else if (phase === 'downloading') {
          toast.info(`Still downloading — ${Math.round(progress * 100)}%`, {
            description:
              'The whole room has to arrive before you can walk into it.',
          });
        } else if (phase === 'error') {
          toast.error('3D assets failed to download', {
            description: 'Toggle 3D Theatre off and on to retry.',
          });
        } else {
          toast.info('3D theatre is getting ready', {
            description: 'One moment.',
          });
        }
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
  }, [active, cycle, phase, enabled, progress]);
}

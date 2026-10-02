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
  const enable = useTheatreView((s) => s.enable);
  const showProgress = useTheatreView((s) => s.showProgress);

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
      //
      // A stable id on each of these keeps a mashed V key from stacking a column
      // of identical toasts.
      if (phase !== 'ready') {
        e.preventDefault();
        if (!enabled) {
          // Auto-enable 3D and start the asset download. Previously this showed
          // a toast telling the user to find the toggle in settings, which most
          // joined members never found — they pressed V, saw a brief toast, and
          // concluded 3D was broken. Enabling directly makes V a one-press
          // action: the download starts, the progress card appears, and the next
          // V press after it finishes enters the room.
          enable();
          toast.info('Downloading 3D theatre assets…', {
            description: 'Press V again once ready.',
            id: 'theatre-not-enabled',
          });
        } else if (phase === 'downloading' || phase === 'error') {
          // Pressing V is the moment someone actually wants to know how far the
          // download has got, so reveal the progress card rather than describing
          // it in words. It is not shown before this: an unasked-for notification
          // pinned up for the whole transfer is noise.
          showProgress();
        } else {
          toast.info('3D theatre is getting ready', {
            description: 'One moment.',
            id: 'theatre-getting-ready',
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
  }, [active, cycle, phase, enabled, enable, showProgress]);
}

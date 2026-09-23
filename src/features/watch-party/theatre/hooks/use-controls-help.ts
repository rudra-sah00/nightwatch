'use client';

import { useCallback, useEffect, useState } from 'react';
import { isTypingTarget } from '../lib/keyboard';

/** Remembers that this browser has been shown the card once. */
const SEEN_KEY = 'nightwatch.theatre.controlsSeen';

function alreadySeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private-mode Safari throws on localStorage. Showing the card again is a far
    // better failure than never showing it.
    return false;
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Not fatal — the card just gets offered again next session.
  }
}

/**
 * `H` opens the controls card, and the first visit opens it unasked.
 *
 * Both halves matter. A keyboard-only room whose keys are written down nowhere is
 * not discoverable by pressing things: `WASD` is guessable, `R` and `V` are not,
 * and `E` announces itself only once you are already standing on a seat pad. So the
 * card is shown on the first entry to 3D, once per browser, and after that it is a
 * key away with a permanent hint in the corner.
 *
 * `?` opens it too, which is the other convention people arrive with. Escape closes.
 *
 * Deliberately does NOT take focus or release the pointer lock. The card is a
 * reference, not a dialog — you can keep walking while it is up, and taking the
 * cursor back would mean the first thing a new player experiences is their mouse
 * being wrested away. It is closed the way it was opened, and says so on itself.
 *
 * @param active - Whether the 3D scene is on screen.
 */
export function useControlsHelp(active: boolean) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // First entry: show it, once per browser.
  useEffect(() => {
    if (!active) return;
    if (alreadySeen()) return;
    markSeen();
    setOpen(true);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key;
      // `?` is Shift+/ on most layouts, so it arrives with shiftKey set — which is
      // why the modifier guard above lets Shift through. Shift alone is also the
      // run key, and a bare Shift press has key === 'Shift', matching nothing here.
      if (key === 'h' || key === 'H' || key === '?') {
        event.preventDefault();
        toggle();
        return;
      }
      if (key === 'Escape' && open) {
        // Only swallowed while the card is up, so the player keeps Escape for
        // leaving fullscreen the rest of the time.
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, open, toggle, close]);

  // Leaving 3D closes it, so returning does not land you behind a card you had
  // already dismissed.
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  return { open, close, toggle };
}

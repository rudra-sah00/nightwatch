'use client';

import { useEffect } from 'react';
import { isTypingTarget } from '../../theatre/lib/keyboard';

/**
 * `Enter` opens the chat box, the way it does in a game.
 *
 * In 3D the keyboard is the movement controller, so the chat field cannot hold
 * focus by default — `WASD` has to reach the avatar. That leaves the mouse as the
 * only way into the box, and while walking the pointer is locked and the cursor is
 * hidden, so there is effectively no way to start typing at all without first
 * leaving the room. Every game solves this the same way: Enter to type, Enter to
 * send, Escape to go back to the controls.
 *
 * Only bound in 3D. In 2D the field is reachable with a click and the convention
 * would be surprising rather than helpful — and Enter is not the theatre's to take
 * when the theatre is not on screen.
 *
 * Nothing else binds Enter. The player owns Space, `K`/`J`/`L`/`M`/`F`/`C`/`N`,
 * Escape and the arrows; the theatre owns `WASD`, `E`, `R`, `V` and Shift.
 *
 * @param inputRef - The message field to focus.
 * @param active - Whether the 3D scene is on screen and this user may chat.
 */
export function useChatFocusHotkey(
  inputRef: React.RefObject<HTMLInputElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }
      // Already typing: the field's own handler sends. Reaching in here as well
      // would send twice.
      if (isTypingTarget(event.target)) return;
      // Nothing to focus is not an error — the field is absent for a muted member.
      const field = inputRef.current;
      if (!field) return;
      event.preventDefault();
      field.focus();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputRef, active]);
}

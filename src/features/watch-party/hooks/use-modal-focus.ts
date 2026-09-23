'use client';

import { useEffect, useRef } from 'react';

/**
 * Keyboard containment for the party's two hand-rolled modals.
 *
 * Both the leave confirmation and the settings panel are plain overlay divs with
 * `role="dialog"`, and neither trapped focus: Tab walked straight out of the
 * dialog onto the sidebar buttons and player controls behind the backdrop. A
 * keyboard user could operate the party they had just been asked whether to leave,
 * through a blurred backdrop, with no way to tell which surface had focus.
 *
 * One hook rather than two implementations, and deliberately not a full
 * `aria-modal` dialog library: these two overlays are the only ones in the feature
 * and what they were missing is containment, an initial focus target, and Escape —
 * which is all this does.
 *
 * Focus is restored to whatever opened the dialog, because that element is where
 * the user was.
 *
 * @param open - Whether the dialog is mounted and visible.
 * @param onClose - Called on Escape.
 * @returns Ref to put on the dialog container.
 */
export function useModalFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    // Move focus in, so the first Tab does not land outside.
    const first = focusable()[0];
    (first ?? container)?.focus?.();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends. Focus that is somewhere else entirely — the page behind,
      // after a click on the backdrop — is pulled back in rather than left there.
      if (
        !event.shiftKey &&
        (active === lastItem || !container?.contains(active))
      ) {
        event.preventDefault();
        firstItem.focus();
        return;
      }
      if (
        event.shiftKey &&
        (active === firstItem || !container?.contains(active))
      ) {
        event.preventDefault();
        lastItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return containerRef;
}

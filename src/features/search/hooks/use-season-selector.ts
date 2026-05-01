'use client';

import React from 'react';

/**
 * Hook that manages click-outside dismissal for the season-selector
 * dropdown.
 *
 * @param isOpen - Whether the dropdown is currently open.
 * @param onToggle - Callback to toggle the dropdown open/closed.
 * @returns An object containing the `dropdownRef` to attach to the
 *          dropdown container element.
 */
export function useSeasonSelector(isOpen: boolean, onToggle: () => void) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) {
        onToggle();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close on the same click
      const timeout = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onToggle]);

  return { dropdownRef };
}

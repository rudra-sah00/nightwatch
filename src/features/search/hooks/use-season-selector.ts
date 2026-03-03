'use client';

import React from 'react';

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

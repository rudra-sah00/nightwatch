import { useEffect, useRef, useState } from 'react';

/**
 * Manages open/close state and outside-click dismissal for the audio
 * language selector dropdown.
 *
 * @returns `isOpen`, `setIsOpen`, and `menuRef`.
 */
export function useAudioSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return { isOpen, setIsOpen, menuRef };
}

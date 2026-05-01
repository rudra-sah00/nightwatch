import { useEffect, useRef, useState } from 'react';

type MenuScreen = 'main' | 'quality' | 'speed';

/** Options for {@link useSettingsMenu}. */
interface UseSettingsMenuOptions {
  onInteraction?: (isActive: boolean) => void;
}

/**
 * Manages the settings menu open/close state, sub-screen navigation
 * (main → quality / speed), and outside-click dismissal.
 *
 * @returns Menu state, screen navigation, ref, and toggle/back handlers.
 */
export function useSettingsMenu({
  onInteraction,
}: UseSettingsMenuOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentScreen('main');
        onInteraction?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      onInteraction?.(true);
    } else {
      onInteraction?.(false);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (isOpen) onInteraction?.(false);
    };
  }, [isOpen, onInteraction]);

  const toggleMenu = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (!newState) {
      setCurrentScreen('main');
    }
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  return {
    isOpen,
    setIsOpen,
    currentScreen,
    setCurrentScreen,
    menuRef,
    toggleMenu,
    handleBack,
  };
}

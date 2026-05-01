'use client';

import { useState } from 'react';

/**
 * Hook managing the open/closed state of the watch party settings dialog.
 *
 * @returns An object with `isOpen` boolean state and `setIsOpen` setter.
 */
export function useWatchPartySettings() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
}

'use client';

import { useState } from 'react';

export function useWatchPartySettings() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
}

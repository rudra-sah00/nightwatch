'use client';

import { useState } from 'react';

export function useWatchPartySetup() {
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  return { isSeasonOpen, setIsSeasonOpen };
}

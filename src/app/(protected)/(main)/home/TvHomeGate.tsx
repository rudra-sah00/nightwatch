'use client';

import { useEffect, useState } from 'react';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvHome } from '@/platforms/smart-tv/pages/TvHome';

export function TvHomeGate() {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    setIsTvMode(isTV());
  }, []);

  if (!isTvMode) return null;

  return <TvHome />;
}

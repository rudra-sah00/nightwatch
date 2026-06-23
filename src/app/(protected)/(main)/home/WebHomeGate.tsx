'use client';

import { useEffect, useState } from 'react';
import { isTV } from '@/platforms/smart-tv/lib/detection';

export function WebHomeGate({ children }: { children: React.ReactNode }) {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    setIsTvMode(isTV());
  }, []);

  if (isTvMode) return null;

  return <>{children}</>;
}

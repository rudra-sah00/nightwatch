'use client';

import { useEffect, useState } from 'react';
import { waitForTvFlag } from '@/platforms/smart-tv/lib/detection';
import { TvPageSkeleton } from './TvSkeleton';

/**
 * Renders tvContent on TV, web children on non-TV.
 * Shows a skeleton during the detection window (0-300ms) to avoid flash.
 */
export function TvPageGate({
  tvContent,
  children,
}: {
  tvContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<'pending' | 'tv' | 'web'>('pending');

  useEffect(() => {
    waitForTvFlag().then((isTV) => setState(isTV ? 'tv' : 'web'));
  }, []);

  if (state === 'pending') return <TvPageSkeleton />;
  if (state === 'tv') return <>{tvContent}</>;
  return <>{children}</>;
}

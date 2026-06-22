'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvContentDetail } from '@/platforms/smart-tv/pages/TvContentDetail';

export function ContentDetailTvGate() {
  const [isTvMode, setIsTvMode] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const tv = isTV();
    setIsTvMode(tv);
    // This is a TV-only route; redirect web users to home
    if (!tv) router.replace('/home');
  }, [router]);

  if (!isTvMode) return null;
  return <TvContentDetail />;
}

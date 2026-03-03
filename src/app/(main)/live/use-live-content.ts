'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function useLiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('sportType') || 'basketball';

  // No router.replace here — calling router.replace inside useEffect races
  // with the useLivestreams fetch: if the schedule response arrives before
  // the navigation commits, isLoading flips to false with schedule=[] and
  // the effect never re-fires (sportType didn't change), showing
  // "No Matches Found" until a hard refresh.

  const [isPending, startTransition] = useTransition();

  const handleTabChange = (val: string) => {
    startTransition(() => {
      router.push(`/live?sportType=${val}`);
    });
  };

  return { activeTab, isPending, handleTabChange };
}

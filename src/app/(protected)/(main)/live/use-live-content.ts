'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function useLiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('sportType') || 'all_channels';

  const [isPending, startTransition] = useTransition();

  const handleTabChange = (val: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sportType', val);
      router.push(`/live?${params.toString()}`);
    });
  };

  return {
    activeTab,
    isPending,
    handleTabChange,
  };
}

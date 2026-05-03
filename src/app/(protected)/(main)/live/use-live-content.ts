'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function useLiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('sportType') || 'all_channels';
  const activeServer = (searchParams.get('server') || '1') as '1' | '2';

  const [isPending, startTransition] = useTransition();

  const handleTabChange = (val: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sportType', val);
      router.push(`/live?${params.toString()}`);
    });
  };

  const handleServerChange = (server: '1' | '2') => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('server', server);
      if (server === '1') params.set('sportType', 'all_channels');
      router.push(`/live?${params.toString()}`);
    });
  };

  return {
    activeTab,
    activeServer,
    isPending,
    handleTabChange,
    handleServerChange,
  };
}

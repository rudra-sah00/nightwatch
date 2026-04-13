'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function useLiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeServer =
    (searchParams.get('server') as 'server1' | 'server2' | 'server3') ||
    'server1';
  const activeTab =
    searchParams.get('sportType') ||
    (activeServer === 'server1' ? 'basketball' : 'all_channels');

  const [isPending, startTransition] = useTransition();

  const handleTabChange = (val: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sportType', val);
      params.set('server', activeServer);
      router.push(`/live?${params.toString()}`);
    });
  };

  const handleServerChange = (
    serverId: 'server1' | 'server2' | 'server3',
    defaultSport: string,
  ) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('server', serverId);
      params.set('sportType', defaultSport);
      router.push(`/live?${params.toString()}`);
    });
  };

  return {
    activeServer,
    activeTab,
    isPending,
    handleTabChange,
    handleServerChange,
  };
}

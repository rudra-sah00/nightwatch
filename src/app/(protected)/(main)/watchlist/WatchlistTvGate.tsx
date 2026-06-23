'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvWatchlist } from '@/platforms/smart-tv/pages/TvWatchlist';

export function WatchlistTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvWatchlist />}>{children}</TvPageGate>;
}

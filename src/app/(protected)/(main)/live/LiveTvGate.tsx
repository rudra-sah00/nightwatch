'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvLive } from '@/platforms/smart-tv/pages/TvLive';

export function LiveTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvLive />}>{children}</TvPageGate>;
}

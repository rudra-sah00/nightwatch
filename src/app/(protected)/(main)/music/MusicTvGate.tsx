'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvMusic } from '@/platforms/smart-tv/pages/TvMusic';

export function MusicTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvMusic />}>{children}</TvPageGate>;
}

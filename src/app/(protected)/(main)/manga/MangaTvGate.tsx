'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvManga } from '@/platforms/smart-tv/pages/TvManga';

export function MangaTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvManga />}>{children}</TvPageGate>;
}

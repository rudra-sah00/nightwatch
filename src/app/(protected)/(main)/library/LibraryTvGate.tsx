'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvLibrary } from '@/platforms/smart-tv/pages/TvLibrary';

export function LibraryTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvLibrary />}>{children}</TvPageGate>;
}

'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvSearch } from '@/platforms/smart-tv/pages/TvSearch';

export function SearchTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvSearch />}>{children}</TvPageGate>;
}

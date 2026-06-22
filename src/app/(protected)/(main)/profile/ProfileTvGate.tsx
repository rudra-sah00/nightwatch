'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvProfile } from '@/platforms/smart-tv/pages/TvProfile';

export function ProfileTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvProfile />}>{children}</TvPageGate>;
}

'use client';

import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvPreferences } from '@/platforms/smart-tv/pages/TvPreferences';

export function PrefsTvGate({ children }: { children: React.ReactNode }) {
  return <TvPageGate tvContent={<TvPreferences />}>{children}</TvPageGate>;
}

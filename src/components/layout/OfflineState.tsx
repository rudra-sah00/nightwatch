'use client';

import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Full-page offline fallback screen shown when the device has no network connection.
 */
export function OfflineState() {
  const t = useTranslations('common.offline');

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-background min-h-[calc(100vh-120px)] w-full">
      <WifiOff className="w-16 h-16 stroke-[2px] text-foreground/30 mb-6" />
      <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter mb-4">
        {t('title')}
      </h1>
      <p className="text-foreground/70 font-semibold max-w-md mx-auto uppercase tracking-widest text-sm">
        {t('description')}
      </p>
    </main>
  );
}

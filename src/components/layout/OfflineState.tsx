'use client';

import { HardDriveDownload, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Full-page offline fallback screen shown when the device has no network connection.
 *
 * Displays a "You're Offline" message with a link to the downloads vault so users
 * can access previously downloaded content.
 */
export function OfflineState() {
  const t = useTranslations('common.offline');

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-background min-h-[calc(100vh-120px)] w-full w-full">
      <WifiOff className="w-16 h-16 stroke-[2px] text-foreground/30 mb-6" />
      <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter mb-4">
        {t('title')}
      </h1>
      <p className="text-foreground/70 font-semibold max-w-md mx-auto mb-8 uppercase tracking-widest text-sm">
        {t('description')}
      </p>
      <Link
        href="/downloads"
        className="bg-neo-yellow text-black border-[3px] border-black px-8 py-4 font-headline uppercase font-black tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-3 w-full sm:w-auto"
      >
        <HardDriveDownload className="w-5 h-5" />
        {t('openVault')}
      </Link>
    </main>
  );
}

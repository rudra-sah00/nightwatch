'use client';

import { useTranslations } from 'next-intl';
import { PageTitle } from '@/components/layout/page-title';
import { WatchlistClient as WatchlistContent } from '@/features/watchlist/components/WatchlistClient';

export default function WatchlistClient() {
  const t = useTranslations('common.nav');
  return (
    <>
      <PageTitle title={t('watchlist')} />
      <WatchlistContent />
    </>
  );
}

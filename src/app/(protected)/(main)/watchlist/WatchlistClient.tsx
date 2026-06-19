'use client';

import { PageTitle } from '@/components/layout/page-title';
import { WatchlistClient as WatchlistContent } from '@/features/watchlist/components/WatchlistClient';

export default function WatchlistClient() {
  return (
    <>
      <PageTitle title="Watchlist" />
      <WatchlistContent />
    </>
  );
}

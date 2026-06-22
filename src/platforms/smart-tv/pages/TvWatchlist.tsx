'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getWatchlist } from '@/features/watchlist/api';
import { TvCard } from '../components/TvCard';
import { TvGrid } from '../components/TvGrid';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function WatchlistEmpty() {
  const { ref, focused } = useFocusable();
  return (
    <div
      ref={ref}
      className={`py-32 border-[4px] border-dashed text-center flex flex-col items-center justify-center bg-card rounded-xl transition-colors ${
        focused ? 'border-tv-focus' : 'border-border'
      }`}
    >
      <span className="material-symbols-outlined text-6xl text-foreground/20 mb-6">
        bookmark
      </span>
      <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
        Empty
      </p>
      <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
        Browse content and add items to your watchlist
      </p>
    </div>
  );
}

export function TvWatchlist() {
  const router = useRouter();
  const t = useTranslations('common.tv.watchlist');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_WATCHLIST_PAGE' });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getWatchlist(),
    retry: false,
  });

  useTvFocus('tv-watchlist', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tv-page-scroll p-8">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        {isLoading && <p className="text-muted-foreground">{t('loading')}</p>}
        {!isLoading && items.length === 0 && <WatchlistEmpty />}
        <TvGrid focusKey="WATCHLIST_GRID">
          {items.map((item) => (
            <TvCard
              key={item.id}
              title={item.title}
              image={item.posterUrl}
              onPress={() => router.push(`/content/${item.contentId}`)}
            />
          ))}
        </TvGrid>
      </div>
    </FocusContext.Provider>
  );
}

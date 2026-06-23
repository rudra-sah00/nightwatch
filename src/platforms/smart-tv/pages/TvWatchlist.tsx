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
        {/* Hero */}
        <div className="mb-8 bg-neo-blue relative overflow-hidden rounded-2xl">
          <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
          <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-yellow border-[4px] border-border opacity-20 rotate-12" />
          <div className="relative z-10 px-10 py-12">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
              MY
              <br />
              <span className="bg-background text-foreground px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
                WATCHLIST
              </span>
            </h1>
            <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
              {t('title')}
            </p>
          </div>
        </div>

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

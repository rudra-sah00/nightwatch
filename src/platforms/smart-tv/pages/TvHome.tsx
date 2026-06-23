'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { type ExploreItem, getExploreHome } from '@/features/search/api';
import { useContinueWatching } from '@/features/watch/hooks/use-continue-watching';
import { TvCard } from '../components/TvCard';
import { TvHero } from '../components/TvHero';
import { TvRow } from '../components/TvRow';
import { TvPageSkeleton } from '../components/TvSkeleton';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

export function TvHome() {
  const router = useRouter();
  const t = useTranslations('common.tv.home');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_HOME_PAGE' });
  const { items: continueWatching } = useContinueWatching({});
  const { data: explore, isLoading: exploreLoading } = useQuery({
    queryKey: ['explore', 'home'],
    queryFn: getExploreHome,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  useTvFocus('tv-home', FOCUS_KEYS.CONTENT);

  const openContent = useCallback(
    (item: ExploreItem) => {
      router.push(`/content/${item.id}`);
    },
    [router],
  );

  if (exploreLoading && continueWatching.length === 0)
    return <TvPageSkeleton />;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="py-6">
        {/* Hero Banner — auto-sliding trending content */}
        {explore?.trending && explore.trending.length > 0 && (
          <TvHero banner={explore.banner ?? []} trending={explore.trending} />
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <TvRow title={t('continueWatching')} focusKey="ROW_CONTINUE">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              continueWatching.map((item) => (
                <TvCard
                  key={item.id}
                  title={item.title}
                  image={item.posterUrl}
                  href={`/watch/${item.contentId}`}
                  onPress={() => router.push(`/watch/${item.contentId}`)}
                  onFocus={onChildFocus}
                  eager
                  progress={item.progressPercent}
                />
              ))
            }
          </TvRow>
        )}

        {/* Trending Row */}
        {explore?.trending && explore.trending.length > 0 && (
          <TvRow title={t('trending')} focusKey="ROW_TRENDING">
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              explore.trending
                .slice(0, 15)
                .map((item) => (
                  <TvCard
                    key={item.id}
                    title={item.title}
                    image={item.cover}
                    href={`/content/${item.id}`}
                    onPress={() => openContent(item)}
                    onFocus={onChildFocus}
                  />
                ))
            }
          </TvRow>
        )}

        {/* Explore Sections */}
        {explore?.sections?.slice(0, 5).map((section, i) => (
          <TvRow
            key={section.title}
            title={section.title}
            focusKey={`ROW_SECTION_${i}`}
          >
            {(onChildFocus: (l: FocusableComponentLayout) => void) =>
              section.items
                .slice(0, 15)
                .map((item) => (
                  <TvCard
                    key={item.id}
                    title={item.title}
                    image={item.cover}
                    href={`/content/${item.id}`}
                    onPress={() => openContent(item)}
                    onFocus={onChildFocus}
                  />
                ))
            }
          </TvRow>
        ))}
      </div>
    </FocusContext.Provider>
  );
}

'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useContinueWatching } from '@/features/watch/hooks/use-continue-watching';
import { TvCard } from '../components/TvCard';
import { TvRow } from '../components/TvRow';
import { TvPageSkeleton } from '../components/TvSkeleton';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

/**
 * Smart TV home screen.
 *
 * Shows Continue Watching only. The curated hero, trending row and genre rows
 * that used to fill this screen were fed by the Explore feed, which has been
 * removed — so there is no browse surface here and search is the way in until a
 * provider-native discovery feed replaces it.
 */
export function TvHome() {
  const router = useRouter();
  const t = useTranslations('common.tv.home');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_HOME_PAGE' });
  const { items: continueWatching, isLoading } = useContinueWatching({});
  useTvFocus('tv-home', FOCUS_KEYS.CONTENT);

  if (isLoading && continueWatching.length === 0) return <TvPageSkeleton />;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="py-6">
        {continueWatching.length > 0 ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <p className="font-headline text-3xl font-bold uppercase tracking-widest text-foreground">
              {t('empty')}
            </p>
            <p className="font-body text-lg text-muted-foreground">
              {t('emptyHint')}
            </p>
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

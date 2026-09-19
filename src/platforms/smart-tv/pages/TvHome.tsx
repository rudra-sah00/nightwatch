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
import { TvHubGrid } from '../components/TvHubGrid';
import { TvRow } from '../components/TvRow';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

/**
 * Smart TV home — the entry hub.
 *
 * Asks what the user wants to explore and routes into one of the app's domains, then
 * shows Continue Watching underneath when there is something to resume. The curated
 * hero and genre rows that used to fill this screen came from the Explore feed, which
 * was removed; the hub replaces it with an explicit choice rather than a feed, so there
 * is no catalogue to keep fresh.
 *
 * Continue Watching lives here because TvNavbar has no entry for it — unlike the web
 * sidebar, this is the only route to it.
 *
 * Destinations are shared with the web hub. Games is excluded on TV — see
 * `HubDestination.onTv`.
 */
export function TvHome() {
  const router = useRouter();
  const t = useTranslations('common');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_HOME_PAGE' });
  const { items: continueWatching } = useContinueWatching({});
  useTvFocus('tv-home', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="py-8">
        <h1 className="px-12 font-headline text-4xl font-black uppercase tracking-tighter text-foreground mb-8">
          {t('hub.title')}
        </h1>

        <div className="px-12 mb-12">
          <TvHubGrid registerContentKey />
        </div>

        {continueWatching.length > 0 && (
          <TvRow title={t('tv.home.continueWatching')} focusKey="ROW_CONTINUE">
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
      </div>
    </FocusContext.Provider>
  );
}

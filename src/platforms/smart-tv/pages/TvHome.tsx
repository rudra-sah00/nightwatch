'use client';

import {
  type FocusableComponentLayout,
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { hubDestinationsFor } from '@/features/hub/lib/destinations';
import { useContinueWatching } from '@/features/watch/hooks/use-continue-watching';
import { TvCard } from '../components/TvCard';
import { TvHubTile } from '../components/TvHubTile';
import { TvRow } from '../components/TvRow';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

/**
 * Smart TV home — the entry hub.
 *
 * Asks what the user wants to explore and routes into one of the app's domains,
 * then shows Continue Watching underneath when there is something to resume. The
 * curated hero and genre rows that used to fill this screen came from the Explore
 * feed, which was removed; the hub replaces it with an explicit choice rather than
 * a feed, so there is no catalogue to keep fresh.
 *
 * Destinations are shared with the web hub. Games is excluded on TV — see
 * `HubDestination.onTv`.
 */
export function TvHome() {
  const router = useRouter();
  const t = useTranslations('common');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_HOME_PAGE' });
  const { items: continueWatching } = useContinueWatching({});
  const destinations = hubDestinationsFor('tv');
  useTvFocus('tv-home', FOCUS_KEYS.CONTENT);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="py-8">
        <h1 className="px-12 font-headline text-4xl font-black uppercase tracking-tighter text-foreground mb-8">
          {t('hub.title')}
        </h1>

        <div className="px-12 grid grid-cols-5 gap-6 mb-12">
          {destinations.map(({ id, href, icon, labelKey, accent }, i) => (
            <TvHubTile
              key={id}
              href={href}
              label={t(labelKey)}
              icon={icon}
              accent={accent}
              // Gives useTvFocus a real target to restore focus to on entry.
              focusKey={i === 0 ? FOCUS_KEYS.CONTENT : undefined}
            />
          ))}
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

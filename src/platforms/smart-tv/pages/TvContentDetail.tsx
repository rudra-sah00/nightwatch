'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useContentDetail } from '@/features/search/hooks/use-content-detail';
import { ContentType, type Season } from '@/features/search/types';
import { TvActionButton } from '../components/TvActionButton';
import { useTvFocus } from '../hooks/use-tv-focus';
import { FOCUS_KEYS } from '../lib/focus-keys';

function BackButton() {
  const router = useRouter();
  const { ref, focused } = useFocusable({ onEnterPress: () => router.back() });
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 mx-8 mt-6 mb-2 px-4 py-2 rounded-lg font-headline font-bold uppercase tracking-widest text-sm transition-all ${
        focused ? 'bg-foreground text-background' : 'text-muted-foreground'
      }`}
    >
      <span className="material-symbols-outlined text-lg">arrow_back</span>
      Back
    </div>
  );
}

function SeasonPill({
  season,
  active,
  onSelect,
}: {
  season: Season;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  return (
    <div
      ref={ref}
      className={`px-4 py-2 rounded-lg font-headline font-bold text-sm transition-all ${
        focused ? 'ring-2 ring-tv-focus scale-105' : ''
      } ${active ? 'bg-tv-focus text-white' : 'bg-card border border-border text-foreground'}`}
    >
      Season {season.seasonNumber}
    </div>
  );
}

function EpisodeItem({
  episodeNumber,
  title,
  onPress,
}: {
  episodeNumber: number;
  title: string;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onFocus: () => {
      (ref as React.RefObject<HTMLDivElement>).current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    },
  });
  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border-[3px] transition-all ${
        focused ? 'border-tv-focus bg-secondary/50' : 'border-border'
      }`}
    >
      <span className="text-muted-foreground font-bold text-lg w-8">
        {episodeNumber}
      </span>
      <span className="font-headline font-bold text-sm uppercase tracking-wide truncate flex-1">
        {title}
      </span>
      <span className="material-symbols-outlined text-muted-foreground">
        play_arrow
      </span>
    </div>
  );
}

export function TvContentDetail() {
  const router = useRouter();
  const t = useTranslations('common.tv.content');
  const { ref, focusKey } = useFocusable({ focusKey: 'TV_CONTENT_DETAIL' });
  const params = useParams<{ id: string }>();
  const contentId = params.id;

  const {
    show,
    episodes,
    isLoading,
    selectedSeason,
    hasWatchProgress,
    inWatchlist,
    toggleWatchlist,
    handlePlay,
    handleResume,
    handleSeasonSelect,
  } = useContentDetail({ contentId });

  useTvFocus('tv-content-detail', FOCUS_KEYS.CONTENT);

  if (isLoading || !show) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const isSeries = show.contentType === ContentType.Series;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="h-full overflow-y-auto">
        <BackButton />

        {/* Hero */}
        <div className="relative w-full h-[40vh] bg-black">
          {(show.posterHdUrl || show.posterUrl) && (
            <Image
              src={show.posterHdUrl || show.posterUrl || ''}
              alt={show.title}
              className="w-full h-full object-cover opacity-60"
              fill
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-6 left-8 right-8">
            <h1 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2">
              {show.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-headline font-bold uppercase tracking-widest">
              {show.year && <span>{show.year}</span>}
              {show.rating && <span>⭐ {show.rating}</span>}
              {show.genre && <span>{show.genre}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 px-8 py-6">
          <TvActionButton
            label={hasWatchProgress ? t('resume') : t('watchSolo')}
            icon="play_arrow"
            color="blue"
            onPress={() => {
              if (hasWatchProgress) handleResume();
              else handlePlay();
            }}
          />
          <TvActionButton
            label={t('watchTogether')}
            icon="group"
            color="yellow"
            onPress={() => {
              // Generate random room ID and navigate to watch-party page
              const roomId = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
              router.push(
                `/watch-party/${roomId}?new=true&contentId=${contentId}`,
              );
            }}
          />
          <TvActionButton
            label={inWatchlist ? t('inWatchlist') : t('watchlist')}
            icon={inWatchlist ? 'bookmark_added' : 'bookmark_add'}
            onPress={() => toggleWatchlist()}
          />
        </div>

        {/* Description */}
        {show.description && (
          <p className="px-8 pb-6 text-muted-foreground text-sm leading-relaxed max-w-3xl">
            {show.description}
          </p>
        )}

        {/* Season selector (series only) */}
        {isSeries && show.seasons && show.seasons.length > 1 && (
          <div className="px-8 pb-4 flex gap-3 flex-wrap">
            {show.seasons.map((s) => (
              <SeasonPill
                key={s.seasonId}
                season={s}
                active={selectedSeason?.seasonId === s.seasonId}
                onSelect={() => handleSeasonSelect(s)}
              />
            ))}
          </div>
        )}

        {/* Episodes (series only) */}
        {isSeries && episodes.length > 0 && (
          <div className="px-8 pb-8">
            <h2 className="font-headline font-black uppercase tracking-widest text-sm text-muted-foreground mb-4">
              {selectedSeason
                ? `Season ${selectedSeason.seasonNumber}`
                : 'Episodes'}
            </h2>
            <div className="flex flex-col gap-2">
              {episodes.slice(0, 50).map((ep) => (
                <EpisodeItem
                  key={ep.episodeId || ep.episodeNumber}
                  episodeNumber={ep.episodeNumber}
                  title={ep.title || `Episode ${ep.episodeNumber}`}
                  onPress={() => handlePlay(ep)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

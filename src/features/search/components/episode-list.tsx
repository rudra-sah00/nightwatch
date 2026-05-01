'use client';

import { useTranslations } from 'next-intl';
import type { Episode } from '../types';
import { EpisodeSkeleton } from './EpisodeSkeleton';
import { EpisodeCard } from './episode-card';

/** Props for {@link EpisodeList}. */
interface EpisodeListProps {
  episodes: Episode[];
  isLoading: boolean;
  playingEpisodeId?: string | number | null;
  onPlayEpisode: (episode: Episode) => void;
}

/**
 * Renders a vertical list of {@link EpisodeCard} components for a given
 * season. Displays skeleton placeholders while loading and an empty-state
 * message when no episodes are available. Uses `contentVisibility: auto`
 * for virtualised rendering performance.
 *
 * @param props - {@link EpisodeListProps}
 * @returns The episode list element.
 */
export function EpisodeList({
  episodes,
  isLoading,
  playingEpisodeId,
  onPlayEpisode,
}: EpisodeListProps) {
  const t = useTranslations('search');

  if (isLoading) {
    return (
      <output
        className="space-y-2 block"
        aria-busy="true"
        aria-label={t('contentDetail.loadingEpisodes')}
      >
        {['ep-sk-1', 'ep-sk-2', 'ep-sk-3'].map((id) => (
          <EpisodeSkeleton key={id} />
        ))}
      </output>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('contentDetail.noEpisodesAvailable')}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label={t('contentDetail.episodesAriaLabel')}>
      {episodes.map((episode) => (
        <li
          key={episode.episodeId || episode.episodeNumber}
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: 'auto 100px',
          }}
        >
          <EpisodeCard
            episode={episode}
            onPlay={() => onPlayEpisode(episode)}
            isPlaying={
              playingEpisodeId === episode.episodeId ||
              playingEpisodeId === episode.episodeNumber
            }
            isAnyLoading={!!playingEpisodeId}
          />
        </li>
      ))}
    </ul>
  );
}

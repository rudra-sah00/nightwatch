'use client';

import type { Episode } from '../types';
import { EpisodeSkeleton } from './EpisodeSkeleton';
import { EpisodeCard } from './episode-card';

interface EpisodeListProps {
  episodes: Episode[];
  isLoading: boolean;
  playingEpisodeId?: string | number | null;
  onPlayEpisode: (episode: Episode) => void;
}

export function EpisodeList({
  episodes,
  isLoading,
  playingEpisodeId,
  onPlayEpisode,
}: EpisodeListProps) {
  if (isLoading) {
    return (
      <output
        className="space-y-2 block"
        aria-busy="true"
        aria-label="Loading episodes"
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
        No episodes available for this season
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Episodes">
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

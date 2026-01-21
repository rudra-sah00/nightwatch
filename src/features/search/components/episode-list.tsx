'use client';

import { Loader2 } from 'lucide-react';
import type { Episode } from '../types';
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
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
    <div className="space-y-2">
      {episodes.map((episode) => (
        <EpisodeCard
          key={episode.episodeId || episode.episodeNumber}
          episode={episode}
          onPlay={() => onPlayEpisode(episode)}
          isPlaying={
            playingEpisodeId === episode.episodeId ||
            playingEpisodeId === episode.episodeNumber
          }
        />
      ))}
    </div>
  );
}

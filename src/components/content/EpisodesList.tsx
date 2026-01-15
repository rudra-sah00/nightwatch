'use client';

import React from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { getEpisodeThumbnailUrl } from '@/lib/api/media';
import type { Episode } from '@/types/content';

interface EpisodeCardProps {
    episode: Episode;
    posterUrl: string;
    onPlay: (episodeId: string) => void;
}

export function EpisodeCard({ episode, posterUrl, onPlay }: EpisodeCardProps) {
    return (
        <button
            className="w-full flex items-start gap-4 p-4 rounded hover:bg-zinc-800/50 transition-colors group text-left"
            onClick={() => onPlay(episode.episode_id)}
        >
            {/* Episode number */}
            <div className="flex-shrink-0 w-8 pt-1">
                <span className="text-2xl font-light text-zinc-400">
                    {episode.episode_number}
                </span>
            </div>

            {/* Episode thumbnail */}
            <div className="relative w-40 aspect-video rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                <Image
                    src={episode.thumbnail_url || getEpisodeThumbnailUrl(episode.episode_id)}
                    alt={`Episode ${episode.episode_number}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                        e.currentTarget.src = posterUrl;
                    }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white fill-white" />
                </div>
            </div>

            {/* Episode info */}
            <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-medium text-white">
                        {episode.title || `Episode ${episode.episode_number}`}
                    </h4>
                    {episode.duration && (
                        <span className="text-zinc-400 text-sm flex-shrink-0">
                            {episode.duration}m
                        </span>
                    )}
                </div>
                <p className="text-sm text-zinc-400 line-clamp-2">
                    {episode.description || `Episode ${episode.episode_number}`}
                </p>
            </div>
        </button>
    );
}

interface EpisodesListProps {
    episodes: Episode[];
    posterUrl: string;
    onPlay: (episodeId: string) => void;
}

export default function EpisodesList({ episodes, posterUrl, onPlay }: EpisodesListProps) {
    if (episodes.length === 0) return null;

    return (
        <div className="space-y-2">
            {episodes.map((episode) => (
                <EpisodeCard
                    key={episode.episode_id}
                    episode={episode}
                    posterUrl={posterUrl}
                    onPlay={onPlay}
                />
            ))}
        </div>
    );
}

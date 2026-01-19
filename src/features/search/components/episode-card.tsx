'use client';

import React from 'react';
import { Play, Clock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Episode } from '../types';
import { cn } from '@/lib/utils';

interface EpisodeCardProps {
    episode: Episode;
    onPlay: () => void;
    isPlaying: boolean;
}

export function EpisodeCard({ episode, onPlay, isPlaying }: EpisodeCardProps) {
    const [imageError, setImageError] = React.useState(false);

    return (
        <div
            className={cn(
                "group flex gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300",
                "hover:bg-white/5 border border-transparent hover:border-white/10",
                isPlaying && "opacity-60 pointer-events-none"
            )}
            onClick={onPlay}
        >
            {/* Episode Thumbnail */}
            <div className="relative w-40 md:w-48 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {!imageError && episode.thumbnailUrl ? (
                    <Image
                        src={episode.thumbnailUrl}
                        alt={episode.title || `Episode ${episode.episodeNumber}`}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white/20">{episode.episodeNumber}</span>
                    </div>
                )}

                {/* Play Overlay */}
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/40",
                    "opacity-0 group-hover:opacity-100 transition-opacity"
                )}>
                    {isPlaying ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                            <Play className="w-5 h-5 text-black fill-current ml-0.5" />
                        </div>
                    )}
                </div>
            </div>

            {/* Episode Info */}
            <div className="flex-1 min-w-0 py-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-muted-foreground">E{episode.episodeNumber}</span>
                    <h4 className="font-semibold text-foreground truncate">{episode.title || `Episode ${episode.episodeNumber}`}</h4>
                </div>

                {episode.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                        {episode.description}
                    </p>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {episode.duration && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {episode.duration}m
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

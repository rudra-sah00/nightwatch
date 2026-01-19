'use client';

import React from 'react';
import { Play, Clock, Calendar, Film, Tv, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShowDetails, ContentType } from '../types';
import { cn } from '@/lib/utils';

interface ContentInfoProps {
    show: ShowDetails;
    isPlaying: boolean;
    hasWatchProgress?: boolean;
    onPlay: () => void;
}

export function ContentInfo({ show, isPlaying, hasWatchProgress, onPlay }: ContentInfoProps) {
    const isSeries = show.contentType === ContentType.Series;

    return (
        <div className="space-y-6">
            {/* Content Type Badge */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                    isSeries
                        ? "bg-purple-600/80 text-white"
                        : "bg-blue-600/80 text-white"
                )}>
                    {isSeries ? (
                        <span className="flex items-center gap-1.5">
                            <Tv className="w-3 h-3" />
                            TV Series
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <Film className="w-3 h-3" />
                            Movie
                        </span>
                    )}
                </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
                {show.title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                {show.year && (
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {show.year}
                    </span>
                )}
                {show.runtime && (
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {show.runtime} min
                    </span>
                )}
                {isSeries && show.seasons && show.seasons.length > 0 && (
                    <span>
                        {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
                    </span>
                )}
                {show.genre && (
                    <span>
                        {show.genre}
                    </span>
                )}
            </div>

            {/* Description */}
            {show.description && (
                <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-4">
                    {show.description}
                </p>
            )}

            {/* Play/Resume Button - Only for Movies */}
            {!isSeries && (
                <Button
                    size="lg"
                    className={cn(
                        "gap-2 px-8 py-6 text-lg font-semibold shadow-lg",
                        hasWatchProgress && "bg-primary hover:bg-primary/90"
                    )}
                    onClick={onPlay}
                    disabled={isPlaying}
                >
                    {isPlaying ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : hasWatchProgress ? (
                        <RotateCcw className="w-5 h-5" />
                    ) : (
                        <Play className="w-5 h-5 fill-current" />
                    )}
                    {isPlaying ? 'Loading...' : hasWatchProgress ? 'Resume' : 'Play'}
                </Button>
            )}
        </div>
    );
}


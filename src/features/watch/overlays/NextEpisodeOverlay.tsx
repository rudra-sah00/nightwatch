'use client';

import { Loader2, Play, SkipForward } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface NextEpisodeInfo {
  title: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  thumbnailUrl?: string;
  duration?: number;
}

interface NextEpisodeOverlayProps {
  isVisible: boolean;
  nextEpisode: NextEpisodeInfo | null;
  onPlayNext: () => void;
  onCancel: () => void;
  autoPlayDelay?: number; // Seconds before auto-play (0 to disable)
  isLoading?: boolean;
}

export function NextEpisodeOverlay({
  isVisible,
  nextEpisode,
  onPlayNext,
  onCancel,
  autoPlayDelay = 0, // Disabled by default - user must click to play
  isLoading = false,
}: NextEpisodeOverlayProps) {
  const [countdown, setCountdown] = useState(autoPlayDelay);
  const [cancelled, setCancelled] = useState(false);

  // Reset countdown when overlay becomes visible
  useEffect(() => {
    if (isVisible && nextEpisode) {
      setCountdown(autoPlayDelay);
      setCancelled(false);
    }
  }, [isVisible, nextEpisode, autoPlayDelay]);

  // Countdown timer
  useEffect(() => {
    if (
      !isVisible ||
      !nextEpisode ||
      cancelled ||
      autoPlayDelay === 0 ||
      isLoading
    )
      return;

    if (countdown <= 0) {
      onPlayNext();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isVisible,
    nextEpisode,
    countdown,
    cancelled,
    autoPlayDelay,
    isLoading,
    onPlayNext,
  ]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    onCancel();
  }, [onCancel]);

  if (!isVisible || !nextEpisode) return null;

  const isNextSeason = nextEpisode.episodeNumber === 1;

  return (
    <div className="absolute bottom-24 right-6 z-20 animate-in slide-in-from-right-4 fade-in duration-300">
      <div
        className={cn(
          'w-80 bg-zinc-900/95 backdrop-blur-xl rounded-xl overflow-hidden',
          'shadow-2xl shadow-black/50 border border-white/10',
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <SkipForward className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white">
              {isNextSeason ? 'Next Season' : 'Next Episode'}
            </span>
            {!cancelled && autoPlayDelay > 0 && !isLoading && (
              <span className="ml-auto text-xs text-white/50">
                Playing in {countdown}s
              </span>
            )}
          </div>
        </div>

        {/* Episode Preview */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
              {nextEpisode.thumbnailUrl ? (
                <Image
                  src={nextEpisode.thumbnailUrl}
                  alt={nextEpisode.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <span className="text-lg font-bold text-white/20">
                    E{nextEpisode.episodeNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 mb-0.5">
                S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber}
              </p>
              <h4 className="text-sm font-medium text-white truncate">
                {nextEpisode.title || `Episode ${nextEpisode.episodeNumber}`}
              </h4>
              {nextEpisode.duration && (
                <p className="text-xs text-white/40 mt-1">
                  {nextEpisode.duration}m
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onPlayNext}
              disabled={isLoading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                'bg-white text-black font-medium text-sm',
                'hover:bg-white/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Play Now
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className={cn(
                'px-4 py-2.5 rounded-lg',
                'bg-white/10 text-white text-sm',
                'hover:bg-white/20 transition-colors',
                'disabled:opacity-50',
              )}
            >
              Cancel
            </button>
          </div>

          {/* Progress bar for countdown */}
          {!cancelled && autoPlayDelay > 0 && !isLoading && (
            <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / autoPlayDelay) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

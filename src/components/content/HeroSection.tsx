'use client';

import { Play, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import type { ContinueWatchingItem } from '@/services/api/watchProgress';

interface HeroSectionProps {
  posterUrl: string;
  title: string;
  watchProgress?: ContinueWatchingItem | null;
  onPlay: () => void;
  onPlayFresh?: () => void;
}

// Format time for display (e.g., "45:23" or "1:23:45")
function _formatResumeTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function HeroSection({
  posterUrl,
  title,
  watchProgress,
  onPlay,
  onPlayFresh,
}: HeroSectionProps) {
  const hasProgress = watchProgress && watchProgress.progress_seconds > 10;
  const progressPercent = watchProgress ? Math.min(watchProgress.progress_percent, 100) : 0;

  return (
    <div className="relative aspect-video w-full">
      <Image src={posterUrl} alt={title} fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-transparent to-transparent" />

      {/* Action buttons - Bottom left */}
      <div className="absolute bottom-16 left-12 right-12">
        <div className="flex items-center gap-3">
          {hasProgress ? (
            <>
              {/* Resume Button - Primary */}
              <button
                type="button"
                className="flex items-center gap-3 px-8 py-3.5 bg-white text-black rounded-lg hover:bg-zinc-200 transition-all duration-300 font-bold text-lg shadow-xl hover:scale-105 active:scale-95"
                onClick={onPlay}
              >
                <Play className="w-7 h-7 fill-black" />
                Resume
              </button>
              {/* Play from Start - Secondary */}
              {onPlayFresh && (
                <button
                  type="button"
                  className="flex items-center gap-3 px-8 py-3.5 bg-zinc-600/60 backdrop-blur-md text-white rounded-lg hover:bg-zinc-500/60 transition-all duration-300 font-semibold text-lg hover:scale-105 active:scale-95 border border-white/10"
                  onClick={onPlayFresh}
                >
                  <RotateCcw className="w-6 h-6" />
                  Start Over
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="flex items-center gap-3 px-8 py-3.5 bg-white text-black rounded-lg hover:bg-zinc-200 transition-all duration-300 font-bold text-lg shadow-xl hover:scale-105 active:scale-95"
              onClick={onPlay}
            >
              <Play className="w-7 h-7 fill-black" />
              Play
            </button>
          )}
        </div>

        {/* Progress bar under buttons */}
        {hasProgress && (
          <div className="mt-4 max-w-md">
            <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {watchProgress.content_type === 'Series' && watchProgress.episode_title && (
              <p className="text-sm text-zinc-400 mt-2">
                S{watchProgress.season_number}:E{watchProgress.episode_number} -{' '}
                {watchProgress.episode_title}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

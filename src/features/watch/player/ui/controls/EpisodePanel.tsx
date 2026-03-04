'use client';

import { ChevronDown, Library, Loader2, Play, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { Episode, Season } from '@/features/search/types';
import { cn, getOptimizedImageUrl } from '@/lib/utils';

interface EpisodePanelProps {
  isOpen: boolean;
  episodes: Episode[];
  seasons: Season[];
  selectedSeason: number;
  currentEpisode?: number;
  currentSeason?: number;
  isLoading: boolean;
  onClose: () => void;
  onSeasonChange: (seasonNumber: number) => void;
  onEpisodeSelect: (episode: Episode) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

export function EpisodePanel({
  isOpen,
  episodes,
  seasons,
  selectedSeason,
  currentEpisode = 1,
  currentSeason = 1,
  isLoading,
  onClose,
  onSeasonChange,
  onEpisodeSelect,
  panelRef,
}: EpisodePanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to currently playing episode when panel opens or season changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: need to re-scroll on season/episode list change
  useEffect(() => {
    if (isOpen && activeRef.current && listRef.current) {
      // Small delay to let animate-in finish
      const timer = setTimeout(() => {
        activeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedSeason]);

  if (!isOpen) return null;

  const isCurrentSeason = selectedSeason === currentSeason;

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute right-0 top-0 bottom-0 z-40 w-[340px] md:w-[380px] lg:w-[400px]',
        'flex flex-col',
        'bg-zinc-950/95 backdrop-blur-2xl',
        'border-l border-white/10',
        'shadow-[-8px_0_30px_rgba(0,0,0,0.5)]',
        'pointer-events-auto',
        'animate-in slide-in-from-right duration-300 ease-out',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <Library className="w-5 h-5 text-white/70" />
          <span className="text-sm font-semibold text-white tracking-wide">
            Episodes
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close episodes panel"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Season Selector — only if multiple seasons */}
      {seasons.length > 1 && (
        <div className="px-5 py-3 border-b border-white/5">
          <div className="relative">
            <select
              value={selectedSeason}
              onChange={(e) => onSeasonChange(Number(e.target.value))}
              className={cn(
                'w-full appearance-none',
                'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20',
                'rounded-lg px-4 py-2.5 pr-10',
                'text-sm font-medium text-white',
                'transition-colors cursor-pointer',
                'focus:outline-none focus:ring-1 focus:ring-white/30',
              )}
            >
              {seasons.map((s) => (
                <option
                  key={s.seasonNumber}
                  value={s.seasonNumber}
                  className="bg-zinc-900 text-white"
                >
                  Season {s.seasonNumber}
                  {s.episodeCount ? ` · ${s.episodeCount} Episodes` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Episode List — scrollable */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            <span className="text-xs text-white/40">Loading episodes...</span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">
            No episodes available
          </div>
        ) : (
          <div className="py-2">
            {episodes.map((ep) => {
              const isActive =
                isCurrentSeason && ep.episodeNumber === currentEpisode;

              return (
                <EpisodeItem
                  key={ep.episodeId || ep.episodeNumber}
                  ref={isActive ? activeRef : undefined}
                  episode={ep}
                  isActive={isActive}
                  onSelect={() => onEpisodeSelect(ep)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Episode Item ─────────────────────────────────────────────────────────

import { forwardRef } from 'react';

interface EpisodeItemProps {
  episode: Episode;
  isActive: boolean;
  onSelect: () => void;
}

const EpisodeItem = forwardRef<HTMLButtonElement, EpisodeItemProps>(
  function EpisodeItem({ episode, isActive, onSelect }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        disabled={isActive}
        className={cn(
          'group w-full flex gap-3 px-5 text-left transition-all duration-200',
          // Active (currently playing) episode is larger
          isActive
            ? 'py-4 bg-white/[0.08] border-l-2 border-white'
            : 'py-3 hover:bg-white/[0.05] border-l-2 border-transparent',
        )}
      >
        {/* Thumbnail */}
        <div
          className={cn(
            'relative rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0',
            isActive
              ? 'w-[140px] md:w-[160px] aspect-video'
              : 'w-[110px] md:w-[130px] aspect-video',
          )}
        >
          {episode.thumbnailUrl ? (
            <Image
              src={getOptimizedImageUrl(episode.thumbnailUrl)}
              alt={episode.title || `Episode ${episode.episodeNumber}`}
              fill
              className={cn('object-cover', isActive && 'brightness-75')}
              unoptimized={episode.thumbnailUrl.includes('/api/stream/')}
              sizes="160px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-lg font-bold text-white/20">
                {episode.episodeNumber}
              </span>
            </div>
          )}

          {/* Play overlay / Now Playing indicator */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              isActive
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 transition-opacity',
            )}
          >
            {isActive ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-end gap-[2px] h-4">
                  <span
                    className="w-[3px] bg-white rounded-full animate-pulse h-2"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-[3px] bg-white rounded-full animate-pulse h-3.5"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-[3px] bg-white rounded-full animate-pulse h-2.5"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span
                    className="w-[3px] bg-white rounded-full animate-pulse h-4"
                    style={{ animationDelay: '450ms' }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 text-black fill-current ml-0.5" />
              </div>
            )}
          </div>

          {/* Duration badge - only for non-active */}
          {!isActive && episode.duration ? (
            <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white/80 px-1.5 py-0.5 rounded font-medium">
              {episode.duration}m
            </span>
          ) : null}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium shrink-0',
                isActive ? 'text-white' : 'text-white/40',
              )}
            >
              {episode.episodeNumber}.
            </span>
            <h4
              className={cn(
                'font-medium truncate',
                isActive
                  ? 'text-white text-sm'
                  : 'text-white/70 text-[13px] group-hover:text-white/90',
              )}
            >
              {episode.title || `Episode ${episode.episodeNumber}`}
            </h4>
          </div>

          {/* Description — shown only for active episode */}
          {isActive && episode.description ? (
            <p className="text-xs text-white/50 line-clamp-2 mt-1.5 leading-relaxed">
              {episode.description}
            </p>
          ) : null}

          {/* Duration for active */}
          {isActive && episode.duration ? (
            <span className="text-[11px] text-white/30 mt-1.5">
              {episode.duration}m left
            </span>
          ) : null}
        </div>
      </button>
    );
  },
);

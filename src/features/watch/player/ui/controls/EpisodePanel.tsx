'use client';

import { ChevronDown, Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
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

// Height of each thumbnail slot (px)
const ITEM_H = 115;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIdx, setCenterIdx] = useState(0);
  const [isHoveringCenter, setIsHoveringCenter] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [padH, setPadH] = useState(0);
  const rafRef = useRef<number>(0);
  // Track mount/unmount to animate out before removing from DOM
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Next frame: trigger enter animation
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
    } else {
      setVisible(false);
      // Wait for exit animation to finish before unmounting
      const t = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const isCurrentSeason = selectedSeason === currentSeason;

  // Find current episode index for initial scroll
  const currentIdx = episodes.findIndex(
    (ep) => isCurrentSeason && ep.episodeNumber === currentEpisode,
  );

  // Compute padding so first & last items can scroll to center
  // biome-ignore lint/correctness/useExhaustiveDependencies: recalc on open/mount/episodes change
  useEffect(() => {
    if (!isOpen || !shouldRender || !scrollRef.current) return;
    const viewH = scrollRef.current.clientHeight;
    setPadH(Math.floor(viewH / 2 - ITEM_H / 2));
  }, [isOpen, shouldRender, episodes.length]);

  // Track which item is closest to the vertical center
  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const viewH = el.clientHeight;
      const scrollY = el.scrollTop;
      const mid = scrollY + viewH / 2;
      const pad = Math.floor(viewH / 2 - ITEM_H / 2);
      const idx = Math.round((mid - pad - ITEM_H / 2) / ITEM_H);
      setCenterIdx(Math.max(0, Math.min(episodes.length - 1, idx)));
    });
  }, [episodes.length]);

  // Initial scroll to current episode
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on open + season change
  useEffect(() => {
    if (!isOpen || !scrollRef.current || padH === 0) return;
    const targetIdx = currentIdx >= 0 ? currentIdx : 0;
    scrollRef.current.scrollTop = targetIdx * ITEM_H;
    setCenterIdx(targetIdx);
  }, [isOpen, selectedSeason, currentIdx, padH]);

  // Cleanup raf on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (!shouldRender) return null;

  const centerEp = episodes[centerIdx];

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute inset-0 z-[60]',
        'pointer-events-auto',
        'transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* ── Single unified glass backdrop ── covers full viewport so the
           watch-party sidebar is also blurred when the panel opens ── */}
      <div
        className={cn(
          'fixed inset-0 backdrop-blur-xl bg-black/20',
          'transition-[backdrop-filter] duration-300 ease-out',
          visible ? 'backdrop-blur-xl' : 'backdrop-blur-none',
        )}
      />

      {/* ── Close target — fixed so clicks anywhere (incl. sidebar) close the panel ── */}
      {/* biome-ignore lint/a11y/useSemanticElements: glass scrim acts as close target */}
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close episodes"
      />

      {/* ── Info panel — appears to the left of the scroll column on hover ── */}
      {centerEp && isHoveringCenter && (
        <div
          className={cn(
            'absolute right-[235px] md:right-[275px] lg:right-[305px] top-1/2 -translate-y-1/2',
            'max-w-[260px] md:max-w-[320px]',
            'pointer-events-none z-10',
            'animate-in slide-in-from-right-4 fade-in duration-300 ease-out',
          )}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium text-white/35 uppercase tracking-widest">
              Episode {centerEp.episodeNumber}
            </span>
            <h3 className="text-base md:text-lg font-semibold text-white leading-tight">
              {centerEp.title || `Episode ${centerEp.episodeNumber}`}
            </h3>
            {centerEp.description && (
              <p className="text-[11px] md:text-xs text-white/45 line-clamp-3 leading-relaxed">
                {centerEp.description}
              </p>
            )}
            {centerEp.duration && (
              <span className="text-[10px] text-white/25 font-medium">
                {centerEp.duration} min
              </span>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Play className="w-2.5 h-2.5 text-white/35 fill-current" />
              <span className="text-[9px] text-white/25 uppercase tracking-wider font-medium">
                Click to play
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Right column — season dropdown + scroll wheel (full height, center via spacers) ── */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0',
          'w-[220px] md:w-[260px] lg:w-[290px]',
          'flex flex-col items-center',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Custom season dropdown */}
        {seasons.length > 1 && (
          <div className="relative mb-2 shrink-0 z-10">
            <button
              type="button"
              onClick={() => setSeasonOpen((p) => !p)}
              className={cn(
                'flex items-center gap-2',
                'bg-white/6 hover:bg-white/10 border border-white/8',
                'rounded-full px-5 py-2',
                'text-[13px] font-medium text-white/60',
                'transition-colors',
              )}
            >
              S{selectedSeason}
              <ChevronDown
                className={cn(
                  'w-3 h-3 text-white/30 transition-transform duration-200',
                  seasonOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Dropdown menu */}
            {seasonOpen && (
              <div
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 mt-1',
                  'bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl',
                  'py-1.5 min-w-[120px]',
                  'animate-in fade-in slide-in-from-top-2 duration-200',
                  'shadow-xl shadow-black/40',
                )}
              >
                {seasons.map((s) => (
                  <button
                    key={s.seasonNumber}
                    type="button"
                    onClick={() => {
                      onSeasonChange(s.seasonNumber);
                      setSeasonOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[12px] font-medium',
                      'transition-colors',
                      s.seasonNumber === selectedSeason
                        ? 'text-white bg-white/10'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                    )}
                  >
                    Season {s.seasonNumber}
                    {s.episodeCount ? (
                      <span className="text-white/25 ml-1.5">
                        {s.episodeCount} ep
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scroll wheel */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-white/25 animate-spin" />
            <span className="text-[9px] text-white/25">Loading...</span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-white/20">No episodes</span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn(
              'flex-1 min-h-0 w-full overflow-y-auto',
              'snap-y snap-mandatory',
              'no-scrollbar',
            )}
          >
            {/* Top spacer — lets first item scroll to center */}
            <div style={{ height: padH }} />

            {episodes.map((ep, i) => {
              const dist = Math.abs(i - centerIdx);
              const isCenter = i === centerIdx;
              const isPlaying =
                isCurrentSeason && ep.episodeNumber === currentEpisode;
              const scale = Math.max(0.5, 1 - dist * 0.15);
              const opacity = Math.max(0.12, 1 - dist * 0.28);

              return (
                <EpisodeThumb
                  key={ep.episodeId || ep.episodeNumber}
                  episode={ep}
                  isCenter={isCenter}
                  isPlaying={isPlaying}
                  scale={scale}
                  opacity={opacity}
                  onSelect={() => onEpisodeSelect(ep)}
                  onHoverCenter={
                    isCenter
                      ? (hovering) => setIsHoveringCenter(hovering)
                      : undefined
                  }
                />
              );
            })}

            {/* Bottom spacer — lets last item scroll to center */}
            <div style={{ height: padH }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Episode Thumbnail (scroll-wheel item) ─────────────────────────────────

interface EpisodeThumbProps {
  episode: Episode;
  isCenter: boolean;
  isPlaying: boolean;
  scale: number;
  opacity: number;
  onSelect: () => void;
  onHoverCenter?: (hovering: boolean) => void;
}

const EpisodeThumb = forwardRef<HTMLButtonElement, EpisodeThumbProps>(
  function EpisodeThumb(
    { episode, isCenter, isPlaying, scale, opacity, onSelect, onHoverCenter },
    ref,
  ) {
    return (
      <div
        className="snap-center flex items-center justify-center"
        style={{ height: ITEM_H }}
      >
        <button
          ref={ref}
          type="button"
          onClick={onSelect}
          onMouseEnter={() => onHoverCenter?.(true)}
          onMouseLeave={() => onHoverCenter?.(false)}
          className={cn(
            'group relative rounded-lg overflow-hidden',
            'transition-all duration-500 ease-out',
            'focus:outline-none',
            isCenter
              ? 'ring-1 ring-white/20 shadow-[0_0_25px_rgba(255,255,255,0.05)]'
              : '',
          )}
          style={{
            width: isCenter ? 220 : 170,
            aspectRatio: '16/9',
            transform: `scale(${scale})`,
            opacity,
            transition:
              'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease-out, width 0.5s ease-out',
          }}
          aria-label={`${episode.title || `Episode ${episode.episodeNumber}`}${isPlaying ? ' (now playing)' : ''}`}
        >
          {episode.thumbnailUrl ? (
            <Image
              src={getOptimizedImageUrl(episode.thumbnailUrl)}
              alt={episode.title || `Episode ${episode.episodeNumber}`}
              fill
              className={cn(
                'object-cover transition-all duration-500',
                isCenter
                  ? 'brightness-100'
                  : 'brightness-50 group-hover:brightness-75',
              )}
              unoptimized={episode.thumbnailUrl.includes('/api/stream/')}
              sizes="220px"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="text-sm font-bold text-white/10">
                {episode.episodeNumber}
              </span>
            </div>
          )}

          {/* Now-playing audio bars */}
          {isPlaying && isCenter && (
            <div className="absolute top-1 left-1 flex items-end gap-[2px] h-2.5">
              {[0, 150, 300, 450].map((delay) => (
                <span
                  key={delay}
                  className="w-[2px] bg-white rounded-full animate-pulse"
                  style={{
                    animationDelay: `${delay}ms`,
                    height: `${5 + Math.random() * 6}px`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Episode number badge */}
          <div
            className={cn(
              'absolute bottom-1 left-1',
              'px-1 py-0.5 rounded',
              'bg-black/60 backdrop-blur-sm',
              'text-[9px] font-semibold text-white/80 tabular-nums',
            )}
          >
            E{episode.episodeNumber}
          </div>

          {/* Duration badge */}
          {episode.duration && (
            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-[8px] text-white/55 font-medium">
              {episode.duration}m
            </div>
          )}

          {/* Play icon overlay on hover (center only) */}
          {isCenter && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg shadow-black/30">
                <Play className="w-3.5 h-3.5 text-black fill-current ml-0.5" />
              </div>
            </div>
          )}
        </button>
      </div>
    );
  },
);

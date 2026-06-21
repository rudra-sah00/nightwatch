'use client';

import Image from 'next/image';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExploreData, ExploreItem } from '../api';

interface HeroCarouselProps {
  banner: ExploreData['banner'];
  trending: ExploreItem[];
  onItemClick: (item: ExploreItem) => void;
}

export const HeroCarousel = memo(function HeroCarousel({
  banner,
  trending,
  onItemClick,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = useMemo(
    () =>
      banner.length
        ? trending.slice(0, Math.min(banner.length, 8))
        : trending.slice(0, 8),
    [banner.length, trending],
  );

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(next, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, next, items.length]);

  const current = items[activeIndex];
  if (!items.length || !current) return null;

  // Only preload current and next image for performance
  const nextIndex = (activeIndex + 1) % items.length;
  const prevIndex = (activeIndex - 1 + items.length) % items.length;
  const visibleIndices = new Set([activeIndex, nextIndex, prevIndex]);

  return (
    <section
      className="relative w-full shrink-0 overflow-hidden rounded-t-2xl will-change-contents"
      style={{ height: '500px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Trending content carousel"
    >
      {/* Background Images - only render nearby slides */}
      <div className="absolute inset-0">
        {items.map((item, i) => {
          if (!visibleIndices.has(i)) return null;
          const imgSrc = banner[i]?.image || item.cover;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out will-change-[opacity] ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={imgSrc}
                alt={item.title}
                fill
                className="object-cover"
                style={{ objectPosition: '50% 50%' }}
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          );
        })}
        {/* Gradients - combined into fewer layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
            linear-gradient(to top, var(--color-card) 0%, color-mix(in srgb, var(--color-card) 70%, transparent) 30%, transparent 55%),
            linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 35%),
            linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 35%)
          `,
          }}
        />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-14 flex flex-col gap-2 max-w-2xl">
        <span className="font-headline text-[10px] font-black uppercase tracking-[0.3em] text-neo-yellow">
          Trending #{activeIndex + 1}
        </span>
        <h1 className="font-headline text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-[0.9] drop-shadow-lg">
          {current.title.replace(/\s*\[.*?\]\s*/g, '')}
        </h1>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          {current.imdbRating && (
            <span className="bg-neo-yellow/90 text-black text-xs font-black px-2 py-0.5 rounded-sm font-headline">
              IMDb {current.imdbRating}
            </span>
          )}
          <span className="text-white/80 text-sm font-bold font-headline uppercase drop-shadow">
            {current.type}
          </span>
          <span className="text-white/60 text-sm font-headline drop-shadow">
            {current.genre}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onItemClick(current)}
          className="mt-3 w-fit bg-white/90 backdrop-blur-sm text-black font-headline font-black uppercase text-sm tracking-widest px-8 py-3 rounded-sm hover:bg-neo-yellow transition-colors cursor-pointer"
        >
          Watch Now
        </button>
      </div>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <span className="material-symbols-outlined text-4xl">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
            aria-label="Next"
          >
            <span className="material-symbols-outlined text-4xl">
              chevron_right
            </span>
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-10 md:right-14 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={`dot-${items[i].id}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`h-1 rounded-full transition-all cursor-pointer ${
                i === activeIndex
                  ? 'w-6 bg-neo-yellow'
                  : 'w-3 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
});

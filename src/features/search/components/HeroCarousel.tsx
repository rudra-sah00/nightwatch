'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExploreData, ExploreItem } from '../api';

interface HeroCarouselProps {
  banner: ExploreData['banner'];
  trending: ExploreItem[];
  onItemClick: (item: ExploreItem) => void;
}

export function HeroCarousel({
  banner,
  trending,
  onItemClick,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use banner for background images, trending for metadata
  const items = banner.length
    ? trending.slice(0, Math.min(banner.length, 8))
    : trending.slice(0, 8);

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(next, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, next, items.length]);

  if (!items.length) return null;

  const current = items[activeIndex];
  const bg = banner[activeIndex]?.image || current.cover;

  return (
    <section
      className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Trending content carousel"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={bg}
          alt={current.title}
          fill
          className="object-cover object-top"
          sizes="100vw"
          priority
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-16 flex flex-col gap-3 max-w-3xl">
        <span className="font-headline text-[10px] font-black uppercase tracking-[0.3em] text-neo-yellow">
          Trending #{activeIndex + 1}
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
          {current.title.replace(/\s*\[.*?\]\s*/g, '')}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {current.imdbRating && (
            <span className="bg-neo-yellow text-black text-xs font-black px-2 py-0.5 font-headline">
              IMDb {current.imdbRating}
            </span>
          )}
          <span className="text-white/70 text-sm font-bold font-headline uppercase">
            {current.type}
          </span>
          <span className="text-white/50 text-sm font-headline">
            {current.genre}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onItemClick(current)}
          className="mt-3 w-fit bg-white text-black font-headline font-black uppercase text-sm tracking-widest px-8 py-3 border-[3px] border-white hover:bg-neo-yellow hover:border-neo-yellow transition-colors cursor-pointer"
        >
          Watch Now
        </button>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 border-2 border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <span className="material-symbols-outlined text-xl">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 border-2 border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Next"
          >
            <span className="material-symbols-outlined text-xl">
              chevron_right
            </span>
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-10 md:right-16 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={`dot-${items[i].id}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`h-1 rounded-full transition-all cursor-pointer ${
                i === activeIndex
                  ? 'w-6 bg-neo-yellow'
                  : 'w-3 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExploreData, ExploreItem } from '@/features/search/api';

interface TvHeroProps {
  banner: ExploreData['banner'];
  trending: ExploreItem[];
}

export function TvHero({ banner, trending }: TvHeroProps) {
  const router = useRouter();
  const items = trending.slice(0, Math.min(banner.length || 8, 8));
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const current = items[active];

  // Auto-slide every 6s, pauses when focused
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [items.length, paused]);

  // Preload next image
  useEffect(() => {
    const nextIdx = (active + 1) % items.length;
    const nextImg =
      banner[nextIdx]?.image ||
      items[nextIdx]?.backdrop ||
      items[nextIdx]?.cover;
    if (nextImg) {
      const img = new Image();
      img.src = nextImg;
    }
  }, [active, items, banner]);

  const { ref, focusKey, focused, hasFocusedChild } = useFocusable({
    focusKey: 'TV_HERO',
    trackChildren: true,
    onArrowPress: (dir) => {
      if (dir === 'left') {
        setActive((i) => (i - 1 + items.length) % items.length);
        return false; // consume the press
      }
      if (dir === 'right') {
        setActive((i) => (i + 1) % items.length);
        return false;
      }
      return true; // allow up/down to leave
    },
  });

  // Pause auto-slide when hero has focus
  useEffect(() => {
    setPaused(focused || hasFocusedChild);
  }, [focused, hasFocusedChild]);

  const openCurrent = useCallback(() => {
    if (current) router.push(`/content/${current.id}`);
  }, [current, router]);

  if (!current) return null;

  const bgImage = banner[active]?.image || current.backdrop || current.cover;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="relative h-[360px] rounded-2xl overflow-hidden mx-8 mb-8"
      >
        {/* Background image */}
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-8 max-w-[50%]">
          <h2 className="text-3xl font-bold mb-2 line-clamp-2">
            {current.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-white/70 mb-4">
            {current.imdbRating && (
              <span className="bg-yellow-500 text-black font-bold px-2 py-0.5 rounded">
                ⭐ {current.imdbRating}
              </span>
            )}
            {current.genre && <span>{current.genre}</span>}
            {current.releaseDate && (
              <span>{current.releaseDate.slice(0, 4)}</span>
            )}
          </div>
          {/* Watch button */}
          <WatchButton onPress={openCurrent} />
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-4 right-8 flex gap-2">
          {items.map((_, i) => (
            <div
              key={items[i].id}
              className={`h-2 rounded-full transition-[width,background-color] duration-300 ${
                i === active ? 'bg-indigo-400 w-6' : 'bg-white/40 w-2'
              }`}
            />
          ))}
        </div>

        {/* Focus ring */}
        {(focused || hasFocusedChild) && (
          <div className="absolute inset-0 rounded-2xl ring-3 ring-indigo-500 pointer-events-none" />
        )}
      </div>
    </FocusContext.Provider>
  );
}

function WatchButton({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
        focused
          ? 'bg-indigo-500 text-white scale-105 shadow-lg'
          : 'bg-white/20 text-white backdrop-blur-sm'
      }`}
    >
      <span className="material-symbols-outlined text-lg">play_arrow</span>
      Watch
    </button>
  );
}

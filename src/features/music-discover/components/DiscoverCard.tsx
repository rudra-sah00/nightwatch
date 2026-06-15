'use client';

import Image from 'next/image';
import type { DiscoverSong } from '../api';

interface DiscoverCardProps {
  song: DiscoverSong;
  dragX: number;
  swipeDir: 'left' | 'right' | null;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

export function DiscoverCard({
  song,
  dragX,
  swipeDir,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  cardRef,
}: DiscoverCardProps) {
  const swipeOpacity = Math.min(Math.abs(dragX) / 80, 1);

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        transform:
          swipeDir === 'right'
            ? 'translateX(150%) rotate(20deg) scale(0.9)'
            : swipeDir === 'left'
              ? 'translateX(-150%) rotate(-20deg) scale(0.9)'
              : `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`,
        transition:
          swipeDir || !dragging
            ? 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none',
      }}
      className="relative w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-[3px] border-border shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none z-10"
    >
      <Image
        src={song.image}
        alt={song.title}
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

      {/* Seed attribution */}
      {song.seed && (
        <div className="absolute top-4 left-4 right-4">
          <p className="text-[10px] font-medium text-white/50 truncate">
            Because you liked{' '}
            <span className="text-white/70 font-semibold">{song.seed}</span>
          </p>
        </div>
      )}

      {/* Song info */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h2 className="font-headline text-xl font-black leading-tight text-white line-clamp-2">
          {song.title}
        </h2>
        <p className="text-sm text-white/70 mt-1 line-clamp-1">{song.artist}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60 backdrop-blur-sm">
            {song.language}
          </span>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60 backdrop-blur-sm">
            {song.year}
          </span>
        </div>
      </div>

      {/* Swipe indicators */}
      {dragX > 20 && (
        <div
          className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-green-400 bg-green-400/20 backdrop-blur-sm text-green-400 font-headline font-black text-lg rotate-[-12deg]"
          style={{ opacity: swipeOpacity }}
        >
          LIKE ♪
        </div>
      )}
      {dragX < -20 && (
        <div
          className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-red-400 bg-red-400/20 backdrop-blur-sm text-red-400 font-headline font-black text-lg rotate-[12deg]"
          style={{ opacity: swipeOpacity }}
        >
          SKIP
        </div>
      )}
    </div>
  );
}

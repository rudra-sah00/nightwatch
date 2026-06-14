'use client';

import { ArrowLeft, Heart, ThumbsDown, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStreamUrl } from '@/features/music/api';
import { type DiscoverSong, getDiscoverFeed, swipeSong } from '../api';

export function DiscoverView() {
  const [feed, setFeed] = useState<DiscoverSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef({ startX: 0, currentX: 0, dragging: false });
  const cardRef = useRef<HTMLDivElement>(null);

  // Load feed
  useEffect(() => {
    setLoading(true);
    getDiscoverFeed(20)
      .then((songs) => {
        setFeed(songs);
        setCurrentIndex(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentSong = feed[currentIndex];

  // Play preview audio (33% of duration, 20 seconds)
  useEffect(() => {
    if (!currentSong) return;
    let cancelled = false;
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = muted ? 0 : 0.8;

    getStreamUrl(currentSong.id, 96)
      .then((url) => {
        if (cancelled) return;
        audio.src = url;
        audio.currentTime = Math.floor(currentSong.duration * 0.33);
        audio.play().catch(() => {});
        // Stop after 20 seconds
        setTimeout(() => {
          if (!cancelled) audio.pause();
        }, 20000);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      audio.pause();
      audio.src = '';
    };
  }, [currentSong, muted]);

  // Handle swipe action
  const handleSwipe = useCallback(
    (action: 'like' | 'dislike') => {
      if (!currentSong) return;
      setSwipeDir(action === 'like' ? 'right' : 'left');
      swipeSong(currentSong.id, action).catch(() => {});

      setTimeout(() => {
        setSwipeDir(null);
        setCurrentIndex((i) => i + 1);
        // Load more when running low
        if (currentIndex >= feed.length - 5) {
          getDiscoverFeed(20)
            .then((more) => setFeed((f) => [...f, ...more]))
            .catch(() => {});
        }
      }, 300);
    },
    [currentSong, currentIndex, feed.length],
  );

  // Touch/drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      currentX: e.clientX,
      dragging: true,
    };
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.currentX = e.clientX;
    const dx = dragRef.current.currentX - dragRef.current.startX;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
      cardRef.current.style.transition = 'none';
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const dx = dragRef.current.currentX - dragRef.current.startX;
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease';
      cardRef.current.style.transform = '';
    }
    if (dx > 100) handleSwipe('like');
    else if (dx < -100) handleSwipe('dislike');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleSwipe('like');
      if (e.key === 'ArrowLeft') handleSwipe('dislike');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSwipe]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neo-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-headline text-lg font-bold">No more songs!</p>
        <p className="text-sm text-foreground/60">
          Come back later for fresh picks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href="/music"
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-headline text-lg font-black uppercase tracking-tight">
          Discover
        </h1>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="ml-auto p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          {muted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-6 pb-4">
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border-[3px] border-border shadow-xl cursor-grab active:cursor-grabbing select-none touch-none ${
            swipeDir === 'right'
              ? 'translate-x-[120%] rotate-12 transition-transform duration-300'
              : swipeDir === 'left'
                ? '-translate-x-[120%] -rotate-12 transition-transform duration-300'
                : ''
          }`}
        >
          {/* Background image */}
          <Image
            src={currentSong.image}
            alt={currentSong.title}
            fill
            className="object-cover"
            priority
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Song info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="font-headline text-2xl font-black leading-tight line-clamp-2">
              {currentSong.title}
            </h2>
            <p className="text-sm text-white/70 mt-1 line-clamp-1">
              {currentSong.artist}
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              {currentSong.album} • {currentSong.year}
            </p>
          </div>

          {/* Swipe indicators */}
          {swipeDir === 'right' && (
            <div className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-green-400 text-green-400 font-headline font-black text-xl rotate-[-15deg]">
              LIKE
            </div>
          )}
          {swipeDir === 'left' && (
            <div className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-red-400 text-red-400 font-headline font-black text-xl rotate-[15deg]">
              NOPE
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-8 pb-6">
        <button
          type="button"
          onClick={() => handleSwipe('dislike')}
          className="w-16 h-16 flex items-center justify-center rounded-full border-[3px] border-red-400 text-red-400 hover:bg-red-400/10 transition-colors active:scale-90"
        >
          <ThumbsDown className="w-7 h-7" />
        </button>
        <button
          type="button"
          onClick={() => handleSwipe('like')}
          className="w-20 h-20 flex items-center justify-center rounded-full border-[3px] border-green-400 text-green-400 hover:bg-green-400/10 transition-colors active:scale-90"
        >
          <Heart className="w-9 h-9" />
        </button>
      </div>
    </div>
  );
}

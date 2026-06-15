'use client';

import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStreamUrl } from '@/features/music/api';
import { type DiscoverSong, getDiscoverFeed, swipeSong } from '../api';

interface PreloadedAudio {
  songId: string;
  audio: HTMLAudioElement;
}

const PRELOAD_AHEAD = 3;
const PREVIEW_DURATION = 20;

export function DiscoverView() {
  const [feed, setFeed] = useState<DiscoverSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const preloadCache = useRef<Map<string, PreloadedAudio>>(new Map());
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef({ startX: 0, currentX: 0, dragging: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);

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
  const nextSong = feed[currentIndex + 1];
  const thirdSong = feed[currentIndex + 2];

  // Preload audio
  const preloadSongs = useCallback(
    (startIdx: number) => {
      for (
        let i = startIdx;
        i < Math.min(startIdx + PRELOAD_AHEAD, feed.length);
        i++
      ) {
        const song = feed[i];
        if (!song || preloadCache.current.has(song.id)) continue;
        const entry: PreloadedAudio = { songId: song.id, audio: new Audio() };
        preloadCache.current.set(song.id, entry);
        getStreamUrl(song.id, 96)
          .then((url) => {
            entry.audio.src = url;
            entry.audio.preload = 'auto';
            entry.audio.addEventListener(
              'loadedmetadata',
              () => {
                entry.audio.currentTime = Math.floor(song.duration * 0.33);
              },
              { once: true },
            );
            entry.audio.load();
          })
          .catch(() => {});
      }
    },
    [feed],
  );

  useEffect(() => {
    if (feed.length > 0) preloadSongs(currentIndex);
  }, [feed, currentIndex, preloadSongs]);

  // Play audio
  const playCurrentAudio = useCallback(() => {
    if (!currentSong) return;
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current = null;
    }
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    const cached = preloadCache.current.get(currentSong.id);
    const audio = cached?.audio || new Audio();
    activeAudio.current = audio;
    audio.volume = muted ? 0 : 0.8;

    const startPlay = () => {
      audio.currentTime = Math.floor(currentSong.duration * 0.33);
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked — will start on interaction
        });
      }
    };

    if (cached?.audio.src) {
      startPlay();
    } else {
      getStreamUrl(currentSong.id, 96)
        .then((url) => {
          audio.src = url;
          audio.addEventListener('loadeddata', startPlay, { once: true });
          audio.load();
        })
        .catch(() => {});
    }

    fadeTimer.current = setTimeout(() => {
      let vol = audio.volume;
      const fade = setInterval(() => {
        vol -= 0.08;
        if (vol <= 0) {
          clearInterval(fade);
          audio.pause();
        } else {
          audio.volume = vol;
        }
      }, 150);
    }, PREVIEW_DURATION * 1000);
  }, [currentSong, muted]);

  // Play when song changes or after first interaction
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentSong triggers replay on song change
  useEffect(() => {
    if (hasInteracted) playCurrentAudio();
  }, [currentSong, hasInteracted, playCurrentAudio]);

  // First interaction handler — unlock audio
  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playCurrentAudio();
    }
  }, [hasInteracted, playCurrentAudio]);

  useEffect(() => {
    if (activeAudio.current) activeAudio.current.volume = muted ? 0 : 0.8;
  }, [muted]);
  useEffect(
    () => () => {
      for (const e of preloadCache.current.values()) {
        e.audio.pause();
        e.audio.src = '';
      }
    },
    [],
  );

  // Swipe
  const handleSwipe = useCallback(
    (action: 'like' | 'dislike') => {
      if (!currentSong) return;
      handleFirstInteraction();
      setSwipeDir(action === 'like' ? 'right' : 'left');
      swipeSong(currentSong.id, action).catch(() => {});
      if (activeAudio.current) {
        activeAudio.current.pause();
        activeAudio.current = null;
      }
      const cached = preloadCache.current.get(currentSong.id);
      if (cached) {
        cached.audio.src = '';
        preloadCache.current.delete(currentSong.id);
      }

      setTimeout(() => {
        setSwipeDir(null);
        setDragX(0);
        setCurrentIndex((i) => i + 1);
        if (currentIndex >= feed.length - 5) {
          getDiscoverFeed(20)
            .then((more) => setFeed((f) => [...f, ...more]))
            .catch(() => {});
        }
      }, 350);
    },
    [currentSong, currentIndex, feed.length, handleFirstInteraction],
  );

  // Drag
  const onPointerDown = (e: React.PointerEvent) => {
    handleFirstInteraction();
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
    setDragX(dragRef.current.currentX - dragRef.current.startX);
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const dx = dragRef.current.currentX - dragRef.current.startX;
    if (dx > 80) handleSwipe('like');
    else if (dx < -80) handleSwipe('dislike');
    else setDragX(0);
  };

  // Keyboard
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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-6 relative">
          <div className="absolute w-[calc(100%-6rem)] max-w-[300px] aspect-[3/4] rounded-3xl bg-muted/40 animate-pulse scale-[0.88] translate-y-4" />
          <div className="absolute w-[calc(100%-4.5rem)] max-w-[320px] aspect-[3/4] rounded-3xl bg-muted/60 animate-pulse scale-[0.94] translate-y-2" />
          <div className="relative w-full max-w-[340px] aspect-[3/4] rounded-3xl bg-muted animate-pulse z-10 flex flex-col justify-end p-5 gap-2">
            <div className="h-6 w-3/4 rounded bg-muted-foreground/10" />
            <div className="h-4 w-1/2 rounded bg-muted-foreground/10" />
            <div className="flex gap-2 mt-1">
              <div className="h-5 w-14 rounded-full bg-muted-foreground/10" />
              <div className="h-5 w-10 rounded-full bg-muted-foreground/10" />
            </div>
          </div>
        </div>
        <div className="shrink-0 pb-6 flex flex-col items-center gap-1">
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
        </div>
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

  const swipeOpacity = Math.min(Math.abs(dragX) / 80, 1);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <Link
          href="/music"
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-headline text-lg font-black uppercase tracking-tight">
          Discover
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleFirstInteraction();
              setMuted(!muted);
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            {muted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Tap to start overlay */}
      {!hasInteracted && (
        <button
          type="button"
          onClick={handleFirstInteraction}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        >
          <div className="bg-card px-6 py-3 rounded-full border-2 border-border shadow-lg">
            <span className="font-headline font-bold text-sm uppercase">
              Tap to start ♪
            </span>
          </div>
        </button>
      )}

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6 relative">
        {/* Third card */}
        {thirdSong && (
          <div
            className="absolute w-[calc(100%-6rem)] max-w-[300px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/30 scale-[0.88] translate-y-4 transition-all duration-300"
            style={{ opacity: swipeDir ? 0.6 : 0.4 }}
          >
            <Image src={thirdSong.image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Second card */}
        {nextSong && (
          <div
            className="absolute w-[calc(100%-4.5rem)] max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/50 transition-all duration-300"
            style={{
              opacity: swipeDir ? 0.8 : 0.6,
              transform: swipeDir
                ? 'scale(1) translateY(0px)'
                : 'scale(0.94) translateY(8px)',
            }}
          >
            <Image src={nextSong.image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        {/* Current card */}
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
            opacity: swipeDir ? 0 : 1,
            transition:
              swipeDir || !dragRef.current.dragging
                ? 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                : 'none',
          }}
          className="relative w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-[3px] border-border shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none z-10"
        >
          <Image
            src={currentSong.image}
            alt={currentSong.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

          {/* Song info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="font-headline text-xl font-black leading-tight text-white line-clamp-2">
              {currentSong.title}
            </h2>
            <p className="text-sm text-white/70 mt-1 line-clamp-1">
              {currentSong.artist}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60 backdrop-blur-sm">
                {currentSong.language}
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60 backdrop-blur-sm">
                {currentSong.year}
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
      </div>

      {/* Bottom hint */}
      <div className="shrink-0 pb-6 flex flex-col items-center gap-1">
        <p className="text-xs text-foreground/40 font-medium">
          ← skip • like →
        </p>
      </div>
    </div>
  );
}

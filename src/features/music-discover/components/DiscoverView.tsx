'use client';

import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics';
import { type DiscoverSong, getDiscoverFeed, swipeSong } from '../api';
import { useDiscoverPreview } from '../hooks/use-discover-preview';
import { DiscoverActions } from './DiscoverActions';
import { DiscoverCard } from './DiscoverCard';
import { DiscoverCardStack } from './DiscoverCardStack';

const UNDO_WINDOW = 5000;

export function DiscoverView() {
  const [feed, setFeed] = useState<DiscoverSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [dragX, setDragX] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const dragRef = useRef({ startX: 0, currentX: 0, dragging: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const swipedIds = useRef<Set<string>>(new Set());
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSwipe = useRef<{
    song: DiscoverSong;
    action: 'like' | 'dislike';
    index: number;
  } | null>(null);

  const {
    hasInteracted,
    isPlaying,
    handleFirstInteraction,
    stopCurrent,
    cleanupSong,
    togglePlay,
  } = useDiscoverPreview(feed, currentIndex, muted);

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

  // Undo swipe
  const handleUndo = useCallback(() => {
    if (!lastSwipe.current) return;
    const { song, index } = lastSwipe.current;
    swipedIds.current.delete(song.id);
    setCurrentIndex(index);
    setCanUndo(false);
    lastSwipe.current = null;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    hapticLight();
  }, []);

  // Swipe
  const handleSwipe = useCallback(
    (action: 'like' | 'dislike') => {
      if (!currentSong || swipedIds.current.has(currentSong.id)) return;
      handleFirstInteraction();
      swipedIds.current.add(currentSong.id);
      setSwipeDir(action === 'like' ? 'right' : 'left');

      if (action === 'like') {
        hapticSuccess();
      } else {
        hapticMedium();
      }

      const swipePromise = swipeSong(currentSong.id, action, {
        artist: currentSong.artist,
        language: currentSong.language,
      }).catch(() => {});

      stopCurrent();
      cleanupSong(currentSong.id);

      // Store for undo
      lastSwipe.current = { song: currentSong, action, index: currentIndex };
      setCanUndo(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        lastSwipe.current = null;
        setCanUndo(false);
      }, UNDO_WINDOW);

      setTimeout(() => {
        // Increment index first, THEN clear swipeDir in next tick
        setCurrentIndex((i) => i + 1);
        requestAnimationFrame(() => {
          setSwipeDir(null);
          setDragX(0);
        });
        if (currentIndex >= feed.length - 5) {
          swipePromise.then(() =>
            getDiscoverFeed(20)
              .then((more) =>
                setFeed((f) => {
                  const existingIds = new Set(f.map((s) => s.id));
                  const unique = more.filter(
                    (s) =>
                      !existingIds.has(s.id) && !swipedIds.current.has(s.id),
                  );
                  return [...f, ...unique];
                }),
              )
              .catch(() => {}),
          );
        }
      }, 350);
    },
    [
      currentSong,
      currentIndex,
      feed.length,
      handleFirstInteraction,
      stopCurrent,
      cleanupSong,
    ],
  );

  // Drag handlers
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
    const dx = dragRef.current.currentX - dragRef.current.startX;
    setDragX(dx);
    if (Math.abs(dx) > 80 && Math.abs(dragX) <= 80) {
      hapticLight();
    }
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const dx = dragRef.current.currentX - dragRef.current.startX;
    if (dx > 80) {
      handleSwipe('like');
    } else if (dx < -80) {
      handleSwipe('dislike');
    } else {
      setDragX(0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleSwipe('like');
      if (e.key === 'ArrowLeft') handleSwipe('dislike');
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) handleUndo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSwipe, handleUndo]);

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
      <div className="flex-1 flex items-center justify-center px-6 pb-3 relative">
        <DiscoverCardStack
          nextSong={nextSong}
          thirdSong={thirdSong}
          animating={!!swipeDir}
        />
        <DiscoverCard
          key={currentSong.id}
          song={currentSong}
          dragX={dragX}
          swipeDir={swipeDir}
          dragging={dragRef.current.dragging}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          cardRef={cardRef}
        />
      </div>

      {/* Action Buttons */}
      <DiscoverActions
        song={currentSong}
        onSwipe={handleSwipe}
        onUndo={handleUndo}
        onTogglePlay={togglePlay}
        isPlaying={isPlaying}
        canUndo={canUndo}
      />
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { Suspense, useCallback, useRef, useState } from 'react';
import { PlayerLoadingSkeleton } from '@/components/ui/PlayerLoadingSkeleton';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import { useWatchContent } from '@/features/watch/hooks/use-watch-content';
import { useMobileDetection } from '@/features/watch/player/hooks/useMobileDetection';

function WatchContent() {
  const {
    router,
    movieId,
    season,
    episode,
    description,
    isRefetching,
    refetchError,
    streamUrl,
    metadata,
    captionUrl,
    subtitleTracks,
    spriteVtt,
    qualities,
    s2AudioTracks,
    handleS2AudioTrackChange,
    s2ActiveTrackId,
    handleStreamExpired,
    refetchStream,
  } = useWatchContent();

  const t = useTranslations('watch');

  const isMobile = useMobileDetection();
  const swipeRef = useRef<{ y: number; x: number } | null>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dy = e.touches[0].clientY - swipeRef.current.y;
    const dx = Math.abs(e.touches[0].clientX - swipeRef.current.x);
    if (dy > 0 && dy > dx) setSwipeY(dy);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (swipeY > 120) {
      setDismissing(true);
      setSwipeY(window.innerHeight);
      setTimeout(() => {
        if (window.history.length > 2) router.back();
        else router.push('/home');
      }, 250);
    } else {
      setSwipeY(0);
    }
    swipeRef.current = null;
  }, [swipeY, router]);

  // No stream URL after refetch has settled
  if (!isRefetching && !streamUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          {refetchError || t('page.noStream')}
        </h2>
        <p className="text-white/60 mb-6">
          {refetchError ? t('page.errorLoading') : t('page.startFromContent')}
        </p>
        <div className="flex gap-3">
          {refetchError ? (
            <button
              type="button"
              onClick={() => refetchStream()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              {t('page.tryAgain')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium/90 transition-colors"
          >
            {t('page.goToHome')}
          </button>
        </div>
      </div>
    );
  }

  // Create a unique key that changes when episode changes to force WatchPage remount
  const watchKey = `${movieId}-${season || 0}-${episode || 0}`;
  const isSeries = metadata.type === 'series';

  const metaLabel = isSeries
    ? [
        metadata.season != null
          ? t('page.seasonLabel', { number: metadata.season })
          : null,
        metadata.episode != null
          ? t('page.episodeLabel', { number: metadata.episode })
          : null,
      ]
        .filter(Boolean)
        .join(' • ')
    : metadata.year
      ? t('page.movieYear', { year: metadata.year })
      : t('player.movie');

  return (
    <div
      className="min-h-screen bg-background"
      {...(isMobile ? { onTouchStart, onTouchMove, onTouchEnd } : {})}
      style={
        isMobile && swipeY > 0
          ? {
              transform: `translateY(${swipeY}px) scale(${Math.max(0.92, 1 - swipeY / 1200)})`,
              opacity: dismissing ? 0 : Math.max(0.3, 1 - swipeY / 500),
              transition: dismissing ? 'all 0.25s ease-out' : 'none',
              borderRadius: swipeY > 20 ? '16px' : 0,
              overflow: 'hidden',
            }
          : undefined
      }
    >
      {' '}
      <WatchVODPlayer
        key={watchKey}
        streamUrl={streamUrl}
        metadata={metadata}
        captionUrl={captionUrl}
        subtitleTracks={subtitleTracks}
        spriteVtt={spriteVtt}
        qualities={qualities}
        description={description ? decodeURIComponent(description) : undefined}
        onStreamExpired={handleStreamExpired}
        initialAudioTracks={
          s2AudioTracks.length > 0 ? s2AudioTracks : undefined
        }
        initialAudioTrackId={s2ActiveTrackId || undefined}
        onAudioTrackChange={
          s2AudioTracks.length > 0 ? handleS2AudioTrackChange : undefined
        }
      />
      <section className="md:hidden px-4 py-4 space-y-3 bg-background text-foreground border-t border-border/60 min-h-[60vh]">
        <div className="min-w-0">
          <h1 className="text-lg font-black font-headline uppercase tracking-tight truncate">
            {metadata.title}
          </h1>
          {metaLabel ? (
            <p className="text-xs text-muted-foreground font-headline uppercase tracking-widest mt-1 truncate">
              {metaLabel}
            </p>
          ) : null}
        </div>

        {metadata.description ? (
          <p className="text-sm leading-relaxed text-foreground/80">
            {metadata.description}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('page.continuePortrait')}
          </p>
        )}
      </section>
    </div>
  );
}

export default function WatchRoutePage() {
  return (
    <Suspense fallback={<PlayerLoadingSkeleton />}>
      <WatchContent />
    </Suspense>
  );
}

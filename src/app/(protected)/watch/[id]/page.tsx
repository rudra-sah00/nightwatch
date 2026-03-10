'use client';

import { Suspense } from 'react';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import { LoadingOverlay } from '@/features/watch/player/ui/overlays/LoadingOverlay';
import { useWatchContent } from './use-watch-content';

function WatchContent() {
  const {
    router,
    movieId,
    season,
    episode,
    description,
    posterUrl,
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

  // Loading state while refetching
  if (isRefetching) {
    return (
      <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center">
        {/* Aesthetic Background - Match WatchPage */}
        {posterUrl ? (
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30 animate-pulse"
              style={{ backgroundImage: `url(${posterUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
          </div>
        ) : null}

        {/* Reuse the LoadingOverlay for consistency */}
        <LoadingOverlay isVisible={true} />
      </div>
    );
  }

  // No stream URL and error
  if (!streamUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          {refetchError || 'No Stream Available'}
        </h2>
        <p className="text-white/60 mb-6">
          {refetchError
            ? 'There was an error loading the stream'
            : 'Please start playback from the content page'}
        </p>
        <div className="flex gap-3">
          {refetchError ? (
            <button
              type="button"
              onClick={() => refetchStream()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Create a unique key that changes when episode changes to force WatchPage remount
  const watchKey = `${movieId}-${season || 0}-${episode || 0}`;

  return (
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
      initialAudioTracks={s2AudioTracks.length > 0 ? s2AudioTracks : undefined}
      initialAudioTrackId={s2ActiveTrackId || undefined}
      onAudioTrackChange={
        s2AudioTracks.length > 0 ? handleS2AudioTrackChange : undefined
      }
    />
  );
}

export default function WatchRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-[100dvh] bg-black">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}

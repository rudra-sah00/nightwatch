'use client';

import { Suspense } from 'react';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import { useWatchContent } from '@/features/watch/hooks/use-watch-content';

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

  // No stream URL after refetch has settled
  if (!isRefetching && !streamUrl) {
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
            className="px-6 py-2 bg-white text-black rounded-lg font-medium/90 transition-colors"
          >
            Go to Home
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
        metadata.season != null ? `Season ${metadata.season}` : null,
        metadata.episode != null ? `Episode ${metadata.episode}` : null,
      ]
        .filter(Boolean)
        .join(' • ')
    : metadata.year
      ? `Movie • ${metadata.year}`
      : 'Movie';

  return (
    <div className="min-h-screen bg-background">
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

      <section className="md:hidden px-4 py-4 space-y-3 bg-background text-foreground border-t border-border/60">
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
            Continue watching in portrait mode.
          </p>
        )}
      </section>
    </div>
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

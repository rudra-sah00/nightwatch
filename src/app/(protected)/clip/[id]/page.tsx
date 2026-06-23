'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PlayerLoadingSkeleton } from '@/components/ui/PlayerLoadingSkeleton';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvWatch } from '@/platforms/smart-tv/pages/TvWatch';

function ClipPlayer() {
  const searchParams = useSearchParams();
  const src = searchParams.get('src');
  const title = searchParams.get('title') || 'Clip';

  if (!src) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60">No clip URL provided</p>
      </div>
    );
  }

  // TV: use TvWatch player
  if (isTV()) {
    return <TvWatch streamUrl={src} title={title} />;
  }

  const metadata: VideoMetadata = {
    title,
    type: 'movie',
    movieId: 'clip',
  };

  return (
    <WatchVODPlayer streamUrl={src} metadata={metadata} skipProgressHistory />
  );
}

export default function ClipPlayerPage() {
  return (
    <Suspense fallback={<PlayerLoadingSkeleton />}>
      <ClipPlayer />
    </Suspense>
  );
}

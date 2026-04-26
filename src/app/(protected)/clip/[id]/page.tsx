'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PlayerLoadingSkeleton } from '@/components/ui/PlayerLoadingSkeleton';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';

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

  const metadata: VideoMetadata = {
    title,
    type: 'movie',
    movieId: 'clip',
  };

  return <WatchVODPlayer streamUrl={src} metadata={metadata} />;
}

export default function ClipPlayerPage() {
  return (
    <Suspense fallback={<PlayerLoadingSkeleton />}>
      <ClipPlayer />
    </Suspense>
  );
}

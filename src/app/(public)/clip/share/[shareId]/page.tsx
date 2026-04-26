'use client';

import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPublicClip } from '@/features/clips/api';
import type { Clip } from '@/features/clips/types';
import { WatchVODPlayer } from '@/features/watch/components/WatchVODPlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';

export default function PublicClipPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [clip, setClip] = useState<Clip | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) return;
    getPublicClip(shareId)
      .then(setClip)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !clip || !clip.videoUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-4">
        <p className="text-white/60 font-headline font-bold uppercase tracking-widest text-xl mb-2">
          Clip not found
        </p>
        <p className="text-white/30 text-sm">
          This clip may have been removed or is no longer public.
        </p>
      </div>
    );
  }

  const metadata: VideoMetadata = {
    title: clip.title,
    type: 'movie',
    movieId: `clip-${clip.id}`,
  };

  return (
    <WatchVODPlayer
      streamUrl={clip.videoUrl}
      metadata={metadata}
      hideBackButton
    />
  );
}

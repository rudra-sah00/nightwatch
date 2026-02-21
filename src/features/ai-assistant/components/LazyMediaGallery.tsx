'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { AssistantMovieCard } from './AssistantMovieCard';

interface LazyMediaGalleryProps {
  id: string; // IMDb ID or Content ID
  title?: string;
  onPlayMedia?: (url: string, type: 'video' | 'image') => void;
}

export function LazyMediaGallery({
  id,
  title,
  onPlayMedia,
}: LazyMediaGalleryProps) {
  const [loading, setLoading] = useState(true);
  // biome-ignore lint/suspicious/noExplicitAny: Required for arbitrary media gallery response
  const [data, setData] = useState<{ photos: any[]; trailers: any[] } | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchMedia() {
      try {
        setLoading(true);
        // biome-ignore lint/suspicious/noExplicitAny: Required for arbitrary media gallery response
        const res = await apiFetch<{ photos: any[]; trailers: any[] }>(
          `/api/video/media/${id}`,
        );
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          // biome-ignore lint/suspicious/noConsole: Required to log fetch failures
          console.error('Failed to fetch media gallery', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchMedia();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="text-xs text-white/50 italic px-2 py-4">
        Unable to load media gallery for {title || 'this content'}.
      </div>
    );
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div>
          <div className="h-3 w-24 bg-white/10 rounded mb-2 ml-1" />
          <div className="flex gap-3 overflow-hidden -mx-1 px-1">
            {[1, 2, 3].map((i) => (
              <div
                key={`skel-t-${i}`}
                className="min-w-[200px] h-[112px] bg-white/5 rounded-xl border border-white/5"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || (data.photos.length === 0 && data.trailers.length === 0)) {
    return null; // Empty state
  }

  const { photos, trailers } = data;

  return (
    <div className="space-y-5 pt-2">
      {/* Trailers Section */}
      {trailers && trailers.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">
            Trailers & Clips
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
            {trailers.map((t, idx) => {
              const url =
                t.playbackUrl ||
                t.url ||
                (t.id?.startsWith('vi')
                  ? `https://www.imdb.com/video/${t.id}`
                  : '') ||
                (t.key ? `https://www.youtube.com/watch?v=${t.key}` : '');
              return (
                <AssistantMovieCard
                  key={t.id || `trailer-${idx}`}
                  id={t.id || `trailer-${idx}`}
                  type="Trailer"
                  title={t.name || 'Trailer'}
                  poster={t.thumbnail}
                  videoUrl={url}
                  variant="landscape"
                  className="min-w-[200px] max-w-[240px] shrink-0"
                  onSelect={() => {
                    if (onPlayMedia && url) {
                      onPlayMedia(url, 'video');
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Photos Section */}
      {photos && photos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">
            Photos
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
            {photos.map((p, idx) => {
              const photoId =
                p.url?.split('/').pop()?.split('.')[0] || `photo-${idx}`;
              return (
                <AssistantMovieCard
                  key={photoId}
                  id={photoId}
                  type="Photo"
                  title={p.caption || 'Photo'}
                  poster={p.url}
                  variant="landscape"
                  className="min-w-[200px] max-w-[240px] shrink-0"
                  onSelect={() => {
                    if (onPlayMedia && p.url) {
                      onPlayMedia(p.url, 'image');
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

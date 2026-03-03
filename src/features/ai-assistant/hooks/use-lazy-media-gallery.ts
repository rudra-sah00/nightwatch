'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';

interface MediaData {
  photos: { url: string; caption?: string }[];
  trailers: {
    id: string;
    url?: string;
    playbackUrl?: string;
    name?: string;
    thumbnail?: string;
    key?: string;
  }[];
}

export function useLazyMediaGallery(id: string) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MediaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchMedia() {
      try {
        setLoading(true);
        const res = await apiFetch<MediaData>(`/api/video/media/${id}`, {
          timeout: 30000,
        });
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchMedia();

    return () => {
      mounted = false;
    };
  }, [id]);

  return { loading, data, error };
}

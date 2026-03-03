'use client';

import { useEffect, useState } from 'react';

interface UseMediaModalProps {
  url: string | null;
  type: 'video' | 'image' | null;
  isOpen: boolean;
}

export function useMediaModal({ url, type, isOpen }: UseMediaModalProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!url || !type) {
      setEmbedUrl(null);
      return;
    }

    if (type === 'image') {
      setEmbedUrl(url);
      return;
    }

    let newUrl = url;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (
      url.includes('youtube.com/watch') ||
      url.includes('youtube.com/embed') ||
      url.includes('youtu.be/')
    ) {
      let videoId = '';
      if (url.includes('v=')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else {
        videoId = url.split('/').pop()?.split('?')[0] || '';
      }
      if (videoId)
        newUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&origin=${origin}`;
    } else if (url.includes('imdb.com/video/')) {
      const match = url.match(/(vi\d+)/);
      if (match) {
        newUrl = `https://www.imdb.com/video/embed/${match[1]}?autoplay=false`;
      }
    }

    setEmbedUrl(newUrl);
  }, [url, type]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return { embedUrl, mounted };
}

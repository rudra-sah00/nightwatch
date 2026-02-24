'use client';

import { ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface MediaModalProps {
  url: string | null;
  type: 'video' | 'image' | null; // Added type
  isOpen: boolean;
  onClose: () => void;
}

export function MediaModal({ url, type, isOpen, onClose }: MediaModalProps) {
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

    // VIDEO LOGIC
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
    }
    // IMDb Trailers
    else if (url.includes('imdb.com/video/')) {
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

  if (!isOpen || !url || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full border-0 p-0 m-0 bg-transparent cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col ${
          type === 'video'
            ? 'w-full max-w-6xl aspect-video'
            : 'w-auto h-auto max-w-[95vw] max-h-[95vh]'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'image' ? (
          <div className="relative flex items-center justify-center w-full h-full">
            {embedUrl ? (
              <img
                src={embedUrl}
                alt="Full Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            ) : null}
          </div>
        ) : embedUrl &&
          (embedUrl.includes('.mp4') || embedUrl.includes('mp4')) ? (
          <CustomVideoPlayer
            src={embedUrl}
            autoPlay
            className="w-full h-full object-contain"
          />
        ) : embedUrl &&
          (embedUrl.includes('youtube') ||
            embedUrl.includes('imdb.com/video/embed')) ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title="Video Player"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <p className="text-lg text-white/80">
              This video cannot be played directly here.
            </p>
            <a
              href={url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

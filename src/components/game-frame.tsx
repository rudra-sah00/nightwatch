'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function GameFrame({ slug, title }: { slug: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={`/games/play/${slug}`}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        title={title}
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white transition-colors z-10"
      >
        {isFullscreen ? (
          <Minimize className="w-5 h-5" />
        ) : (
          <Maximize className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

'use client';

import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameFrame } from '@/components/game-frame';
import { getCookie } from '@/lib/cookies';

function gameApiFetch(path: string, opts: RequestInit = {}) {
  const csrf = getCookie('csrfToken');
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...opts.headers,
    },
  });
}

export default function GamePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);

  useEffect(() => {
    gameApiFetch('/api/games/subway-surfers/url')
      .then((r) => r.json())
      .then((data) => setGameUrl(data.url))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="w-full max-w-4xl aspect-[4/3] rounded-xl overflow-hidden border-[3px] border-border"
      >
        {gameUrl ? (
          <GameFrame
            slug="subway-surfers"
            title="Subway Surfers"
            gameUrl={gameUrl}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-background">
            <p className="font-headline font-bold uppercase tracking-widest text-xs text-foreground/40 animate-pulse">
              Loading game...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

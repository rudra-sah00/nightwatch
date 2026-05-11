'use client';

import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameFrame } from '@/components/game-frame';
import { getCookie } from '@/lib/cookies';
import { useAuth } from '@/providers/auth-provider';

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
  const user = useAuth((s) => s.user);

  useEffect(() => {
    gameApiFetch('/api/games/subway-surfers/url')
      .then((r) => r.json())
      .then((data) => setGameUrl(data.url))
      .catch(() => {});
  }, []);

  // Send leaderboard data to iframe once it loads
  useEffect(() => {
    if (!gameUrl) return;
    const sendLeaderboard = () => {
      gameApiFetch('/api/games/subway-surfers/leaderboard?limit=100')
        .then((r) => r.json())
        .then((data) => {
          // Combine top 100 + current user if outside top 100
          const entries = [...(data.leaderboard || [])];
          if (data.currentUser) entries.push(data.currentUser);
          setTimeout(() => {
            const iframe = document.querySelector('iframe');
            iframe?.contentWindow?.postMessage(
              { type: 'nw:leaderboard-data', entries },
              '*',
            );
          }, 2000);
        })
        .catch(() => {});
    };
    sendLeaderboard();
  }, [gameUrl]);

  // Bridge: nickname + score + leaderboard
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'nw:request-nickname' && user) {
        const iframe = document.querySelector('iframe');
        iframe?.contentWindow?.postMessage(
          { type: 'nw:set-nickname', name: user.username || user.name },
          '*',
        );
      }
      if (e.data?.type === 'nw:nickname-changed') {
        gameApiFetch('/api/games/subway-surfers/nickname', {
          method: 'PUT',

          body: JSON.stringify({ nickname: e.data.name }),
        }).catch(() => {});
      }
      if (
        e.data?.type === 'nw:score-submit' ||
        e.data?.type === 'nw:highscore'
      ) {
        const score = e.data.score;
        if (score && score > 0) {
          gameApiFetch('/api/games/subway-surfers/scores', {
            method: 'POST',

            body: JSON.stringify({ score, data: e.data.data || {} }),
          }).catch(() => {});
        }
      }
      if (e.data?.type === 'nw:save-sync' && e.data.score > 0) {
        gameApiFetch('/api/games/subway-surfers/scores', {
          method: 'POST',
          body: JSON.stringify({
            score: e.data.score,
            data: { coins: e.data.coins || 0 },
          }),
        }).catch(() => {});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [user]);

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

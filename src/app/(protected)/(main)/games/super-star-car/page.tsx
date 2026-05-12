'use client';

import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameFrame } from '@/components/game-frame';
import { getCookie } from '@/lib/cookies';
import { checkIsDesktop, isMobile } from '@/lib/electron-bridge';

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
    gameApiFetch('/api/games/super-star-car/url')
      .then((r) => r.json())
      .then((data) => setGameUrl(data.url))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Escape key exits CSS-based fullscreen (Electron/Capacitor)
  useEffect(() => {
    if (!isFullscreen || !(checkIsDesktop() || isMobile)) return;

    // Electron: use IPC since iframe captures keyboard events
    if (checkIsDesktop()) {
      const api = (
        window as unknown as {
          electronAPI?: { onGlobalEscape?: (cb: () => void) => () => void };
        }
      ).electronAPI;
      if (api?.onGlobalEscape) {
        return api.onGlobalEscape(() => setIsFullscreen(false));
      }
    }

    // Mobile fallback
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  // Hide Electron drag region and navbar during fullscreen so game buttons are clickable
  // Also disable transition-all on parent that creates a containing block for fixed
  useEffect(() => {
    if (!(checkIsDesktop() || isMobile)) return;

    const dragRegions = document.querySelectorAll<HTMLElement>(
      '[data-electron-drag-region]',
    );
    // The parent with transition-all that breaks fixed positioning
    const contentParent = containerRef.current?.closest(
      '.transition-all',
    ) as HTMLElement | null;

    if (isFullscreen) {
      dragRegions.forEach((el) => {
        el.style.display = 'none';
      });
      if (contentParent) {
        contentParent.style.transition = 'none';
        contentParent.style.transform = 'none';
      }
    } else {
      dragRegions.forEach((el) => {
        el.style.display = '';
      });
      if (contentParent) {
        contentParent.style.transition = '';
        contentParent.style.transform = '';
      }
    }

    return () => {
      dragRegions.forEach((el) => {
        el.style.display = '';
      });
      if (contentParent) {
        contentParent.style.transition = '';
        contentParent.style.transform = '';
      }
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    // Capacitor native app
    if (isMobile) {
      import('@/lib/mobile-bridge').then(({ mobileBridge }) => {
        if (isFullscreen) {
          mobileBridge.unlockOrientation();
          mobileBridge.showStatusBar();
        } else {
          mobileBridge.lockPortrait();
          mobileBridge.hideStatusBar();
        }
      });
      setIsFullscreen((prev) => !prev);
      return;
    }

    // Electron — CSS overlay fullscreen (game fills the window)
    if (checkIsDesktop()) {
      setIsFullscreen((prev) => !prev);
      return;
    }

    // Browser — native element fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {
        const el = containerRef.current as HTMLDivElement & {
          webkitRequestFullscreen?: () => void;
        };
        el.webkitRequestFullscreen?.();
      });
    }
  }, [isFullscreen]);

  const usesCssFullscreen = isFullscreen && (isMobile || checkIsDesktop());

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] max-md:min-h-0 max-md:h-full p-4 gap-4">
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
        className={
          usesCssFullscreen
            ? 'fixed inset-0 z-[99999] w-screen h-screen bg-black'
            : 'relative w-full max-w-4xl rounded-xl overflow-hidden border-[3px] border-border aspect-[4/3] max-md:aspect-auto max-md:flex-1'
        }
      >
        {usesCssFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 z-[100000] bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-sm"
          >
            ✕ Exit
          </button>
        )}
        {gameUrl ? (
          <GameFrame
            slug="super-star-car"
            title="Super Star Car"
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

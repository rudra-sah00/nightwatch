'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameFrame } from '@/components/game-frame';
import { PageTitle } from '@/components/layout/page-title';
import { getGames, getGameUrl } from '@/features/games/api';
import { trackEvent } from '@/lib/analytics';
import { checkIsDesktop, isMobile } from '@/lib/electron-bridge';

export default function GamePage() {
  const t = useTranslations('common.gamesPage');
  const navT = useTranslations('common.nav');
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: gameUrl = null } = useQuery({
    queryKey: ['games', slug, 'url'],
    queryFn: () => getGameUrl(slug),
    enabled: !!slug,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: getGames,
  });

  const title = games.find((g) => g.slug === slug)?.title ?? '';

  // Track game play event when URL loads
  useEffect(() => {
    if (gameUrl) {
      trackEvent('game_play', { slug });
    }
  }, [gameUrl, slug]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen || !(checkIsDesktop() || isMobile)) return;

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

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (!(checkIsDesktop() || isMobile)) return;

    const dragRegions = document.querySelectorAll<HTMLElement>(
      '[data-electron-drag-region]',
    );
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

    if (checkIsDesktop()) {
      setIsFullscreen((prev) => !prev);
      return;
    }

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
    <>
      {title && <title>{`${title} — Nightwatch`}</title>}
      <PageTitle title={navT('games')} href="/games" />
      <div className="flex flex-col items-center justify-center min-h-[80vh] max-md:min-h-0 max-md:h-full p-4 gap-4">
        <div className="w-full max-w-4xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-foreground/40 hover:text-foreground font-headline font-bold uppercase tracking-widest text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
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
            {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
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
              {t('exitButton')}
            </button>
          )}
          {gameUrl ? (
            <GameFrame slug={slug} title={title || slug} gameUrl={gameUrl} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background">
              <p className="font-headline font-bold uppercase tracking-widest text-xs text-foreground/40 animate-pulse">
                {t('loading')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

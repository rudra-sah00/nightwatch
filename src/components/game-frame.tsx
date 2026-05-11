'use client';

import { useEffect, useRef, useState } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';

export function GameFrame({
  slug,
  title,
  thumbnail,
  gameUrl,
}: {
  slug: string;
  title: string;
  thumbnail?: string;
  gameUrl: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const { socket } = useSocket();

  // Refresh game auth cookie every 45 minutes to prevent 403s during long sessions
  useEffect(() => {
    const csrf =
      typeof document !== 'undefined'
        ? document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrfToken='))
            ?.split('=')[1]
        : undefined;
    const refreshCookie = () => {
      fetch(`/api/games/${slug}/url`, {
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
      }).catch(() => {});
    };
    const id = setInterval(refreshCookie, 45 * 60 * 1000);
    return () => clearInterval(id);
  }, [slug]);

  // Duck music while game is active, restore on unmount
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ask-ai:duck', { detail: { duck: true } }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('ask-ai:duck', { detail: { duck: false } }),
      );
      // Restore orientation on mobile if locked
      import('@/lib/electron-bridge').then(({ isMobile }) => {
        if (isMobile) {
          import('@/lib/mobile-bridge').then(({ mobileBridge }) => {
            mobileBridge.unlockOrientation();
            mobileBridge.showStatusBar();
          });
        }
      });
    };
  }, []);

  // Kill iframe audio on unmount by destroying the iframe completely
  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      if (iframe) {
        iframe.src = 'about:blank';
        iframe.remove();
      }
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Broadcast game activity to friends + Discord
  useEffect(() => {
    if (!socket?.connected) return;

    const posterUrl = thumbnail || `/games/${slug}/thumbnail.png`;

    const emitActivity = () => {
      socket.emit('watch:set_activity', {
        type: 'game',
        title,
        artist: null,
        season: null,
        episode: null,
        episodeTitle: null,
        posterUrl,
        secondaryPosterUrl: null,
      });
    };

    emitActivity();
    const intervalId = setInterval(emitActivity, 3 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [socket, slug, title, thumbnail]);

  // Discord Rich Presence for desktop
  useEffect(() => {
    if (!checkIsDesktop()) return;

    desktopBridge.updateDiscordPresence({
      details: `Playing ${title}`,
      state: 'Nightwatch Games',
      largeImageKey: thumbnail || `/games/${slug}/thumbnail.png`,
      largeImageText: title,
      smallImageKey: 'nightwatch_logo',
      smallImageText: 'Nightwatch',
      startTimestamp: Date.now(),
    });

    return () => {
      desktopBridge.clearDiscordPresence();
    };
  }, [slug, title, thumbnail]);

  // Clear activity on unmount
  useEffect(() => {
    return () => {
      socket?.emit('watch:clear_activity');
    };
  }, [socket]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={gameUrl}
        className="w-full h-full"
        allow="autoplay; fullscreen; gamepad"
        allowFullScreen
        title={title}
      />
    </div>
  );
}

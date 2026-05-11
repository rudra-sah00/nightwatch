'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { socket } = useSocket();

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
        src={gameUrl}
        className="w-full h-full"
        allow="autoplay; fullscreen; gamepad"
        allowFullScreen
        title={title}
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white transition-colors z-10 hidden md:block"
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

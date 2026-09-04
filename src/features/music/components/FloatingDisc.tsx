'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { dismissMusic } from '@/features/music/lib/dismiss-music';
import { DEFAULT_LONG_PRESS_MS, useLongPress } from '@/hooks/use-long-press';
import { hapticMedium } from '@/lib/haptics';
import { useMusicStore } from '../store/use-music-store';

/** Routes where the floating disc should be hidden (video playback stops music). */
const VIDEO_ROUTES = ['/watch/', '/live/', '/watch-party/', '/clip/'];

/**
 * Floating album-art disc (FAB) displayed on non-music, non-video pages
 * when a track is currently loaded — either locally or on another device.
 *
 * Shows the track's album art spinning when playing. Same visual whether
 * playback is local or remote — no badge, no indicator. Just the disc.
 *
 * Tap opens the full player. Press and hold closes the player outright, which
 * stops playback and clears the track rather than merely pausing it.
 */
export function FloatingDisc() {
  const t = useTranslations('music');
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const setExpanded = useMusicStore((s) => s.setExpanded);
  const stop = useMusicStore((s) => s.stop);
  const setRemoteControlling = useMusicStore((s) => s.setRemoteControlling);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteIsPlaying = useMusicStore((s) => s.remoteIsPlaying);
  const pathname = usePathname();

  const close = useCallback(() => {
    hapticMedium();
    dismissMusic({
      isRemoteControlling,
      stopLocal: stop,
      clearRemote: () => setRemoteControlling(false, null, false, 0, 0, []),
      sendRemoteStop: () =>
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'stop' }),
        ),
    });
  }, [isRemoteControlling, stop, setRemoteControlling]);

  const { isPressing, handlers } = useLongPress({
    onLongPress: close,
    onClick: () => setExpanded(true),
  });

  const isMusic = pathname.startsWith('/music');
  const isVideo = VIDEO_ROUTES.some((r) => pathname.startsWith(r));

  // Show disc for local OR remote playback
  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;

  if (!displayTrack || isMusic || isVideo) {
    return null;
  }

  return (
    <button
      type="button"
      {...handlers}
      // A hold is not reachable by keyboard, so Delete/Backspace closes too.
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          close();
        }
      }}
      aria-keyshortcuts="Delete"
      title={t('disc.holdToClose')}
      className={`fixed bottom-6 right-4 md:right-20 z-[201] w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-border overflow-hidden shadow-lg transition-transform [-webkit-app-region:no-drag] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-blue/50 ${
        isPressing ? 'scale-90' : 'hover:scale-110'
      }`}
      aria-label={t('disc.nowPlaying', { title: displayTrack.title })}
    >
      <img
        src={displayTrack.image}
        alt=""
        className={`w-full h-full object-cover ${displayPlaying ? 'animate-spin [animation-duration:4s]' : ''}`}
      />

      {/* Hold feedback: a ring that sweeps round over the hold duration, so a
          long press reads as deliberate rather than an unresponsive tap. */}
      {isPressing && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-[3px] border-neo-red motion-safe:animate-[ping_var(--hold-duration)_linear] motion-reduce:opacity-60"
          style={
            {
              '--hold-duration': `${DEFAULT_LONG_PRESS_MS}ms`,
            } as React.CSSProperties
          }
        />
      )}
    </button>
  );
}

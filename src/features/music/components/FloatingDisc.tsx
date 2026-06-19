'use client';

import { usePathname } from 'next/navigation';
import { useMusicStore } from '../store/use-music-store';

/** Routes where the floating disc should be hidden (video playback stops music). */
const VIDEO_ROUTES = ['/watch/', '/live/', '/watch-party/', '/clip/'];

/**
 * Floating album-art disc (FAB) displayed on non-music, non-video pages
 * when a track is currently loaded — either locally or on another device.
 *
 * Shows the track's album art spinning when playing. Same visual whether
 * playback is local or remote — no badge, no indicator. Just the disc.
 */
export function FloatingDisc() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const setExpanded = useMusicStore((s) => s.setExpanded);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteIsPlaying = useMusicStore((s) => s.remoteIsPlaying);
  const pathname = usePathname();

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
      onClick={() => setExpanded(true)}
      className="fixed bottom-6 right-4 md:right-20 z-[201] w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-border overflow-hidden shadow-lg hover:scale-110 transition-transform [-webkit-app-region:no-drag]"
      aria-label={`Now playing: ${displayTrack.title}`}
    >
      <img
        src={displayTrack.image}
        alt={displayTrack.title}
        className={`w-full h-full object-cover ${displayPlaying ? 'animate-spin [animation-duration:4s]' : ''}`}
      />
    </button>
  );
}

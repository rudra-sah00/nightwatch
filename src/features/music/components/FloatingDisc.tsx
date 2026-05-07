'use client';

import { usePathname } from 'next/navigation';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/** Routes where the floating disc should be hidden (video playback stops music). */
const VIDEO_ROUTES = ['/watch/', '/live/'];

/**
 * Floating album-art disc (FAB) displayed on non-music, non-video pages
 * when a track is currently loaded — either locally or on another device.
 *
 * Shows the track's album art spinning when playing. Same visual whether
 * playback is local or remote — no badge, no indicator. Just the disc.
 */
export function FloatingDisc() {
  const {
    currentTrack,
    isPlaying,
    setExpanded,
    isRemoteControlling,
    remoteTrack,
    remoteIsPlaying,
  } = useMusicPlayerContext();
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

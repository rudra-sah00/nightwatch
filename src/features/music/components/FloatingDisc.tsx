'use client';

import { Monitor } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/** Routes where the floating disc should be hidden (video playback stops music). */
const VIDEO_ROUTES = ['/watch/', '/live/'];

/**
 * Floating album-art disc (FAB) displayed on non-music, non-video pages
 * when a track is currently loaded — either locally or on another device.
 *
 * Shows the track's album art spinning when playing. If playback is on
 * another device, shows a small device badge in the corner.
 *
 * Clicking expands the full-screen player (which shows remote controls
 * when another device is the active player).
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
      {/* Remote playback badge */}
      {isRemoteControlling && (
        <span className="absolute bottom-0 right-0 w-5 h-5 bg-card border-2 border-border rounded-full flex items-center justify-center">
          <Monitor className="w-2.5 h-2.5 text-muted-foreground" />
        </span>
      )}
    </button>
  );
}

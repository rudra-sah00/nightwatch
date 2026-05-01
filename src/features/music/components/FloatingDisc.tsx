'use client';

import { usePathname } from 'next/navigation';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/** Routes where the floating disc should be hidden (video playback stops music). */
const VIDEO_ROUTES = ['/watch/', '/live/'];

/**
 * Floating album-art disc (FAB) displayed on non-music, non-video pages
 * when a track is currently loaded.
 *
 * Renders a circular button fixed to the bottom-right corner showing the
 * current track's album art. When audio is playing the image spins continuously
 * (4 s per revolution). Clicking the disc expands the full-screen player.
 *
 * Hidden on `/music` routes (where {@link MiniPlayer} is shown instead) and
 * on `/watch/` or `/live/` routes (where music playback is auto-stopped).
 * Renders `null` when no track is loaded or on excluded routes.
 */
export function FloatingDisc() {
  const { currentTrack, isPlaying, setExpanded } = useMusicPlayerContext();
  const pathname = usePathname();

  // Don't show on music pages (MiniPlayer handles it) or video pages (music stops)
  const isMusic = pathname.startsWith('/music');
  const isVideo = VIDEO_ROUTES.some((r) => pathname.startsWith(r));

  if (!currentTrack || isMusic || isVideo) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="fixed bottom-6 right-4 md:right-20 z-[101] w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-border overflow-hidden shadow-lg hover:scale-110 transition-transform [-webkit-app-region:no-drag]"
      aria-label={`Now playing: ${currentTrack.title}`}
    >
      <img
        src={currentTrack.image}
        alt={currentTrack.title}
        className={`w-full h-full object-cover ${isPlaying ? 'animate-spin [animation-duration:4s]' : ''}`}
      />
    </button>
  );
}

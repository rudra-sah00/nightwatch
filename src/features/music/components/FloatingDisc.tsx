'use client';

import { usePathname } from 'next/navigation';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

const VIDEO_ROUTES = ['/watch/', '/live/'];

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

'use client';

import { Cast } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useRemoteStreams } from '../hooks/use-remote-streams';

/** Routes where the remote disc should be hidden */
const HIDDEN_ROUTES = ['/watch/', '/live/', '/remote'];

/**
 * Floating remote-control disc (FAB) displayed on mobile when another device
 * of the same account is actively streaming video.
 *
 * Same size as the music FloatingDisc (w-16 h-16), positioned bottom-left.
 * Shows the stream poster spinning (like the music disc) when playing.
 * Tapping navigates to the /remote page with playback controls.
 */
export function RemoteDisc() {
  const { streams, activeStream } = useRemoteStreams();
  const pathname = usePathname();
  const router = useRouter();

  // Only show on mobile (Capacitor)
  if (!checkIsMobile()) return null;

  // Hide on video/remote pages
  const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (isHidden || streams.length === 0) return null;

  const isPlaying = activeStream?.isPlaying ?? false;

  return (
    <button
      type="button"
      onClick={() => router.push('/remote')}
      className="fixed bottom-6 left-4 z-[201] w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-border overflow-hidden shadow-lg hover:scale-110 active:scale-95 transition-transform animate-in zoom-in-50 duration-300 [-webkit-app-region:no-drag]"
      aria-label="Remote control"
    >
      {activeStream?.posterUrl ? (
        <img
          src={activeStream.posterUrl}
          alt={activeStream.title}
          className={`w-full h-full object-cover ${isPlaying ? 'animate-spin [animation-duration:4s]' : ''}`}
        />
      ) : (
        <div
          className={`w-full h-full bg-primary/90 flex items-center justify-center ${isPlaying ? 'animate-spin [animation-duration:4s]' : ''}`}
        >
          <Cast className="w-6 h-6 text-primary-foreground" />
        </div>
      )}
      <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
    </button>
  );
}

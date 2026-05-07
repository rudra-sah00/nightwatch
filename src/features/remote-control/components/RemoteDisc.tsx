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
 * Positioned bottom-left to mirror the music FloatingDisc on the right.
 * Tapping navigates to the /remote page with playback controls.
 */
export function RemoteDisc() {
  const { streams } = useRemoteStreams();
  const pathname = usePathname();
  const router = useRouter();

  // Only show on mobile (Capacitor)
  if (!checkIsMobile()) return null;

  // Hide on video/remote pages
  const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (isHidden || streams.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/remote')}
      className="fixed bottom-6 left-4 z-[201] w-14 h-14 rounded-full bg-primary/90 border-2 border-border flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform animate-in zoom-in-50 duration-300"
      aria-label="Remote control"
    >
      <Cast className="w-6 h-6 text-primary-foreground" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-background animate-pulse" />
    </button>
  );
}

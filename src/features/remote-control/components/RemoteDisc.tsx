'use client';

import { Cast } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useRemoteStreams } from '../hooks/use-remote-streams';
import { RemoteControlSheet } from './RemoteControlSheet';

/** Routes where the remote disc should be hidden */
const HIDDEN_ROUTES = ['/watch/', '/live/'];

/**
 * Floating remote-control disc (FAB) + full-screen overlay.
 *
 * Same size as the music FloatingDisc, positioned bottom-left.
 * Shows the stream poster spinning when playing.
 * Tapping opens the remote control as a slide-in-from-bottom overlay
 * (same animation as the music FullPlayer).
 */
export function RemoteDisc() {
  const { streams, activeStream, selectStream } = useRemoteStreams();
  const pathname = usePathname();
  const t = useTranslations('common');
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
    }, 300);
  }, []);

  // Only show on mobile (Capacitor)
  if (!checkIsMobile()) return null;

  // Hide on video pages (but keep overlay open if expanded)
  const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (streams.length === 0 && !expanded) return null;

  const isPlaying = activeStream?.isPlaying ?? false;
  const showDisc = !expanded && !isHidden && streams.length > 0;

  return (
    <>
      {/* Floating disc button */}
      {showDisc ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="fixed bottom-6 left-4 z-[201] w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-border overflow-hidden shadow-lg hover:scale-110 active:scale-95 transition-transform animate-in zoom-in-50 duration-300 [-webkit-app-region:no-drag]"
          aria-label={t('remote.remoteControl')}
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
      ) : null}

      {/* Full-screen overlay */}
      {expanded ? (
        <RemoteControlSheet
          streams={streams}
          activeStream={activeStream}
          selectStream={selectStream}
          closing={closing}
          onClose={handleClose}
        />
      ) : null}
    </>
  );
}

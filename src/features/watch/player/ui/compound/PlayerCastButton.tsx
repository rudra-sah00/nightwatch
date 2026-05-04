'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { useChromecast } from '../../hooks/useChromecast';

/**
 * Chromecast button for the player control bar (desktop Chrome only).
 *
 * Renders nothing when Cast is unavailable (non-Chrome, Capacitor, Electron).
 * Shows a cast icon that opens the Chrome cast picker on click.
 * When connected, the icon fills to indicate an active session.
 */
export function PlayerCastButton() {
  const { metadata, streamUrl } = usePlayerContext();
  const t = useTranslations('watch.player');

  const { castState, startCast, stopCast } = useChromecast({
    streamUrl,
    title: metadata.title,
    posterUrl: metadata.posterUrl ?? undefined,
    isLive: metadata.type === 'livestream',
  });

  if (castState === 'unavailable') return null;

  const isConnected = castState === 'connected';
  const isConnecting = castState === 'connecting';

  return (
    <button
      type="button"
      onClick={isConnected ? stopCast : startCast}
      disabled={isConnecting}
      className={cn(
        'p-2.5 transition-colors duration-200',
        'bg-background border-[3px] border-border text-foreground',
        'hover:bg-neo-yellow/80 active:bg-neo-yellow',
        isConnecting && 'opacity-50 cursor-wait',
        isConnected && 'text-neo-blue',
      )}
      aria-label={isConnected ? t('castStop') : t('castStart')}
      title={isConnected ? t('castStop') : t('castStart')}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 md:w-6 md:h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
      >
        <title>{isConnected ? t('castStop') : t('castStart')}</title>
        {/* Cast icon: screen with wireless signal */}
        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        {isConnected ? (
          <circle cx="2" cy="20" r="1.5" fill="currentColor" stroke="none" />
        ) : (
          <line x1="2" y1="20" x2="2.01" y2="20" />
        )}
      </svg>
    </button>
  );
}

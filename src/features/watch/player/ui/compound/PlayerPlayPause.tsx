import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { PlayPause } from '../controls/PlayPause';

export function PlayerPlayPause({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const t = useTranslations('watch.player');
  const tAria = useTranslations('watch.aria');

  if (readOnly) {
    return (
      <div className="relative group/lock">
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 cursor-not-allowed">
          <svg
            className="w-6 h-6 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-label={t('hostControlsPlayback')}
            role="img"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900/95 rounded text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none border border-zinc-700/50">
          {t('hostControlsPlayback')}
        </div>
      </div>
    );
  }

  return (
    <section
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={tAria('playPause')}
    >
      <PlayPause
        isPlaying={state.isPlaying}
        onToggle={playerHandlers.togglePlay}
        size={size}
      />
    </section>
  );
}

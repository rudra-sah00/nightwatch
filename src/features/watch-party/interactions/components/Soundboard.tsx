'use client';

import { Loader2, Play, Search, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { useSoundboard } from '../hooks/use-soundboard';

/**
 * Placeholder shown when the current user lacks soundboard permissions.
 */
export function SoundboardDisabled() {
  const t = useTranslations('party');
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground/50 space-y-4">
      <Volume2 className="w-12 h-12 opacity-50 stroke-[3px]" />
      <div className="space-y-1">
        <h3 className="text-foreground font-black font-headline uppercase tracking-widest">
          {t('soundboard.disabled')}
        </h3>
        <p className="text-sm font-bold font-headline tracking-wide">
          {t('soundboard.disabledDesc')}
        </p>
      </div>
    </div>
  );
}

/** Props for the {@link Soundboard} component. */
interface SoundboardProps {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

/**
 * Searchable soundboard panel for the watch party sidebar.
 *
 * Fetches trending sounds on mount, supports debounced search, infinite
 * scroll pagination, and broadcasts played sounds to all party members
 * via RTM.
 */
export function Soundboard({
  rtmSendMessage,
  userId,
  userName,
}: SoundboardProps) {
  const {
    sounds,
    loading,
    searchQuery,
    setSearchQuery,
    hasMore,
    isSearching,
    loadMoreRef,
    loadMore,
    handleTriggerSound,
  } = useSoundboard({ rtmSendMessage, userId, userName });
  const t = useTranslations('party');

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div className="space-y-3 flex-none mb-4">
        <h4 className="text-sm font-black text-white/50 font-headline uppercase tracking-widest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 stroke-[3px]" aria-hidden="true" />{' '}
            {t('soundboard.title')}
          </div>
          {isSearching ? (
            <output className="flex items-center gap-2" aria-live="polite">
              <Loader2 className="w-3 h-3 animate-spin stroke-[3px]" />
              <span className="sr-only">{t('soundboard.searching')}</span>
            </output>
          ) : null}
        </h4>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 stroke-[3px]" />
          <input
            placeholder={t('soundboard.searchPlaceholder')}
            className="w-full pl-9 bg-white/5 border border-white/10 h-10 text-sm font-bold font-headline tracking-wide text-white placeholder:text-white/40 rounded-lg outline-none focus:border-white/30 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/20">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5 pb-4">
          {sounds.map((sound) => (
            <button
              key={sound.slug}
              type="button"
              onClick={() => handleTriggerSound(sound.sound, sound.name)}
              className="h-auto py-2 px-3 flex items-center gap-2 justify-start text-white/80 hover:text-white hover:bg-white/10 transition-colors group relative overflow-hidden rounded-lg"
              aria-label={t('soundboard.playSound', { name: sound.name })}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: `#${sound.color}` }}
                aria-hidden="true"
              />
              <span className="font-bold text-[11px] truncate flex-1 text-left">
                {sound.name}
              </span>
              <Play
                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 stroke-[3px]"
                aria-hidden="true"
              />
            </button>
          ))}

          {loading ? (
            <div className="col-span-2 py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white/50 stroke-[3px]" />
            </div>
          ) : null}

          <div
            ref={loadMoreRef}
            className="col-span-2 h-10 w-full flex items-center justify-center"
          >
            {!loading && hasMore ? (
              <button
                type="button"
                className="text-xs font-bold text-white/40 hover:text-white transition-colors"
                onClick={loadMore}
              >
                {t('soundboard.loadMore')}
              </button>
            ) : null}
            {!loading && !hasMore && sounds.length > 0 ? (
              <span className="text-[10px] font-bold text-white/30">
                {t('soundboard.endOfResults')}
              </span>
            ) : null}
          </div>

          {!loading && sounds.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-xs font-bold text-white/40">
              {t('soundboard.noSoundsFound')}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

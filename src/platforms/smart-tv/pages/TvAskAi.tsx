'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslations } from 'next-intl';
import { useAskAi } from '@/features/ask-ai/hooks/use-ask-ai';
import { useTvFocus } from '../hooks/use-tv-focus';

/**
 * TV Ask AI - large orb button, voice transcripts.
 * Press Enter to start/stop. AI responds via speaker.
 */
export function TvAskAi() {
  const t = useTranslations('common.tv.askAi');
  const { state, transcript, userTranscript, error, start, stop } = useAskAi();
  const isActive = state !== 'idle';

  useTvFocus('tv-ask-ai', 'TV_ASK_AI_ORB');

  const { ref, focused } = useFocusable({
    focusKey: 'TV_ASK_AI_ORB',
    onEnterPress: () => (isActive ? stop() : start()),
  });

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-8">
      {/* Orb */}
      <div className="relative">
        {state === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="absolute -inset-6 rounded-full border-2 border-indigo-500/30 animate-pulse" />
          </>
        )}
        {state === 'speaking' && (
          <div className="absolute -inset-4 rounded-full border-2 border-green-500/30 animate-pulse" />
        )}
        <div
          ref={ref}
          className={`relative w-44 h-44 rounded-full border-[4px] flex items-center justify-center transition-all ${
            focused ? 'scale-105 shadow-xl' : ''
          } ${
            state === 'listening'
              ? 'bg-indigo-500/10 border-indigo-500/50'
              : state === 'speaking'
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-card border-border'
          }`}
        >
          <span className="material-symbols-outlined text-6xl text-foreground/60">
            {isActive ? 'stop' : 'mic'}
          </span>
        </div>
      </div>

      {/* Status */}
      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {state === 'idle' && t('pressEnter')}
        {state === 'listening' && t('listening')}
        {state === 'speaking' && t('speaking')}
      </p>

      {/* Transcripts */}
      <div className="w-full max-w-lg space-y-4 min-h-[80px]">
        {userTranscript && (
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('you')}
            </span>
            <p className="text-sm text-foreground/70 mt-1">{userTranscript}</p>
          </div>
        )}
        {transcript && (
          <div className="text-left">
            <span className="text-xs text-indigo-400 uppercase tracking-wider">
              {t('ai')}
            </span>
            <p className="text-sm text-foreground mt-1 leading-relaxed">
              {transcript}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

'use client';

import { Play, Square } from 'lucide-react';
import { useAskAi } from '@/features/ask-ai/hooks/use-ask-ai';

export function AskAiView() {
  const { state, transcript, userTranscript, error, start, stop } = useAskAi();
  const isActive = state !== 'idle';

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12">
      {/* Orb button — start or stop */}
      <button
        type="button"
        onClick={isActive ? stop : start}
        className="group relative w-40 h-40 md:w-52 md:h-52 rounded-full bg-primary/10 border-[3px] border-border flex items-center justify-center hover:bg-primary/20 transition-colors duration-300 focus:outline-none"
        aria-label={isActive ? 'Stop conversation' : 'Start conversation'}
      >
        {isActive ? (
          <Square className="w-10 h-10 md:w-14 md:h-14 text-red-400 fill-current transition-colors" />
        ) : (
          <Play className="w-14 h-14 md:w-20 md:h-20 text-foreground/40 group-hover:text-foreground/60 fill-current transition-colors ml-2" />
        )}
      </button>

      {/* Status */}
      <p className="font-headline font-black uppercase tracking-[0.2em] text-xs text-foreground/40">
        {state === 'idle' && 'Tap to talk'}
        {state === 'listening' && 'Listening...'}
        {state === 'speaking' && 'Speaking...'}
      </p>

      {/* Transcripts */}
      <div className="w-full max-w-md space-y-4 min-h-[100px]">
        {userTranscript && (
          <div className="text-right">
            <span className="text-foreground/30 font-headline font-bold uppercase tracking-widest text-[10px]">
              You
            </span>
            <p className="text-foreground/60 text-sm mt-1">{userTranscript}</p>
          </div>
        )}
        {transcript && (
          <div className="text-left">
            <span className="text-neo-blue font-headline font-bold uppercase tracking-widest text-[10px]">
              AI
            </span>
            <p className="text-foreground text-sm mt-1 leading-relaxed">
              {transcript}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
    </div>
  );
}

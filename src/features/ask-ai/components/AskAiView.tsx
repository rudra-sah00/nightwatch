'use client';

import { Play, Square } from 'lucide-react';
import { useAskAi } from '@/features/ask-ai/hooks/use-ask-ai';

export function AskAiView() {
  const { state, transcript, userTranscript, error, start, stop } = useAskAi();
  const isActive = state !== 'idle';

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12">
      {/* Orb button */}
      <div className="relative">
        {/* Pulse rings when listening */}
        {state === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full bg-neo-yellow/20 animate-ping" />
            <div className="absolute -inset-4 rounded-full border-2 border-neo-yellow/30 animate-pulse" />
          </>
        )}
        {state === 'speaking' && (
          <div className="absolute -inset-3 rounded-full border-2 border-neo-blue/30 animate-pulse" />
        )}
        <button
          type="button"
          onClick={isActive ? stop : start}
          className={`relative w-40 h-40 md:w-52 md:h-52 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 focus:outline-none ${
            state === 'listening'
              ? 'bg-neo-yellow/10 border-neo-yellow/40'
              : state === 'speaking'
                ? 'bg-neo-blue/10 border-neo-blue/40'
                : 'bg-primary/10 border-border hover:bg-primary/20'
          }`}
          aria-label={isActive ? 'Stop conversation' : 'Start conversation'}
        >
          {isActive ? (
            <Square className="w-10 h-10 md:w-14 md:h-14 text-red-400 fill-current" />
          ) : (
            <Play className="w-14 h-14 md:w-20 md:h-20 text-foreground/40 fill-current ml-2" />
          )}
        </button>
      </div>

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

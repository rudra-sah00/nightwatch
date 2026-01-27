'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-700 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Layered Pulsing Rings */}
        <div className="absolute w-24 h-24 rounded-full border border-indigo-500/30 animate-[ping_3s_infinite]" />
        <div className="absolute w-32 h-32 rounded-full border border-purple-500/20 animate-[ping_4s_infinite]" />

        {/* Main Spinner Core */}
        <div className="relative w-20 h-20">
          {/* Static outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-white/5" />

          {/* Spinning dynamic ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 border-r-purple-500 animate-spin" />

          {/* Center Glow */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_15px_white]" />
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="mt-8 flex flex-col items-center gap-1 animate-pulse">
        <span className="text-white/90 text-sm font-medium tracking-[0.2em] uppercase">
          Starting Stream
        </span>
        <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      </div>
    </div>
  );
}

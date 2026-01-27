'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BufferingOverlayProps {
  isVisible: boolean;
}

export function BufferingOverlay({ isVisible }: BufferingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="relative flex items-center justify-center scale-75">
        {/* Pulsing ring */}
        <div className="absolute w-20 h-20 rounded-full border border-white/20 animate-[ping_2s_infinite]" />

        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <Loader2 className="absolute top-0 left-0 w-16 h-16 text-indigo-500 animate-spin" />

          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)]" />
        </div>
      </div>
    </div>
  );
}

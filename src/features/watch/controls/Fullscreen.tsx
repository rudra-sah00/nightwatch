'use client';

import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function Fullscreen({ isFullscreen, onToggle }: FullscreenProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'p-3 rounded-full',
        'transition-all duration-300 ease-out',
        'bg-white/5 backdrop-blur-sm border border-white/10',
        'hover:bg-white/15 hover:border-white/20 hover:scale-105',
        'active:scale-95 active:bg-white/20',
        'shadow-lg shadow-black/20',
      )}
    >
      {isFullscreen ? (
        <Minimize className="w-6 h-6 text-white drop-shadow-sm" />
      ) : (
        <Maximize className="w-6 h-6 text-white drop-shadow-sm" />
      )}
    </button>
  );
}

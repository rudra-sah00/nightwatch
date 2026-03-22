'use client';

import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenProps {
  isFullscreen: boolean;
  onToggle: () => void;
  /** Label for accessibility — differs between native and theater mode */
  label?: string;
}

export function Fullscreen({ isFullscreen, onToggle, label }: FullscreenProps) {
  const ariaLabel =
    label || (isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      className={cn(
        'p-2.5 transition-all duration-200',
        'bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm',
        'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#f5f0e8]',
        'active:bg-[#e0e0e0]',
      )}
    >
      {isFullscreen ? (
        <Minimize className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
      ) : (
        <Maximize className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
      )}
    </button>
  );
}

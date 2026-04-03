'use client';

import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenProps {
  isFullscreen: boolean;
  onToggle: () => void;
  /** Label for accessibility — differs between native and theater mode */
  label?: string;
  compact?: boolean;
}

export function Fullscreen({
  isFullscreen,
  onToggle,
  label,
  compact = false,
}: FullscreenProps) {
  const ariaLabel =
    label || (isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      className={cn(
        compact
          ? 'p-1.5 transition-[background-color,color,border-color,opacity,transform] duration-200'
          : 'p-2.5 transition-[background-color,color,border-color,opacity,transform] duration-200',
        'bg-white border-[3px] border-border text-foreground ',
        'hover:bg-background',
        'active:bg-[#e0e0e0]',
      )}
    >
      {isFullscreen ? (
        <Minimize
          className={cn(
            compact
              ? 'w-4 h-4 stroke-[3px]'
              : 'w-5 h-5 md:w-6 md:h-6 stroke-[3px]',
          )}
        />
      ) : (
        <Maximize
          className={cn(
            compact
              ? 'w-4 h-4 stroke-[3px]'
              : 'w-5 h-5 md:w-6 md:h-6 stroke-[3px]',
          )}
        />
      )}
    </button>
  );
}

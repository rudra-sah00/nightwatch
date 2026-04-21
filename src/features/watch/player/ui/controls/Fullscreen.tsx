'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('watch.player');
  const ariaLabel =
    label || (isFullscreen ? t('exitFullscreen') : t('enterFullscreen'));

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
        'bg-background border-[3px] border-border text-foreground ',
        'hover:bg-neo-yellow/80',
        'active:bg-neo-yellow',
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

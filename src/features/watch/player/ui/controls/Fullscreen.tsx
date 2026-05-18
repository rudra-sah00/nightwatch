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
          ? 'p-1 transition-colors duration-200'
          : 'p-1 md:p-1.5 transition-colors duration-200',
        'text-white/80 hover:text-white active:scale-125 transition-transform duration-200',
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

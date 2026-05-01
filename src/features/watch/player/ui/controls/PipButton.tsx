'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';

interface PlayerPipButtonProps {
  onPip: () => void;
  compact?: boolean;
}

export function PlayerPipButton({ onPip, compact }: PlayerPipButtonProps) {
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const t = useTranslations('watch.player');
  const resolvedCompact = compact ?? (isMobile && isPortrait);

  if (!isMobile) return null;

  return (
    <button
      type="button"
      onClick={onPip}
      aria-label={t('pip')}
      className={cn(
        'transition-colors duration-200',
        'bg-background border-[3px] border-border text-foreground',
        'hover:bg-neo-yellow/80 active:bg-neo-yellow',
        resolvedCompact ? 'p-1.5' : 'p-2.5',
      )}
    >
      <ChevronDown
        className={cn(
          'stroke-[3px]',
          resolvedCompact ? 'w-4 h-4' : 'w-5 h-5 md:w-6 md:h-6',
        )}
      />
    </button>
  );
}

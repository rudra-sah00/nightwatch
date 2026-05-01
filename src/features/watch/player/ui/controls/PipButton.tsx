'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';

/**
 * Props for the {@link PlayerPipButton} component.
 */
interface PlayerPipButtonProps {
  /** Callback invoked when the user taps the PiP minimize button. */
  onPip: () => void;
  /** Force compact sizing. When omitted, auto-resolves to compact on mobile portrait. */
  compact?: boolean;
}

/**
 * Mobile-only Picture-in-Picture minimize button.
 *
 * Renders a downward chevron icon that triggers the PiP transition when tapped.
 * Returns `null` on desktop — PiP is only available on mobile devices.
 * Automatically switches to compact sizing when the device is in portrait orientation.
 *
 * @param props - See {@link PlayerPipButtonProps}.
 */
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

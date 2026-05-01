import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/** Props for the {@link BufferingOverlay} component. */
interface BufferingOverlayProps {
  isVisible: boolean;
}

/**
 * Semi-transparent spinner overlay shown while the video is buffering.
 * Uses `pointer-events: none` so it never blocks user interaction.
 */
export function BufferingOverlay({ isVisible }: BufferingOverlayProps) {
  const t = useTranslations('watch.player');

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-none transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
      role="status"
      aria-live="polite"
      aria-label={t('bufferingAriaLabel')}
      aria-hidden={!isVisible}
    >
      <div className="relative flex items-center justify-center drop-shadow-md">
        <Loader2 className="w-8 h-8 md:w-16 md:h-16 text-white animate-spin" />
      </div>
    </div>
  );
}

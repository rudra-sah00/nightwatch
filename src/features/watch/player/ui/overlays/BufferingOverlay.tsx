import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface BufferingOverlayProps {
  isVisible: boolean;
}

export function BufferingOverlay({ isVisible }: BufferingOverlayProps) {
  const t = useTranslations('watch.player');

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
      role="status"
      aria-live="polite"
      aria-label={t('bufferingAriaLabel')}
      aria-hidden={!isVisible}
    >
      <div className="relative flex items-center justify-center drop-shadow-md">
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-white animate-spin" />
      </div>
    </div>
  );
}

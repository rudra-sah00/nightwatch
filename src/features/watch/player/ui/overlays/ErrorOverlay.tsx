'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ErrorOverlayProps {
  isVisible: boolean;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorOverlay({
  isVisible,
  message,
  onRetry,
  onBack,
}: ErrorOverlayProps) {
  const t = useTranslations('watch.player');

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-30 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none px-4">
      <div className="flex flex-col items-center w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4 sm:mb-6">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-destructive stroke-[2px]" />
        </div>
        <h2 className="text-foreground text-xl sm:text-2xl font-black font-headline uppercase tracking-tighter mb-2">
          {t('playbackError')}
        </h2>
        <div className="h-[3px] sm:h-[4px] w-10 sm:w-12 bg-primary mb-3 sm:mb-4" />
        <p className="text-foreground font-bold font-headline uppercase tracking-widest text-xs sm:text-sm mb-6 sm:mb-8 break-words w-full">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2 sm:py-3 text-sm sm:text-base font-bold font-headline uppercase tracking-widest transition-colors rounded-md"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
              {t('tryAgain')}
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 py-2 sm:py-3 text-sm sm:text-base font-bold font-headline uppercase tracking-widest transition-colors rounded-md"
            >
              {t('goBack')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

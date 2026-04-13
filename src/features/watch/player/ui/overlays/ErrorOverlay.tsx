'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

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
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none px-4">
      <div className="flex flex-col items-center w-full max-w-md bg-background border-[4px] border-border p-6 sm:p-8 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-neo-red border-[3px] sm:border-[4px] border-border flex items-center justify-center mb-4 sm:mb-6">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground stroke-[3px]" />
        </div>
        <h2 className="text-foreground text-xl sm:text-2xl font-black font-headline uppercase tracking-tighter mb-2">
          Playback Error
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
              className="flex-1 flex items-center justify-center gap-2 bg-neo-yellow text-foreground border-[3px] sm:border-[4px] border-border py-2 sm:py-3 text-sm sm:text-base font-black font-headline uppercase tracking-widest hover:bg-neo-yellow/80 active:bg-neo-yellow/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
              Try Again
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 bg-background text-foreground border-[3px] sm:border-[4px] border-border py-2 sm:py-3 text-sm sm:text-base font-black font-headline uppercase tracking-widest hover:bg-background active:bg-muted/80 transition-colors"
            >
              Go Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

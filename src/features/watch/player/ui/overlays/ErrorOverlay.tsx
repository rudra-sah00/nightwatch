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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 animate-in fade-in duration-300">
      <div className="flex flex-col items-center max-w-md bg-background border-[4px] border-border  p-8 text-center mx-4">
        <div className="w-16 h-16 bg-[#e63b2e] border-[4px] border-border flex items-center justify-center mb-6 ">
          <AlertCircle className="w-10 h-10 text-white stroke-[3px]" />
        </div>
        <h2 className="text-foreground text-2xl font-black font-headline uppercase tracking-tighter mb-2">
          Playback Error
        </h2>
        <div className="h-[4px] w-12 bg-[#1a1a1a] mb-4" />
        <p className="text-foreground font-bold font-headline uppercase tracking-widest text-sm mb-8">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 bg-[#ffcc00] text-foreground border-[4px] border-border py-3 font-black font-headline uppercase tracking-widest  hover:bg-[#ffe066] active:bg-[#ffb700] transition-all"
            >
              <RefreshCw className="w-5 h-5 stroke-[3px]" />
              Try Again
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-foreground border-[4px] border-border py-3 font-black font-headline uppercase tracking-widest  hover:bg-background active:bg-[#e0dcd3] transition-all"
            >
              Go Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

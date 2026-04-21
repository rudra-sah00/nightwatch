'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface WatchPartyLoadingProps {
  message?: string;
  className?: string;
}

export function WatchPartyLoading({
  message,
  className,
}: WatchPartyLoadingProps) {
  const t = useTranslations('party');
  const displayMessage = message ?? t('loading.connecting');
  return (
    <div
      className={cn(
        'min-h-screen bg-background flex flex-col items-center justify-center p-6 transition-[opacity,transform] duration-500 ease-in-out',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
    >
      <div className="bg-neo-yellow border-[4px] border-border  px-8 py-6 md:px-12 md:py-8 flex flex-col items-center gap-6 saturate-[1.2] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none">
        {/* Brutalist Square Loader */}
        <div className="relative w-12 h-12 md:w-16 md:h-16">
          <div className="absolute inset-0 border-[4px] border-border bg-background animate-[spin_2s_steps(4)_infinite] motion-reduce:animate-none" />
          <div className="absolute inset-2 bg-neo-red border-[3px] border-border animate-[spin_2s_steps(4)_infinite_reverse] motion-reduce:animate-none" />
        </div>

        {/* Steady Loading Text */}
        <div className="mt-2 flex flex-col items-center gap-3 w-full">
          <span className="text-foreground text-[10px] md:text-sm font-black font-headline tracking-widest uppercase text-center leading-tight max-w-[240px]">
            {displayMessage}
          </span>
          <div className="h-[4px] w-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

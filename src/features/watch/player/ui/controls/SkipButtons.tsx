'use client';

import { SkipBack, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Static icons to avoid recreation
const skipBackIcon = (
  <SkipBack className="w-8 h-8 text-foreground stroke-[3px]" />
);
const skipForwardIcon = (
  <SkipForward className="w-8 h-8 text-foreground stroke-[3px]" />
);

/** Props for the {@link SkipButton} component. */
interface SkipButtonProps {
  direction: 'back' | 'forward';
  seconds?: number;
  onSkip: () => void;
}

/**
 * Neo-brutalist skip button that jumps playback forward or backward
 * by a configurable number of seconds.
 */
export function SkipButton({
  direction,
  seconds = 10,
  onSkip,
}: SkipButtonProps) {
  const t = useTranslations('watch.player');
  const Icon = direction === 'back' ? SkipBack : SkipForward;

  return (
    <button
      type="button"
      onClick={onSkip}
      className="p-2.5 bg-background border-[3px] border-border text-foreground  hover:bg-neo-yellow/80 active:bg-muted transition-colors duration-200 group relative flex items-center justify-center"
      title={
        direction === 'back'
          ? t('skipBack', { seconds })
          : t('skipForward', { seconds })
      }
    >
      <Icon className="w-5 h-5 stroke-[3px] -mb-1" />
      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black font-headline text-foreground bg-background border-[2px] border-border px-1 group-hover:bg-neo-yellow/80 transition-colors">
        {seconds}
      </span>
    </button>
  );
}

/** Props for the {@link SeekIndicator} component. */
interface SeekIndicatorProps {
  seconds: number;
  direction: 'back' | 'forward';
  isVisible: boolean;
}

/**
 * Animated seek indicator overlay shown briefly when the user skips
 * forward or backward in the video.
 */
export function SeekIndicator({
  seconds,
  direction,
  isVisible,
}: SeekIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${direction === 'back' ? 'left-1/4' : 'right-1/4'} 
                        flex flex-col items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-200 motion-reduce:animate-none`}
    >
      <div className="w-16 h-16 bg-background border-[4px] border-border flex items-center justify-center ">
        {direction === 'back' ? skipBackIcon : skipForwardIcon}
      </div>
      <span className="text-foreground bg-background border-[3px] border-border px-3 py-1 font-black font-headline uppercase tracking-widest text-sm ">
        {seconds}s
      </span>
    </div>
  );
}

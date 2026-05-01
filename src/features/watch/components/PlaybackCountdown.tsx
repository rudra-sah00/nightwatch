'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlaybackCountdown } from '../hooks/use-playback-countdown';

/** Props for the {@link PlaybackCountdown} component. */
interface PlaybackCountdownProps {
  onComplete: () => void;
  title?: string;
  subtitle?: string;
}

/**
 * Full-screen 3-2-1 countdown overlay shown before playback begins.
 *
 * Renders an animated circular progress ring, a large digit, and step
 * indicators. Calls `onComplete` after the countdown reaches zero.
 */
export function PlaybackCountdown({
  onComplete,
  title,
  subtitle,
}: PlaybackCountdownProps) {
  const t = useTranslations('watch');
  const { count, progress } = usePlaybackCountdown(onComplete);

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-reduce:animate-none pointer-events-auto select-none"
      role="status"
      aria-live="polite"
      aria-label={t('aria.playbackCountdown')}
    >
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse motion-reduce:animate-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700 motion-reduce:animate-none" />

      <div className="relative flex flex-col items-center gap-10 text-center px-6">
        {/* Animated Brand Icon */}
        <div className="w-20 h-20 rounded-full bg-neo-surface/5 border border-white/10 flex items-center justify-center mb-2 shadow-2xl">
          <Sparkles className="w-10 h-10 text-primary animate-pulse motion-reduce:animate-none" />
        </div>

        <div className="space-y-3">
          <h2 className="text-white font-bold text-2xl tracking-tighter">
            {title ?? t('countdown.startingExperience')}
          </h2>
          <p className="text-white/40 text-sm tracking-[0.2em] uppercase font-medium">
            {subtitle ?? t('countdown.getReady')}
          </p>
        </div>

        {/* Countdown Circle */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* SVG Progress Circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <title>{t('aria.countdownTitle')}</title>
            <circle
              cx="112"
              cy="112"
              r="104"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-white/5"
            />
            <circle
              cx="112"
              cy="112"
              r="104"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={653.45}
              strokeDashoffset={653.45 * (1 - progress / 100)}
              className="text-primary transition-[stroke-dashoffset] duration-150 ease-linear"
              strokeLinecap="round"
            />
          </svg>

          {/* Large Digit */}
          <div className="relative flex flex-col items-center">
            <span
              key={count}
              className="text-9xl font-black text-white motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300 motion-reduce:animate-none drop-shadow-md"
            >
              {count > 0 ? count : t('countdown.go')}
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-3 items-center">
          {[3, 2, 1].map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 rounded-full transition-[width,background-color] duration-500 shadow-sm',
                count === n ? 'bg-primary w-12' : 'bg-neo-surface/10 w-4',
              )}
            />
          ))}
        </div>
      </div>

      {/* Security/Hardened Note */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <span className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
          {t('countdown.eliteExperience')}
        </span>
      </div>
    </div>
  );
}

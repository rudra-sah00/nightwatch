'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PlaybackCountdownProps {
  onComplete: () => void;
  title?: string;
  subtitle?: string;
}

export function PlaybackCountdown({
  onComplete,
  title = 'Starting Experience',
  subtitle = 'Get ready for cinematic excellence',
}: PlaybackCountdownProps) {
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Block body scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    if (count <= 0) {
      // Small delay for the final "GO" or "1" to show
      const finalTimeout = setTimeout(() => {
        document.body.style.overflow = originalStyle;
        onComplete();
      }, 500);
      return () => clearTimeout(finalTimeout);
    }

    const timer = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.max(0, p - 100 / 30)); // Smooth depletion over 3s
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
      document.body.style.overflow = originalStyle;
    };
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl animate-in fade-in duration-700 pointer-events-auto select-none">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="relative flex flex-col items-center gap-10 text-center px-6">
        {/* Animated Brand Icon */}
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-2xl">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        </div>

        <div className="space-y-3">
          <h2 className="text-white font-bold text-2xl tracking-tighter">
            {title}
          </h2>
          <p className="text-white/40 text-sm tracking-[0.2em] uppercase font-medium">
            {subtitle}
          </p>
        </div>

        {/* Countdown Circle */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* SVG Progress Circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <title>Playback Countdown</title>
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
              className="text-primary transition-all duration-150 ease-linear drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]"
              strokeLinecap="round"
            />
          </svg>

          {/* Large Digit */}
          <div className="relative flex flex-col items-center">
            <span
              key={count}
              className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-in zoom-in-75 duration-300"
            >
              {count > 0 ? count : 'GO'}
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-3 items-center">
          {[3, 2, 1].map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500 shadow-sm',
                count === n ? 'bg-primary w-12' : 'bg-white/10 w-4',
              )}
            />
          ))}
        </div>
      </div>

      {/* Security/Hardened Note */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <span className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
          Elite AI Experience • EMA Hardened
        </span>
      </div>
    </div>
  );
}

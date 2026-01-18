'use client';

import { useEffect, useState } from 'react';
import { SKIP_SECONDS } from '@/lib/constants';

interface SkipIndicatorProps {
  direction: 'forward' | 'backward';
  isActive: boolean;
  skipSeconds?: number;
}

export function SkipIndicator({
  direction,
  isActive,
  skipSeconds = SKIP_SECONDS,
}: SkipIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      setAnimationKey((prev) => prev + 1);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!visible) return null;

  const isForward = direction === 'forward';

  return (
    <div
      className={`absolute inset-y-0 ${isForward ? 'right-0' : 'left-0'} w-1/3 flex items-center justify-center pointer-events-none`}
    >
      {/* Ripple background effect */}
      <div
        key={`ripple-${animationKey}`}
        className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/20 animate-[ripple-expand_0.6s_ease-out_forwards]"
      />

      {/* Main indicator */}
      <div
        key={`content-${animationKey}`}
        className="relative z-10 animate-[indicator-pop_0.6s_ease-out_forwards]"
      >
        <div className="flex flex-col items-center gap-2">
          {/* Animated arrows */}
          <div className="flex items-center gap-0.5">
            {isForward ? (
              <>
                <svg
                  aria-hidden="true"
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-[arrow-slide_0.4s_ease-out_infinite]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <svg
                  aria-hidden="true"
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-[arrow-slide_0.4s_ease-out_0.1s_infinite]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-[arrow-slide-back_0.4s_ease-out_0.1s_infinite]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16 19V5l-11 7z" />
                </svg>
                <svg
                  aria-hidden="true"
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-[arrow-slide-back_0.4s_ease-out_infinite]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16 19V5l-11 7z" />
                </svg>
              </>
            )}
          </div>

          {/* Text showing skip amount */}
          <div className="text-sm sm:text-base font-semibold text-white drop-shadow-lg">
            {skipSeconds} seconds
          </div>
        </div>
      </div>
    </div>
  );
}

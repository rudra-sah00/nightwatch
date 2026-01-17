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
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (isActive) {
      setDisplayText(`${direction === 'forward' ? '+' : '-'}${skipSeconds}s`);

      // Auto hide after 500ms
      const timer = setTimeout(() => {
        setDisplayText('');
      }, 500);

      return () => clearTimeout(timer);
    }
    setDisplayText('');
  }, [isActive, direction, skipSeconds]);

  if (!displayText) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="animate-skip-fade">
        <div className="flex flex-col items-center gap-3">
          {/* Icon based on direction */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            {direction === 'forward' ? (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-black"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-label="Forward"
              >
                <title>Forward</title>
                <path d="M4 12a8 8 0 0 0 14.93 5M4 12a8 8 0 0 1 14.93-5M4 12H1m19 0h-3m-5.93-5a8 8 0 0 1 2.87 6M4 12a8 8 0 0 0 10.87 7.87" />
                <path
                  d="M17 8l4 4m0 0l-4 4m4-4H9"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-black"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-label="Backward"
              >
                <title>Backward</title>
                <path d="M20 12a8 8 0 0 1-14.93 5M20 12a8 8 0 0 0-14.93-5M20 12h3m-19 0h3m5.93-5a8 8 0 0 0-2.87 6M20 12a8 8 0 0 1-10.87 7.87" />
                <path
                  d="M7 8L3 12m0 0l4 4m-4-4h8"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                />
              </svg>
            )}
          </div>

          {/* Text showing skip amount */}
          <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            {displayText}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes skipFade {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
        .animate-skip-fade {
          animation: skipFade 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

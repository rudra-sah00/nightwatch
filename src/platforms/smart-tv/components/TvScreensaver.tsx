'use client';

import { useEffect, useState } from 'react';
import { useTvIdle } from '../hooks/use-tv-idle';

/**
 * Screensaver with bouncing logo + clock. Appears after 5 min inactivity.
 */
export function TvScreensaver() {
  const isIdle = useTvIdle();
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!isIdle) return;
    const move = setInterval(() => {
      setPosition({ x: Math.random() * 70 + 5, y: Math.random() * 70 + 5 });
    }, 4000);
    const tick = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 1000);
    setTime(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    );
    return () => {
      clearInterval(move);
      clearInterval(tick);
    };
  }, [isIdle]);

  if (!isIdle) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div
        className="transition-all duration-[3000ms] ease-in-out flex flex-col items-center gap-3"
        style={{
          position: 'absolute',
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
      >
        <img src="/logo.png" alt="" className="w-16 h-16 opacity-60" />
        <span className="text-2xl font-mono text-white/40 font-bold">
          {time}
        </span>
      </div>
    </div>
  );
}

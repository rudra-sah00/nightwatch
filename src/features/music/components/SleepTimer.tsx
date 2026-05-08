'use client';

import { Moon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

const TIMER_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

/**
 * Sleep timer panel — pick a duration, music stops after that time.
 */
export function SleepTimer({ onClose }: { onClose: () => void }) {
  const { setSleepTimer, sleepTimerEnd, isRemoteControlling } =
    useMusicPlayerContext();
  const [remaining, setRemaining] = useState<string | null>(null);

  const handleSetTimer = (minutes: number) => {
    if (isRemoteControlling && minutes > 0) {
      // For remote: use a local timeout that sends stop to the remote device
      const ms = minutes * 60 * 1000;
      const end = Date.now() + ms;
      // Store in context for countdown display
      setSleepTimer(minutes);
      // Schedule remote stop
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'stop' }),
        );
      }, ms);
      void end; // countdown handled by sleepTimerEnd in context
    } else {
      setSleepTimer(minutes);
    }
  };

  useEffect(() => {
    if (!sleepTimerEnd) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const diff = sleepTimerEnd - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepTimerEnd]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-bold font-headline uppercase tracking-wider text-white">
            Sleep Timer
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active timer */}
      {remaining && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/10">
          <p className="text-sm text-white">
            Stopping in <span className="font-mono font-bold">{remaining}</span>
          </p>
          <button
            type="button"
            onClick={() => handleSetTimer(0)}
            className="text-xs text-white/60 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {TIMER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              handleSetTimer(opt.value);
              onClose();
            }}
            className="px-4 py-3 text-sm font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

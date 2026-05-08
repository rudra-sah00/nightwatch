'use client';

import { Moon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

const TIMER_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

/**
 * Sleep timer — full-screen overlay with backdrop blur.
 */
export function SleepTimer({ onClose }: { onClose: () => void }) {
  const { setSleepTimer, sleepTimerEnd, isRemoteControlling } =
    useMusicPlayerContext();
  const [remaining, setRemaining] = useState<string | null>(null);
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up remote timer on unmount or cancel
  useEffect(() => {
    return () => {
      if (remoteTimerRef.current) {
        clearTimeout(remoteTimerRef.current);
        remoteTimerRef.current = null;
      }
    };
  }, []);

  const handleSetTimer = (minutes: number) => {
    // Clear any existing remote timer
    if (remoteTimerRef.current) {
      clearTimeout(remoteTimerRef.current);
      remoteTimerRef.current = null;
    }

    if (isRemoteControlling && minutes > 0) {
      const ms = minutes * 60 * 1000;
      setSleepTimer(minutes);
      remoteTimerRef.current = setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'stop' }),
        );
        remoteTimerRef.current = null;
      }, ms);
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
    <div className="fixed inset-0 z-[10200] flex flex-col items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-200"
        aria-label="Close sleep timer"
      />

      {/* Cancel button — top right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute z-50 text-white/50 hover:text-white font-headline font-black uppercase tracking-[0.2em] text-sm transition-colors"
        style={{
          top: 'calc(2rem + env(safe-area-inset-top, 0px))',
          right: 'calc(2rem + env(safe-area-inset-right, 0px))',
        }}
      >
        Cancel
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6 animate-in slide-in-from-bottom-6 duration-400 ease-out">
        <Moon className="w-10 h-10 text-white/40" />

        <h2 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tighter text-white">
          Sleep Timer
        </h2>

        {/* Active timer countdown */}
        {remaining && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-5xl font-mono font-bold text-white tabular-nums">
              {remaining}
            </p>
            <button
              type="button"
              onClick={() => {
                handleSetTimer(0);
                onClose();
              }}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-full transition-colors"
            >
              Cancel Timer
            </button>
          </div>
        )}

        {/* Options */}
        {!remaining && (
          <div className="grid grid-cols-2 gap-3 w-full">
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  handleSetTimer(opt.value);
                  onClose();
                }}
                className="px-4 py-4 text-sm font-bold font-headline uppercase tracking-wider text-white/70 border border-white/15 rounded-xl hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { getSyncedLyrics } from '@/features/music/api';
import { useMusicStore } from '@/features/music/store/use-music-store';
import type { SyncedLyricLine } from '@/features/music/types';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Control Button ───
function Btn({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`p-3 rounded-full transition-all ${
        focused
          ? 'bg-white text-black scale-110'
          : active
            ? 'text-tv-focus'
            : 'text-white/70'
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
}

// ─── Seek Bar ───
function SeekBar() {
  const progress = useMusicStore((s) => s.progress);
  const duration = useMusicStore((s) => s.duration);
  const seek = useMusicStore((s) => s.seek);
  const holdRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const { ref, focused } = useFocusable({
    onArrowPress: (dir) => {
      if (dir !== 'left' && dir !== 'right') return true;
      const step = 2; // 2% per tick
      const sign = dir === 'right' ? 1 : -1;
      if (!holdRef.current) {
        holdRef.current = setInterval(() => {
          const cur = useMusicStore.getState().progress;
          const next = Math.max(0, Math.min(100, cur + step * sign));
          seek(next);
        }, 80);
      }
      return false;
    },
    onArrowRelease: (dir) => {
      if (dir === 'left' || dir === 'right') {
        clearInterval(holdRef.current);
        holdRef.current = undefined;
      }
    },
  });

  useEffect(() => () => clearInterval(holdRef.current), []);

  return (
    <div ref={ref} className="flex items-center gap-3 w-full">
      <span className="text-xs text-white/50 min-w-[40px] text-right font-mono">
        {formatTime((progress / 100) * duration)}
      </span>
      <div
        className={`flex-1 h-1.5 rounded-full overflow-hidden transition-all ${
          focused ? 'h-2.5 ring-2 ring-tv-focus' : 'bg-white/10'
        }`}
      >
        <div
          className="h-full bg-tv-focus rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-white/50 min-w-[40px] font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
}

// ─── Lyrics Panel ───
function LyricsPanel({
  lyrics,
  currentTime,
}: {
  lyrics: SyncedLyricLine[];
  currentTime: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIdx = useMemo(() => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return -1;
  }, [lyrics, currentTime]);

  // Auto-scroll to active line
  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeIdx < 0) return;
    const el = container.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-3 scrollbar-hide"
    >
      {lyrics.map((line, i) => (
        <p
          key={`${line.time}-${line.text.slice(0, 10)}`}
          className={`text-lg font-medium transition-all duration-300 ${
            i === activeIdx
              ? 'text-white scale-105 origin-left'
              : i < activeIdx
                ? 'text-white/30'
                : 'text-white/50'
          }`}
        >
          {line.text || '♪'}
        </p>
      ))}
    </div>
  );
}

// ─── Queue Item ───
const QueueItem = memo(function QueueItem({
  track,
  index,
  isActive,
}: {
  track: { title: string; artist: string; image: string };
  index: number;
  isActive: boolean;
}) {
  const play = useMusicStore((s) => s.play);
  const queue = useMusicStore((s) => s.queue);
  const { ref, focused } = useFocusable({
    onEnterPress: () => play(queue[index], queue, index),
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
        focused ? 'bg-indigo-500/30' : isActive ? 'bg-white/10' : ''
      }`}
    >
      <Image
        src={track.image}
        alt=""
        className="w-10 h-10 rounded object-cover shrink-0"
        width={40}
        height={40}
        unoptimized
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium truncate ${isActive ? 'text-tv-focus' : 'text-white/80'}`}
        >
          {track.title}
        </p>
        <p className="text-xs text-white/40 truncate">{track.artist}</p>
      </div>
    </div>
  );
});

// ─── Volume Control ───
function VolumeControl() {
  const volume = useMusicStore((s) => s.volume);
  const setVolume = useMusicStore((s) => s.setVolume);
  const holdRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const { ref, focused } = useFocusable({
    onArrowPress: (dir) => {
      if (dir !== 'left' && dir !== 'right') return true;
      const sign = dir === 'right' ? 1 : -1;
      if (!holdRef.current) {
        holdRef.current = setInterval(() => {
          const cur = useMusicStore.getState().volume;
          setVolume(Math.max(0, Math.min(1, cur + 0.05 * sign)));
        }, 80);
      }
      return false;
    },
    onArrowRelease: (dir) => {
      if (dir === 'left' || dir === 'right') {
        clearInterval(holdRef.current);
        holdRef.current = undefined;
      }
    },
  });

  useEffect(() => () => clearInterval(holdRef.current), []);

  // Volume keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp') {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
      }
      if (e.key === 'AudioVolumeDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [volume, setVolume]);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${focused ? 'ring-2 ring-tv-focus' : ''}`}
    >
      <span className="material-symbols-outlined text-lg text-white/60">
        {volume === 0
          ? 'volume_off'
          : volume < 0.5
            ? 'volume_down'
            : 'volume_up'}
      </span>
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-tv-focus rounded-full"
          style={{ width: `${volume * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sleep Timer Button ───
function SleepTimerBtn() {
  const sleepTimerEnd = useMusicStore((s) => s.sleepTimerEnd);
  const setSleepTimer = useMusicStore((s) => s.setSleepTimer);
  const timers = [0, 15, 30, 45, 60];
  const [idx, setIdx] = useState(0);

  const cycle = () => {
    const next = (idx + 1) % timers.length;
    setIdx(next);
    setSleepTimer(timers[next]);
  };

  const { ref, focused } = useFocusable({ onEnterPress: cycle });
  const active = sleepTimerEnd != null && sleepTimerEnd > Date.now();

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${focused ? 'ring-2 ring-tv-focus' : ''} ${active ? 'text-tv-focus' : 'text-white/60'}`}
    >
      <span className="material-symbols-outlined text-lg">bedtime</span>
      <span className="text-xs font-bold">
        {timers[idx] === 0 ? 'Off' : `${timers[idx]}m`}
      </span>
    </div>
  );
}

// ─── Main Full Player ───
export function TvMusicFullPlayer() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);
  const progress = useMusicStore((s) => s.progress);
  const duration = useMusicStore((s) => s.duration);
  const queue = useMusicStore((s) => s.queue);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);
  const setExpanded = useMusicStore((s) => s.setExpanded);

  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_MUSIC_FULL_PLAYER',
    trackChildren: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['up', 'down', 'left', 'right'],
  });

  // Back/Escape key closes the full player
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack') {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [setExpanded]);

  const { data: lyrics = null } = useQuery({
    queryKey: ['music', 'lyrics', currentTrack?.id, duration],
    queryFn: () =>
      getSyncedLyrics(
        currentTrack!.id,
        currentTrack!.title,
        currentTrack!.artist,
        duration,
      ),
    enabled: !!currentTrack && duration > 0,
  });

  const currentTime = (progress / 100) * duration;

  if (!currentTrack) return null;

  const repeatIcon = repeat === 'one' ? 'repeat_one' : 'repeat';

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="fixed inset-0 z-50 bg-black flex">
        {/* Left: Album art + info */}
        <div className="w-[45%] flex flex-col items-center justify-center p-12">
          <Image
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-[300px] h-[300px] rounded-2xl object-cover shadow-2xl mb-8"
            width={300}
            height={300}
            unoptimized
          />
          <h2 className="text-2xl font-bold text-white text-center truncate max-w-full">
            {currentTrack.title}
          </h2>
          <p className="text-base text-white/60 text-center truncate max-w-full mt-1">
            {currentTrack.artist}
          </p>
          <p className="text-sm text-white/40 text-center truncate max-w-full mt-0.5">
            {currentTrack.album}
          </p>

          {/* Controls */}
          <div className="mt-8 w-full max-w-[360px] flex flex-col gap-4">
            <SeekBar />
            <div className="flex items-center justify-center gap-4">
              <Btn
                icon="shuffle"
                label="Shuffle"
                onPress={toggleShuffle}
                active={shuffle}
              />
              <Btn icon="skip_previous" label="Previous" onPress={prev} />
              <Btn
                icon={isPlaying ? 'pause' : 'play_arrow'}
                label={isPlaying ? 'Pause' : 'Play'}
                onPress={togglePlay}
              />
              <Btn icon="skip_next" label="Next" onPress={next} />
              <Btn
                icon={repeatIcon}
                label="Repeat"
                onPress={cycleRepeat}
                active={repeat !== 'off'}
              />
            </div>
            {/* Volume + Sleep timer row */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <VolumeControl />
              <SleepTimerBtn />
            </div>
          </div>

          {/* Close button */}
          <div className="mt-6">
            <Btn
              icon="keyboard_arrow_down"
              label="Close"
              onPress={() => setExpanded(false)}
            />
          </div>
        </div>

        {/* Right: Lyrics or Queue */}
        <div className="flex-1 flex flex-col border-l border-white/10">
          {lyrics && lyrics.length > 0 ? (
            <>
              <div className="px-4 pt-6 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
                  Lyrics
                </h3>
              </div>
              <LyricsPanel lyrics={lyrics} currentTime={currentTime} />
            </>
          ) : (
            <>
              <div className="px-4 pt-6 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
                  Queue ({queue.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {queue.slice(0, 50).map((track, i) => (
                  <QueueItem
                    key={`q-${track.id}-${i.toString(36)}`}
                    track={track}
                    index={i}
                    isActive={track.id === currentTrack.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

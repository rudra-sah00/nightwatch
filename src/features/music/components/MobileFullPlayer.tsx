'use client';

import {
  ListMusic,
  Mic2,
  Moon,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume1,
  Volume2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { MusicTrack, SyncedLyricLine } from '../api';
import { formatTime } from '../utils';
import { Equalizer } from './Equalizer';
import { FullPlayerLyrics } from './FullPlayerLyrics';
import { SleepTimer } from './SleepTimer';

interface MobileFullPlayerProps {
  currentTrack: MusicTrack;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: MusicTrack[];
  lyrics: SyncedLyricLine[] | null;
  currentLineIndex: number;
  closing: boolean;
  showLyrics: boolean;
  showQueue: boolean;
  lyricsRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (percent: number) => void;
  onSetVolume: (v: number) => void;
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
}

export function MobileFullPlayer({
  currentTrack,
  isPlaying,
  progress,
  duration,
  volume,
  queue,
  lyrics,
  currentLineIndex,
  closing,
  showLyrics,
  showQueue,
  lyricsRef,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onSetVolume,
  onPlay,
  onToggleLyrics,
  onToggleQueue,
}: MobileFullPlayerProps) {
  const swipeStartY = useRef(0);
  const t = useTranslations('music');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showEq, setShowEq] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [closingQueue, setClosingQueue] = useState(false);

  const handleCloseQueue = () => {
    setClosingQueue(true);
    setTimeout(() => {
      setClosingQueue(false);
      onToggleQueue();
    }, 250);
  };

  // Seek bar state
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  const getSeekPercent = (clientX: number) => {
    const bar = seekBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
  };

  const currentTime = (progress / 100) * duration;
  const hasLyrics = lyrics && lyrics.length > 0;

  return (
    <div
      className={`fixed inset-0 z-[10100] overflow-hidden duration-300 fill-mode-both ${closing ? 'animate-out slide-out-to-bottom' : 'animate-in slide-in-from-bottom'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
        transition: swipeOffset > 0 ? 'none' : undefined,
      }}
      onTouchStart={(e) => {
        swipeStartY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        // Only allow swipe-to-close from the top area (drag handle / album art)
        if (swipeStartY.current > 150) return;
        const dy = e.touches[0].clientY - swipeStartY.current;
        if (dy > 0) setSwipeOffset(dy * 0.6);
      }}
      onTouchEnd={() => {
        if (swipeOffset > 120) onClose();
        setSwipeOffset(0);
      }}
    >
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img
          src={currentTrack.image}
          alt=""
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full px-7">
        {/* Drag handle */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="shrink-0 flex justify-center pt-3 pb-4"
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </button>

        {showQueue ? (
          /* ===== QUEUE MODE ===== */
          <div
            className={`flex-1 min-h-0 flex flex-col transition-all duration-250 ${closingQueue ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300'}`}
          >
            <div className="shrink-0 flex items-center justify-between pb-2">
              <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px]">
                {t('queue', { count: queue.length })}
              </p>
              <button
                type="button"
                onClick={handleCloseQueue}
                className="text-white/50 text-xs font-bold uppercase tracking-wider"
              >
                {t('close')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {queue.map((track, i) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onPlay(track, queue)}
                  className={`w-full flex items-center gap-3 py-2 text-left ${currentTrack?.id === track.id ? 'text-white bg-white/5 rounded-lg px-1' : 'text-white/60'}`}
                >
                  <span className="w-5 text-[10px] font-mono text-right shrink-0">
                    {currentTrack?.id === track.id ? (
                      <span className="text-neo-yellow">▶</span>
                    ) : (
                      <span className="text-white/20">{i + 1}</span>
                    )}
                  </span>
                  <img
                    src={track.image}
                    alt=""
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {track.title}
                    </p>
                    <p className="text-white/30 text-xs truncate">
                      {track.artist}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ===== MAIN VIEW ===== */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Album art / lyrics area */}
            <div
              className="shrink-0 flex flex-col mt-6"
              style={{ height: '40vh' }}
            >
              {showLyrics && hasLyrics ? (
                <>
                  <div className="shrink-0 flex items-center gap-3 py-2 animate-in fade-in duration-300">
                    <img
                      src={currentTrack.image}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {currentTrack.title}
                      </p>
                      <p className="text-white/50 text-xs truncate">
                        {currentTrack.artist}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 relative min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FullPlayerLyrics
                      lyrics={lyrics}
                      currentLineIndex={currentLineIndex}
                      duration={duration}
                      seek={onSeek}
                      lyricsRef={lyricsRef}
                      variant="mobile"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full aspect-square max-h-[38vh]">
                    <img
                      src={currentTrack.image}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover rounded-2xl shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 w-full mt-6 mb-2">
              <h2 className="text-white font-bold text-xl truncate">
                {currentTrack.title}
              </h2>
              <p className="text-white/50 text-sm truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>
            <div className="shrink-0 w-full mt-8">
              <div
                ref={seekBarRef}
                className="w-full py-3 cursor-pointer relative"
                role="slider"
                tabIndex={0}
                aria-label={t('seek')}
                aria-valuenow={Math.round(seekPreview ?? progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                onClick={(e) => onSeek(getSeekPercent(e.clientX))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight')
                    onSeek(Math.min(100, progress + 2));
                  else if (e.key === 'ArrowLeft')
                    onSeek(Math.max(0, progress - 2));
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setSeekPreview(getSeekPercent(e.touches[0].clientX));
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  setSeekPreview(getSeekPercent(e.touches[0].clientX));
                }}
                onTouchEnd={() => {
                  if (seekPreview !== null) onSeek(seekPreview);
                  setSeekPreview(null);
                }}
              >
                <div className="w-full h-1.5 bg-white/15 rounded-full relative">
                  <div
                    className="h-full bg-white/80 rounded-full transition-[width] duration-100 ease-linear"
                    style={{ width: `${seekPreview ?? progress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-0">
                <span className="text-white/40 text-[10px] font-mono">
                  {formatTime(
                    seekPreview !== null
                      ? (seekPreview / 100) * duration
                      : currentTime,
                  )}
                </span>
                <span className="text-white/40 text-[10px] font-mono">
                  -
                  {formatTime(
                    Math.max(
                      0,
                      duration -
                        (seekPreview !== null
                          ? (seekPreview / 100) * duration
                          : currentTime),
                    ),
                  )}
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-center gap-12 mt-14">
              <button
                type="button"
                onClick={onPrev}
                aria-label={t('prev')}
                className="text-white"
              >
                <SkipBack className="w-9 h-9 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? t('pause') : t('play')}
                className="text-white"
              >
                {isPlaying ? (
                  <Pause className="w-14 h-14 fill-current" />
                ) : (
                  <Play className="w-14 h-14 fill-current ml-1" />
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label={t('next')}
                className="text-white"
              >
                <SkipForward className="w-9 h-9 fill-current" />
              </button>
            </div>
            <div className="shrink-0 flex items-center gap-3 mt-[5.2rem]">
              <Volume1 className="w-3.5 h-3.5 text-white/30" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onSetVolume(v);
                }}
                className="flex-1 h-1 accent-white cursor-pointer"
              />
              <Volume2 className="w-3.5 h-3.5 text-white/30" />
            </div>

            {/* Bottom bar: lyrics / eq / sleep / queue */}
            <div className="flex items-center justify-around mt-8 py-2">
              <button
                type="button"
                onClick={onToggleLyrics}
                className={`p-2.5 rounded-full transition-colors ${showLyrics ? 'bg-white/20 text-white' : hasLyrics ? 'text-white/50' : 'text-white/15'}`}
                disabled={!hasLyrics}
              >
                <Mic2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowEq((v) => !v)}
                className={`p-2.5 rounded-full transition-colors ${showEq ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowSleep((v) => !v)}
                className={`p-2.5 rounded-full transition-colors ${showSleep ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                <Moon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onToggleQueue}
                className={`p-2.5 rounded-full transition-colors ${showQueue ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>

            {/* Equalizer panel */}
            {showEq && <Equalizer onClose={() => setShowEq(false)} />}

            {/* Sleep Timer panel */}
            {showSleep && <SleepTimer onClose={() => setShowSleep(false)} />}
          </div>
        )}
      </div>
    </div>
  );
}

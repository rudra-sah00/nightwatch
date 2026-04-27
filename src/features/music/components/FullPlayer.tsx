'use client';

import {
  ChevronDown,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getLyrics } from '../api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { formatTime } from '../utils';

export function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    expanded,
    togglePlay,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
    setExpanded,
    volume,
    setVolume,
  } = useMusicPlayerContext();
  const t = useTranslations('music');

  const [lyrics, setLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
    }, 300);
  };

  const toggleLyrics = () => {
    if (!currentTrack?.hasLyrics) {
      toast.info(t('noLyrics'));
      return;
    }
    setShowLyrics((v) => !v);
  };

  useEffect(() => {
    if (
      !currentTrack?.id ||
      !expanded ||
      !showLyrics ||
      !currentTrack.hasLyrics
    ) {
      return;
    }
    setLyricsLoading(true);
    getLyrics(currentTrack.id)
      .then((data) => setLyrics(data.lyrics))
      .catch(() => {
        setLyrics('');
        toast.error(t('couldNotLoadLyrics'));
      })
      .finally(() => setLyricsLoading(false));
  }, [currentTrack?.id, currentTrack?.hasLyrics, expanded, showLyrics, t]);

  const trackId = currentTrack?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on track change
  useEffect(() => {
    setShowLyrics(false);
    setLyrics('');
  }, [trackId]);

  if (!expanded || !currentTrack) {
    return null;
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10100] bg-background flex flex-col [-webkit-app-region:no-drag] duration-300 fill-mode-both ${closing ? 'animate-out slide-out-to-bottom' : 'animate-in slide-in-from-bottom'}`}
    >
      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 h-16 flex items-center px-6 cursor-pointer [-webkit-app-region:no-drag]"
      >
        <ChevronDown className="w-6 h-6 text-foreground/40 hover:text-foreground transition-colors" />
      </button>

      <div className="flex-1 flex min-h-0">
        {/* Left: Player */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-neo-yellow translate-x-2 translate-y-2 border-[4px] border-border" />
            <div className="relative w-56 h-56 md:w-72 md:h-72 border-[4px] border-border overflow-hidden">
              <img
                src={currentTrack.image}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="text-center px-4 mb-6 max-w-md">
            <h2 className="font-headline font-black uppercase tracking-tighter text-xl md:text-2xl truncate">
              {currentTrack.title}
            </h2>
            <p className="text-foreground/40 font-headline font-bold uppercase tracking-widest text-xs mt-1 truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Seek bar */}
          <div className="w-full max-w-sm mb-4">
            <button
              type="button"
              className="w-full h-2 bg-border cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <div
                className="h-full bg-neo-yellow transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-neo-yellow border-[2px] border-border rounded-full"
                style={{ left: `${progress}%`, marginLeft: '-6px' }}
              />
            </button>
            <div className="flex justify-between mt-1">
              <span className="text-foreground/20 text-[10px] font-mono">
                {formatTime((progress / 100) * duration)}
              </span>
              <span className="text-foreground/20 text-[10px] font-mono">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${shuffle ? 'text-neo-yellow' : 'text-foreground/30 hover:text-foreground'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={prev}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-14 h-14 flex items-center justify-center bg-neo-yellow border-[3px] border-border text-foreground hover:bg-neo-yellow/80 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`p-2 transition-colors ${repeat !== 'off' ? 'text-neo-yellow' : 'text-foreground/30 hover:text-foreground'}`}
            >
              {repeat === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleLyrics}
              className={`p-2 transition-colors ${showLyrics ? 'text-neo-yellow' : 'text-foreground/30 hover:text-foreground'}`}
            >
              <Mic2 className="w-5 h-5" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              className="p-1 text-foreground/30 hover:text-foreground transition-colors"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 h-1 accent-neo-yellow cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Lyrics */}
        {showLyrics && (
          <div className="hidden md:flex w-[480px] flex-col">
            <div className="pl-2 pr-8 pt-8 pb-4">
              <h3 className="font-headline font-black uppercase tracking-widest text-xs text-foreground/40">
                {t('lyrics')}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto pl-2 pr-8 pb-8">
              {lyricsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-[2px] border-foreground/10 border-t-foreground rounded-full animate-spin" />
                </div>
              )}
              {!lyricsLoading && lyrics && (
                <p className="text-foreground/60 font-body text-sm leading-relaxed whitespace-pre-line">
                  {lyrics}
                </p>
              )}
              {!lyricsLoading && !lyrics && (
                <p className="text-foreground/20 font-headline uppercase tracking-widest text-xs py-12 text-center">
                  Could not load lyrics
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import {
  ChevronDown,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSongRecommendations,
  getSyncedLyrics,
  type MusicTrack,
  type SyncedLyricLine,
} from '../api';
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
    play,
  } = useMusicPlayerContext();

  const [closing, setClosing] = useState(false);
  const [lyrics, setLyrics] = useState<SyncedLyricLine[] | null>(null);
  const [recommendations, setRecommendations] = useState<MusicTrack[]>([]);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
    }, 300);
  }, [setExpanded]);

  // Fetch synced lyrics and recommendations when track changes
  const trackId = currentTrack?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on track change
  useEffect(() => {
    setLyrics(null);
    setRecommendations([]);
    if (!currentTrack) return;
    getSyncedLyrics(
      currentTrack.id,
      currentTrack.title,
      currentTrack.artist,
      duration,
    ).then(setLyrics);
    getSongRecommendations(currentTrack.id)
      .then(setRecommendations)
      .catch(() => {});
  }, [trackId]);

  // Current lyric line index based on playback time
  const currentTime = (progress / 100) * duration;
  const currentLineIndex = useMemo(() => {
    if (!lyrics) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  // Smooth animated scroll to current line
  const scrollTargetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on expand too
  useEffect(() => {
    if (currentLineIndex < 0 || !lyricsRef.current) return;
    const container = lyricsRef.current;
    const el = container.children[currentLineIndex + 1] as HTMLElement;
    if (!el) return;
    scrollTargetRef.current =
      el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;

    cancelAnimationFrame(rafRef.current);
    const animate = () => {
      const diff = scrollTargetRef.current - container.scrollTop;
      if (Math.abs(diff) < 0.5) {
        container.scrollTop = scrollTargetRef.current;
        return;
      }
      container.scrollTop += diff * 0.08;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentLineIndex, expanded]);

  if (!expanded || !currentTrack) return null;

  const hasLyrics = lyrics && lyrics.length > 0;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10100] overflow-hidden [-webkit-app-region:no-drag] duration-300 fill-mode-both ${closing ? 'animate-out slide-out-to-bottom' : 'animate-in slide-in-from-bottom'}`}
    >
      {/* Blurred album art background */}
      <div className="absolute inset-0">
        <img
          src={currentTrack.image}
          alt=""
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 h-14 flex items-center px-6 cursor-pointer"
        >
          <ChevronDown className="w-6 h-6 text-white/40 hover:text-white transition-colors" />
        </button>

        {/* Main area */}
        <div className="flex-1 flex min-h-0 px-6 pb-6 gap-8">
          {/* Left: Disc + Info + Controls */}
          <div
            className={`flex flex-col items-center justify-center ${hasLyrics ? 'w-[45%]' : 'flex-1'}`}
          >
            {/* Disc */}
            <div className="relative mb-6 w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72">
              <div
                className="w-full h-full border-[5px] overflow-hidden shadow-2xl"
                style={{
                  borderRadius: isPlaying ? '9999px' : '12px',
                  borderColor: isPlaying
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.1)',
                  animation: isPlaying
                    ? 'disc-spin 25s linear infinite'
                    : 'none',
                  transform: isPlaying ? undefined : 'rotate(0deg)',
                  transition:
                    'border-radius 0.7s ease, border-color 0.7s ease, transform 0.7s ease',
                }}
              >
                <img
                  src={currentTrack.image}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'repeating-radial-gradient(circle at center, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
                    opacity: isPlaying ? 1 : 0,
                    transition: 'opacity 0.7s ease',
                  }}
                />
              </div>
              <style>{`@keyframes disc-spin { to { transform: rotate(360deg) } }`}</style>
            </div>

            {/* Track info */}
            <div className="text-center px-4 mb-5 max-w-md w-full">
              <h2 className="font-headline font-black uppercase tracking-tighter text-lg md:text-xl text-white truncate">
                {currentTrack.title}
              </h2>
              <p className="text-white/40 font-headline font-bold uppercase tracking-widest text-[10px] mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>

            {/* Seek bar */}
            <div className="w-full max-w-xs mb-3">
              <button
                type="button"
                className="w-full h-1.5 bg-white/10 cursor-pointer relative rounded-full"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * 100);
                }}
              >
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </button>
              <div className="flex justify-between mt-1">
                <span className="text-white/30 text-[9px] font-mono">
                  {formatTime((progress / 100) * duration)}
                </span>
                <span className="text-white/30 text-[9px] font-mono">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${shuffle ? 'text-white' : 'text-white/30 hover:text-white'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={prev}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className={`p-2 transition-colors ${repeat !== 'off' ? 'text-white' : 'text-white/30 hover:text-white'}`}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 1)}
                className="p-1 text-white/30 hover:text-white transition-colors"
              >
                {volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Synced Lyrics */}
          {hasLyrics && (
            <div className="hidden md:flex flex-1 flex-col min-h-0 justify-center py-8">
              <div
                ref={lyricsRef}
                className="overflow-y-auto no-scrollbar max-h-full px-4 space-y-6"
                style={{
                  maskImage:
                    'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                }}
              >
                <div className="h-[30vh]" />
                {lyrics.map((line, i) => {
                  const dist = Math.abs(i - currentLineIndex);
                  const isCurrent = i === currentLineIndex;
                  const isPast = i < currentLineIndex;
                  return (
                    <p
                      key={line.time}
                      className="cursor-pointer font-headline uppercase tracking-tight leading-snug"
                      style={{
                        fontSize: isCurrent ? '2rem' : '1.5rem',
                        fontWeight: isCurrent ? 900 : 700,
                        color: isCurrent
                          ? '#fff'
                          : isPast
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(255,255,255,0.3)',
                        filter: isCurrent
                          ? 'none'
                          : `blur(${Math.min(dist * 0.5, 2.5)}px)`,
                        transform: isCurrent ? 'scale(1)' : 'scale(0.92)',
                        transition:
                          'font-size 0.4s ease, color 0.4s ease, filter 0.5s ease, transform 0.4s ease',
                      }}
                      onClick={() => {
                        if (duration > 0) seek((line.time / duration) * 100);
                      }}
                      onKeyDown={() => {}}
                    >
                      {line.text}
                    </p>
                  );
                })}
                <div className="h-[30vh]" />
              </div>
            </div>
          )}

          {/* Similar Songs — shown when no lyrics or on the right side */}
          {!hasLyrics && recommendations.length > 0 && (
            <div className="hidden md:flex flex-1 flex-col min-h-0 py-8 px-4 overflow-y-auto no-scrollbar">
              <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] mb-4">
                Similar Songs
              </p>
              {recommendations.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => play(song, recommendations)}
                  className="w-full flex items-center gap-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                >
                  <img
                    src={song.image}
                    alt=""
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {song.artist}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

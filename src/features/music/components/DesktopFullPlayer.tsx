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
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { MusicTrack, SyncedLyricLine } from '../api';
import type { RepeatMode } from '../engine/audio-engine';
import { formatTime } from '../utils';
import { Equalizer } from './Equalizer';
import { FullPlayerLyrics } from './FullPlayerLyrics';

/**
 * Props for the {@link DesktopFullPlayer} component.
 *
 * All playback state and callbacks are passed down from the {@link FullPlayer}
 * orchestrator so this component remains a pure presentational layer.
 */
interface DesktopFullPlayerProps {
  /** The currently playing track metadata. */
  currentTrack: MusicTrack;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Playback progress as a percentage (0–100). */
  progress: number;
  /** Total track duration in seconds. */
  duration: number;
  /** Whether shuffle mode is active. */
  shuffle: boolean;
  /** Current repeat mode (`'off'`, `'all'`, or `'one'`). */
  repeat: RepeatMode;
  /** Application-level volume (0–1). */
  volume: number;
  /** Synced lyric lines, or `null` if unavailable / still loading. */
  lyrics: SyncedLyricLine[] | null;
  /** Index of the lyric line matching the current playback position (-1 if none). */
  currentLineIndex: number;
  /** List of recommended tracks based on the current song. */
  recommendations: MusicTrack[];
  /** Whether the close-out animation is in progress. */
  closing: boolean;
  /** Ref attached to the lyrics scroll container for programmatic scrolling. */
  lyricsRef: React.RefObject<HTMLDivElement | null>;
  /** Triggers the close animation and collapses the full player. */
  onClose: () => void;
  /** Toggles play / pause. */
  onTogglePlay: () => void;
  /** Skips to the next track. */
  onNext: () => void;
  /** Skips to the previous track. */
  onPrev: () => void;
  /** Seeks to a position expressed as a percentage (0–100). */
  onSeek: (percent: number) => void;
  /** Toggles shuffle mode on/off. */
  onToggleShuffle: () => void;
  /** Cycles through repeat modes: off → all → one → off. */
  onCycleRepeat: () => void;
  /** Sets the application-level volume (0–1). */
  onSetVolume: (v: number) => void;
  /** Plays a specific track, optionally replacing the queue. */
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void;
}

/**
 * Full-screen music player for desktop / wide viewports.
 *
 * Renders a slide-up overlay with a two-column layout:
 * - **Left column**: Spinning vinyl-disc album art (morphs between rounded-square when
 *   paused and a circular spinning disc at 25 s/revolution when playing), track metadata,
 *   seek bar, playback controls (shuffle, prev, play/pause, next, repeat), and a volume slider.
 * - **Right column** (visible on `md+` breakpoints): Either a synced lyrics panel
 *   (via {@link FullPlayerLyrics}) when lyrics are available, or a "Similar Songs"
 *   recommendation list when they are not.
 *
 * The overlay respects the Electron title-bar height via `--electron-titlebar-height`
 * and disables `-webkit-app-region` drag so controls remain interactive.
 */
export function DesktopFullPlayer({
  currentTrack,
  isPlaying,
  progress,
  duration,
  shuffle,
  repeat,
  volume,
  lyrics,
  currentLineIndex,
  recommendations,
  closing,
  lyricsRef,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onSetVolume,
  onPlay,
}: DesktopFullPlayerProps) {
  const t = useTranslations('music');
  const hasLyrics = lyrics && lyrics.length > 0;
  const [showEq, setShowEq] = useState(false);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10100] overflow-hidden [-webkit-app-region:no-drag] duration-300 fill-mode-both ${closing ? 'animate-out slide-out-to-bottom' : 'animate-in slide-in-from-bottom'}`}
    >
      <div className="absolute inset-0">
        <img
          src={currentTrack.image}
          alt=""
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 h-14 flex items-center px-6 cursor-pointer"
        >
          <ChevronDown className="w-6 h-6 text-white/40 hover:text-white transition-colors" />
        </button>

        <div className="flex-1 flex min-h-0 px-6 pb-6 gap-8">
          <div
            className={`flex flex-col items-center justify-center ${hasLyrics ? 'w-[45%]' : 'flex-1'}`}
          >
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

            <div className="text-center px-4 mb-5 max-w-md w-full">
              <h2 className="font-headline font-black uppercase tracking-tighter text-lg md:text-xl text-white truncate">
                {currentTrack.title}
              </h2>
              <p className="text-white/40 font-headline font-bold uppercase tracking-widest text-[10px] mt-1 truncate">
                {currentTrack.artist}
              </p>
            </div>

            <div className="w-full max-w-xs mb-3">
              <button
                type="button"
                className="w-full h-1.5 bg-white/10 cursor-pointer relative rounded-full"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onSeek(((e.clientX - rect.left) / rect.width) * 100);
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

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={onToggleShuffle}
                className={`p-2 transition-colors ${shuffle ? 'text-white' : 'text-white/30 hover:text-white'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onPrev}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
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
                onClick={onNext}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onCycleRepeat}
                className={`p-2 transition-colors ${repeat !== 'off' ? 'text-white' : 'text-white/30 hover:text-white'}`}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => onSetVolume(volume > 0 ? 0 : 1)}
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
                onChange={(e) => onSetVolume(Number(e.target.value))}
                className="flex-1 h-1 accent-white cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setShowEq(true)}
                className="p-1 text-white/30 hover:text-white transition-colors"
                title={t('equalizer.title')}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {showEq && <Equalizer onClose={() => setShowEq(false)} />}
          </div>

          {hasLyrics && (
            <div className="hidden md:flex flex-1 flex-col min-h-0 justify-center py-8">
              <FullPlayerLyrics
                lyrics={lyrics}
                currentLineIndex={currentLineIndex}
                duration={duration}
                seek={onSeek}
                lyricsRef={lyricsRef}
                variant="desktop"
              />
            </div>
          )}

          {!hasLyrics && recommendations.length > 0 && (
            <div className="hidden md:flex flex-1 flex-col min-h-0 py-8 px-4 overflow-y-auto no-scrollbar">
              <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] mb-4">
                {t('similarSongs')}
              </p>
              {recommendations.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => onPlay(song, recommendations)}
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

'use client';

import {
  Airplay,
  ListMusic,
  Mic2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { MusicTrack, SyncedLyricLine } from '../api';
import { formatTime } from '../utils';
import { FullPlayerLyrics } from './FullPlayerLyrics';

/**
 * Props for the {@link MobileFullPlayer} component.
 *
 * All playback state and callbacks are passed down from the {@link FullPlayer}
 * orchestrator so this component remains a pure presentational layer.
 */
interface MobileFullPlayerProps {
  /** The currently playing track metadata. */
  currentTrack: MusicTrack;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Playback progress as a percentage (0–100). */
  progress: number;
  /** Total track duration in seconds. */
  duration: number;
  /** Application-level volume (0–1). */
  volume: number;
  /** The current playback queue. */
  queue: MusicTrack[];
  /** Synced lyric lines, or `null` if unavailable / still loading. */
  lyrics: SyncedLyricLine[] | null;
  /** Index of the lyric line matching the current playback position (-1 if none). */
  currentLineIndex: number;
  /** Whether the close-out animation is in progress. */
  closing: boolean;
  /** Whether the lyrics panel is currently visible. */
  showLyrics: boolean;
  /** Whether the queue panel is currently visible. */
  showQueue: boolean;
  /** Ref attached to the lyrics scroll container for programmatic scrolling. */
  lyricsRef: React.RefObject<HTMLDivElement | null>;
  /** Native system volume control (Capacitor), `null` on web. */
  systemVol: {
    volume: number | null;
    setSystemVolume: (v: number) => Promise<void>;
  } | null;
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
  /** Sets the application-level volume (0–1). */
  onSetVolume: (v: number) => void;
  /** Plays a specific track, optionally replacing the queue. */
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void;
  /** Opens the native AirPlay picker (Capacitor / WebKit). */
  onShowAirPlay: () => void;
  /** Toggles the synced lyrics overlay. */
  onToggleLyrics: () => void;
  /** Toggles the queue list overlay. */
  onToggleQueue: () => void;
}

/**
 * Full-screen music player for mobile viewports.
 *
 * Renders a slide-up overlay with three mutually exclusive content modes:
 * 1. **Album Art mode** (default) — large album artwork with track title and artist.
 * 2. **Lyrics mode** — compact header + scrollable synced lyrics via {@link FullPlayerLyrics}.
 * 3. **Queue mode** — scrollable list of upcoming tracks in the playback queue.
 *
 * The bottom control strip (seek bar, play/pause/skip, volume slider, and
 * lyrics/AirPlay/queue toggles) is always visible regardless of the active mode.
 *
 * Supports swipe-down-to-dismiss via touch event tracking with a 120 px threshold.
 * Respects iOS safe-area insets for notch and home-indicator spacing.
 */
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
  systemVol,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onSetVolume,
  onPlay,
  onShowAirPlay,
  onToggleLyrics,
  onToggleQueue,
}: MobileFullPlayerProps) {
  const swipeStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

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

      <div className="relative z-10 flex flex-col h-full px-6">
        {/* Drag handle + close */}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 flex justify-center pt-3 pb-2"
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </button>

        {showQueue ? (
          /* ===== QUEUE MODE ===== */
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="shrink-0 text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] pb-2">
              Queue — {queue.length}
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {queue.map((track, i) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onPlay(track, queue)}
                  className={`w-full flex items-center gap-3 py-2 text-left ${currentTrack?.id === track.id ? 'text-white' : 'text-white/60'}`}
                >
                  <span className="w-5 text-white/20 text-[10px] font-mono text-right shrink-0">
                    {i + 1}
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
        ) : showLyrics && hasLyrics ? (
          /* ===== LYRICS MODE ===== */
          <>
            {/* Compact header: small art + title */}
            <div className="shrink-0 flex items-center gap-3 pb-4">
              <img
                src={currentTrack.image}
                alt=""
                className="w-14 h-14 rounded-lg object-cover"
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

            {/* Lyrics area */}
            <div className="flex-1 min-h-0 relative">
              <FullPlayerLyrics
                lyrics={lyrics}
                currentLineIndex={currentLineIndex}
                duration={duration}
                seek={onSeek}
                lyricsRef={lyricsRef}
                variant="mobile"
              />
              {/* Karaoke toggle */}
              <button
                type="button"
                onClick={onToggleLyrics}
                className="absolute bottom-2 right-2 p-2.5 rounded-full bg-white/10 text-white/60"
              >
                <Mic2 className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          /* ===== ALBUM ART MODE ===== */
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="w-[70vw] max-w-[320px] aspect-square mb-8">
              <img
                src={currentTrack.image}
                alt={currentTrack.title}
                className="w-full h-full object-cover rounded-2xl shadow-2xl"
              />
            </div>
            <div className="w-full text-left mb-1">
              <h2 className="text-white font-bold text-xl truncate">
                {currentTrack.title}
              </h2>
              <p className="text-white/50 text-sm truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>
        )}

        {/* ===== BOTTOM CONTROLS (always visible) ===== */}
        <div className="shrink-0 pb-2">
          {/* Seek bar */}
          <div className="w-full mb-1">
            <button
              type="button"
              className="w-full py-2 cursor-pointer relative"
              onClick={(e) => {
                const bar = e.currentTarget.querySelector(
                  '[data-seekbar]',
                ) as HTMLElement;
                if (!bar) return;
                const rect = bar.getBoundingClientRect();
                onSeek(
                  Math.max(
                    0,
                    Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
                  ),
                );
              }}
            >
              <div
                data-seekbar
                className="w-full h-1.5 bg-white/15 rounded-full relative"
              >
                <div
                  className="h-full bg-white/80 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
            <div className="flex justify-between mt-1">
              <span className="text-white/40 text-[10px] font-mono">
                {formatTime(currentTime)}
              </span>
              <span className="text-white/40 text-[10px] font-mono">
                -{formatTime(Math.max(0, duration - currentTime))}
              </span>
            </div>
          </div>

          {/* Play controls */}
          <div className="flex items-center justify-center gap-10 my-4">
            <button type="button" onClick={onPrev} className="text-white">
              <SkipBack className="w-8 h-8 fill-current" />
            </button>
            <button type="button" onClick={onTogglePlay} className="text-white">
              {isPlaying ? (
                <Pause className="w-12 h-12 fill-current" />
              ) : (
                <Play className="w-12 h-12 fill-current ml-1" />
              )}
            </button>
            <button type="button" onClick={onNext} className="text-white">
              <SkipForward className="w-8 h-8 fill-current" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 mb-4">
            <Volume1 className="w-3.5 h-3.5 text-white/30" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={systemVol?.volume ?? volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (systemVol) {
                  systemVol.setSystemVolume(v);
                } else {
                  onSetVolume(v);
                }
              }}
              className="flex-1 h-1 accent-white cursor-pointer"
            />
            <Volume2 className="w-3.5 h-3.5 text-white/30" />
          </div>

          {/* Bottom bar: lyrics / airplay / queue */}
          <div className="flex items-center justify-around pb-2">
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
              onClick={onShowAirPlay}
              className="p-2.5 text-white/50"
            >
              <Airplay className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onToggleQueue}
              className={`p-2.5 rounded-full transition-colors ${showQueue ? 'bg-white/20 text-white' : 'text-white/50'}`}
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

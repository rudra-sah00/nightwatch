'use client';

import {
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  useMusicPlaybackProgress,
  useMusicPlayerContext,
} from '../context/MusicPlayerContext';
import { useMusicShortcuts } from '../hooks/use-music-shortcuts';
import { MusicDevicePicker } from './MusicDevicePicker';
import { showSongMenu } from './SongContextMenu';

/**
 * Sticky bottom-bar mini player shown on `/music` pages when a track is loaded.
 *
 * Renders a compact control strip with:
 * - A thin progress bar along the top edge (clickable to seek).
 * - Album art thumbnail and track info (clickable to expand the full player).
 * - Playback controls: previous, play/pause, next, stop.
 * - Volume mute toggle and slider (desktop only).
 * - A queue toggle button that reveals a collapsible queue panel below the bar.
 *
 * The queue panel lists all tracks with right-click support via the
 * {@link showSongMenu} event bus for context-menu actions (add to playlist, etc.).
 *
 * Keyboard shortcuts are registered via the `useMusicShortcuts` hook.
 * Renders `null` when no track is loaded.
 */
export function MiniPlayer() {
  const player = useMusicPlayerContext();
  const { progress } = useMusicPlaybackProgress();
  const t = useTranslations('music');
  const mobile = useIsMobile();
  useMusicShortcuts();

  const {
    currentTrack,
    isPlaying,
    queue,
    togglePlay,
    next,
    prev,
    seek,
    stop,
    setExpanded,
    volume,
    setVolume,
    isRemoteControlling,
    remoteTrack,
    remoteIsPlaying,
    remoteProgress,
    remoteDuration,
    remoteQueue,
    removeFromQueue,
  } = player;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // Clear long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (displayTrack) {
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => {},
        } as unknown as React.MouseEvent;
        displayTrack && showSongMenu(syntheticEvent, displayTrack);
      }
    }, 500);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const [showQueue, setShowQueue] = useState(false);

  // Show MiniPlayer if local track OR remote controlling
  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;
  const displayQueue = isRemoteControlling ? remoteQueue : queue;

  // Interpolate remote progress locally for smooth bar animation
  const [interpolatedSeconds, setInterpolatedSeconds] = useState(0);
  const interpolateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRemoteControlling || remoteDuration <= 0) {
      setInterpolatedSeconds(0);
      return;
    }
    // remoteProgress is a percentage (0-100), convert to seconds
    setInterpolatedSeconds((remoteProgress / 100) * remoteDuration);
  }, [remoteProgress, remoteDuration, isRemoteControlling]);

  useEffect(() => {
    if (interpolateRef.current) {
      clearInterval(interpolateRef.current);
      interpolateRef.current = null;
    }
    if (!isRemoteControlling || !remoteIsPlaying || remoteDuration <= 0) return;
    interpolateRef.current = setInterval(() => {
      setInterpolatedSeconds((s) => Math.min(s + 1, remoteDuration));
    }, 1000);
    return () => {
      if (interpolateRef.current) clearInterval(interpolateRef.current);
    };
  }, [isRemoteControlling, remoteIsPlaying, remoteDuration]);

  const displayProgress = isRemoteControlling
    ? remoteDuration > 0
      ? (interpolatedSeconds / remoteDuration) * 100
      : 0
    : progress;

  if (!displayTrack) return null;

  return (
    <div className="sticky bottom-0 z-10 bg-card">
      {/* Progress bar */}
      <button
        type="button"
        className="absolute top-0 left-0 right-0 h-1 bg-border cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = ((e.clientX - rect.left) / rect.width) * 100;
          if (isRemoteControlling) {
            setInterpolatedSeconds((percent / 100) * remoteDuration);
            window.dispatchEvent(
              new CustomEvent('music:remote-command', {
                detail: { command: 'seek', value: percent },
              }),
            );
          } else {
            seek(percent);
          }
        }}
      >
        <div
          className="h-full bg-neo-yellow transition-all duration-200"
          style={{ width: `${displayProgress}%` }}
        />
      </button>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Cover */}
        <button
          type="button"
          onClick={() => {
            if (!longPressTriggered.current) setExpanded(true);
          }}
          onContextMenu={(e) => displayTrack && showSongMenu(e, displayTrack)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          className="flex-shrink-0"
        >
          <div className="w-11 h-11 border-[2px] border-border overflow-hidden">
            <img
              src={displayTrack.image}
              alt={displayTrack.title}
              className="w-full h-full object-cover"
            />
          </div>
        </button>

        {/* Info */}
        <button
          type="button"
          onClick={() => {
            if (!longPressTriggered.current) setExpanded(true);
          }}
          onContextMenu={(e) => displayTrack && showSongMenu(e, displayTrack)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          className="flex-1 min-w-0 text-left"
        >
          <p className="font-headline font-bold text-xs uppercase tracking-wider truncate">
            {displayTrack.title}
          </p>
          <p className="text-foreground/40 text-[10px] font-headline uppercase tracking-wider truncate">
            {displayTrack.artist}
          </p>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (isRemoteControlling) {
                window.dispatchEvent(
                  new CustomEvent('music:remote-command', { detail: 'prev' }),
                );
              } else {
                prev();
              }
            }}
            className="p-1.5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isRemoteControlling) {
                window.dispatchEvent(
                  new CustomEvent('music:remote-command', {
                    detail: 'toggle_play',
                  }),
                );
              } else {
                togglePlay();
              }
            }}
            className="w-8 h-8 flex items-center justify-center bg-neo-yellow border-[2px] border-border text-foreground"
          >
            {displayPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isRemoteControlling) {
                window.dispatchEvent(
                  new CustomEvent('music:remote-command', { detail: 'next' }),
                );
              } else {
                next();
              }
            }}
            className="p-1.5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isRemoteControlling) {
                window.dispatchEvent(new CustomEvent('music:reclaim-playback'));
              } else {
                stop();
              }
            }}
            className="p-1.5 text-foreground/20 hover:text-foreground transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
          {!mobile && (
            <>
              <button
                type="button"
                onClick={() => {
                  const v = volume > 0 ? 0 : 1;
                  setVolume(v);
                  if (isRemoteControlling) {
                    window.dispatchEvent(
                      new CustomEvent('music:remote-command', {
                        detail: { command: 'volume', value: v },
                      }),
                    );
                  }
                }}
                className="p-1.5 text-foreground/20 hover:text-foreground transition-colors"
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
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (isRemoteControlling) {
                    window.dispatchEvent(
                      new CustomEvent('music:remote-command', {
                        detail: { command: 'volume', value: v },
                      }),
                    );
                  }
                }}
                className="w-16 h-1 accent-neo-yellow cursor-pointer"
              />
            </>
          )}
          <MusicDevicePicker />
          <button
            type="button"
            onClick={() => setShowQueue((v) => !v)}
            className={`p-1.5 transition-colors ${showQueue ? 'text-neo-yellow' : 'text-foreground/20 hover:text-foreground'}`}
            title={t('queueTitle')}
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue panel */}
      {showQueue && displayQueue.length > 0 && (
        <div className="border-t-[2px] border-border max-h-48 overflow-y-auto px-4 py-2">
          <p className="font-headline font-black uppercase tracking-widest text-[10px] text-foreground/30 mb-1">
            Queue — {displayQueue.length}
          </p>
          {displayQueue.map((track, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: queue allows duplicate track IDs, position is the identity
              key={i}
              type="button"
              onClick={() => {
                if (isRemoteControlling) {
                  window.dispatchEvent(
                    new CustomEvent('music:remote-command', {
                      detail: { command: 'play_track', value: track },
                    }),
                  );
                } else {
                  player.play(track, queue);
                }
              }}
              onContextMenu={(e) =>
                showSongMenu(
                  e,
                  track,
                  !isRemoteControlling && currentTrack?.id !== track.id
                    ? () => removeFromQueue(i)
                    : undefined,
                )
              }
              className={`w-full flex items-center gap-2 py-1.5 text-left transition-colors hover:bg-card ${displayTrack?.id === track.id ? 'text-neo-yellow' : ''}`}
            >
              <span className="w-4 text-foreground/20 text-[9px] font-mono text-right shrink-0">
                {i + 1}
              </span>
              <img
                src={track.image}
                alt=""
                className="w-6 h-6 border border-border object-cover shrink-0"
              />
              <span className="font-headline font-bold text-[10px] uppercase tracking-wider truncate flex-1">
                {track.title}
              </span>
              <span className="text-foreground/20 text-[9px] font-mono shrink-0">
                {track.artist}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

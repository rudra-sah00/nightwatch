'use client';

import {
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
import { useIsMobile } from '@/platforms/mobile/use-is-mobile';
import { useMusicShortcuts } from '../hooks/use-music-shortcuts';
import { useMusicStore } from '../store/use-music-store';
import { dispatchRemoteVolume } from '../utils';
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
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seek = useMusicStore((s) => s.seek);
  const stop = useMusicStore((s) => s.stop);
  const setExpanded = useMusicStore((s) => s.setExpanded);
  const volume = useMusicStore((s) => s.volume);
  const setVolume = useMusicStore((s) => s.setVolume);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteIsPlaying = useMusicStore((s) => s.remoteIsPlaying);
  const remoteProgress = useMusicStore((s) => s.remoteProgress);
  const remoteDuration = useMusicStore((s) => s.remoteDuration);
  const progress = useMusicStore((s) => s.progress);
  const _t = useTranslations('music');
  const mobile = useIsMobile();
  useMusicShortcuts();

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
  // Show MiniPlayer if local track OR remote controlling
  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;

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

  // Disable transition on progress reset (track change) to avoid bar animating from 99% → 0%
  const prevProgressRef = useRef(displayProgress);
  const skipTransition = displayProgress < prevProgressRef.current - 5;
  prevProgressRef.current = displayProgress;

  if (!displayTrack) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-3xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
      {/* Progress bar */}
      <button
        type="button"
        className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer rounded-t-2xl overflow-hidden"
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
          className={`h-full bg-neo-yellow ${skipTransition ? '' : 'transition-all duration-200'}`}
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
                    dispatchRemoteVolume(v);
                  }
                }}
                className="w-16 h-1 accent-neo-yellow cursor-pointer"
              />
            </>
          )}
          <MusicDevicePicker />
        </div>
      </div>
    </div>
  );
}

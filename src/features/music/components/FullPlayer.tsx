'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { getSongRecommendations, getSyncedLyrics } from '../api';
import { useNativeVolume } from '../hooks/use-native-volume';
import { useMusicStore } from '../store/use-music-store';
import { dispatchRemoteVolume } from '../utils';

const DesktopFullPlayer = dynamic(() =>
  import('./DesktopFullPlayer').then((m) => m.DesktopFullPlayer),
);
const MobileFullPlayer = dynamic(() =>
  import('./MobileFullPlayer').then((m) => m.MobileFullPlayer),
);

/**
 * Orchestrator component for the full-screen music player experience.
 *
 * Manages all shared state and side-effects consumed by both the mobile and desktop
 * full-player variants, including:
 * - Fetching synced lyrics and song recommendations on track change.
 * - Computing the active lyric line index from playback progress.
 * - Smooth-scrolling the lyrics container to the current line via `requestAnimationFrame`.
 * - Coordinating the close animation (300 ms slide-out) before unmounting.
 *
 * Delegates rendering to {@link MobileFullPlayer} or {@link DesktopFullPlayer} based on
 * the viewport width detected by `useIsMobile`. Both receive identical playback state
 * and callback props so the orchestrator remains the single source of truth.
 *
 * Renders `null` when the player is not expanded or no track is loaded.
 */
export function FullPlayer() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const shuffle = useMusicStore((s) => s.shuffle);
  const repeat = useMusicStore((s) => s.repeat);
  const expanded = useMusicStore((s) => s.expanded);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const seek = useMusicStore((s) => s.seek);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);
  const setExpanded = useMusicStore((s) => s.setExpanded);
  const volume = useMusicStore((s) => s.volume);
  const setVolume = useMusicStore((s) => s.setVolume);
  const play = useMusicStore((s) => s.play);
  const queue = useMusicStore((s) => s.queue);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteIsPlaying = useMusicStore((s) => s.remoteIsPlaying);
  const remoteProgress = useMusicStore((s) => s.remoteProgress);
  const remoteDuration = useMusicStore((s) => s.remoteDuration);
  const remoteQueue = useMusicStore((s) => s.remoteQueue);
  const progress = useMusicStore((s) => s.progress);
  const duration = useMusicStore((s) => s.duration);

  const mobile = useIsMobile();
  const nativeVol = useNativeVolume(mobile && !!expanded);
  const [closing, setClosing] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
      setShowLyrics(false);
      setShowQueue(false);
    }, 300);
  }, [setExpanded]);

  // Android hardware back button closes fullscreen player
  useEffect(() => {
    if (!expanded || !mobile) return;
    const isNative = window.Capacitor?.isNativePlatform?.();
    if (!isNative || window.Capacitor?.getPlatform?.() === 'ios') return;
    let removed = false;
    let removeListener: (() => void) | null = null;
    import('@capacitor/app').then(({ App }) => {
      if (removed) return;
      const handle = App.addListener('backButton', () => {
        (
          window as unknown as Record<string, boolean>
        ).__musicFullPlayerHandledBack = true;
        handleClose();
      });
      removeListener = () => {
        handle.then((h) => h.remove());
      };
    });
    return () => {
      removed = true;
      removeListener?.();
    };
  }, [expanded, mobile, handleClose]);

  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;
  const displayProgress = isRemoteControlling ? remoteProgress : progress;
  const displayDuration = isRemoteControlling ? remoteDuration : duration;

  const trackId = displayTrack?.id;

  const { data: lyrics = null } = useQuery({
    queryKey: ['music', 'lyrics', trackId, displayDuration],
    queryFn: () =>
      getSyncedLyrics(
        displayTrack!.id,
        displayTrack!.title,
        displayTrack!.artist,
        displayDuration,
      ),
    enabled: !!displayTrack && displayDuration > 0,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['music', 'recommendations', trackId],
    queryFn: () => getSongRecommendations(displayTrack!.id),
    enabled: !!displayTrack,
  });

  // Interpolate remote progress locally for smooth lyrics sync.
  // state_update arrives every 5s — between updates, tick progress forward 1s/s.
  const [interpolatedTime, setInterpolatedTime] = useState(0);
  const interpolateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRemoteControlling || displayDuration <= 0) {
      setInterpolatedTime(0);
      return;
    }
    // Sync to latest server value
    setInterpolatedTime((displayProgress / 100) * displayDuration);
  }, [displayProgress, displayDuration, isRemoteControlling]);

  useEffect(() => {
    if (interpolateRef.current) clearInterval(interpolateRef.current);
    if (!isRemoteControlling || !displayPlaying || displayDuration <= 0) return;
    interpolateRef.current = setInterval(() => {
      setInterpolatedTime((t) => Math.min(t + 1, displayDuration));
    }, 1000);
    return () => {
      if (interpolateRef.current) clearInterval(interpolateRef.current);
    };
  }, [isRemoteControlling, displayPlaying, displayDuration]);

  const currentTime = isRemoteControlling
    ? interpolatedTime
    : (displayProgress / 100) * displayDuration;
  const currentLineIndex = useMemo(() => {
    if (!lyrics) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  const scrollTargetRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    void expanded;
    void showLyrics; // trigger dependencies
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
      container.scrollTop += diff * 0.12;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentLineIndex, expanded, showLyrics]);

  if (!expanded || !displayTrack) {
    return null;
  }

  const handleToggleLyrics = () => {
    if (!lyrics?.length) return;
    setShowLyrics(!showLyrics);
    if (!showLyrics) setShowQueue(false);
  };

  const handleToggleQueue = () => {
    setShowQueue((v) => !v);
    if (!showQueue) setShowLyrics(false);
  };

  const handleTogglePlay = isRemoteControlling
    ? () =>
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'toggle_play' }),
        )
    : togglePlay;
  const handleNext = isRemoteControlling
    ? () =>
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'next' }),
        )
    : next;
  const handlePrev = isRemoteControlling
    ? () =>
        window.dispatchEvent(
          new CustomEvent('music:remote-command', { detail: 'prev' }),
        )
    : prev;
  const handleSeek = isRemoteControlling
    ? (percent: number) =>
        window.dispatchEvent(
          new CustomEvent('music:remote-command', {
            detail: { command: 'seek', value: percent },
          }),
        )
    : seek;
  const handleSetVolume = (v: number) => {
    if (nativeVol.isNative) {
      nativeVol.setVolume(v);
    } else {
      setVolume(v);
    }
    if (isRemoteControlling) {
      dispatchRemoteVolume(v);
    }
  };

  if (mobile) {
    return (
      <MobileFullPlayer
        currentTrack={displayTrack}
        isPlaying={displayPlaying}
        progress={displayProgress}
        duration={displayDuration}
        volume={nativeVol.isNative ? nativeVol.volume : volume}
        queue={isRemoteControlling ? remoteQueue : queue}
        lyrics={lyrics}
        currentLineIndex={currentLineIndex}
        closing={closing}
        showLyrics={showLyrics}
        showQueue={showQueue}
        lyricsRef={lyricsRef}
        onClose={handleClose}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onSetVolume={handleSetVolume}
        onPlay={
          isRemoteControlling
            ? (track) => {
                window.dispatchEvent(
                  new CustomEvent('music:remote-command', {
                    detail: { command: 'play_track', value: track },
                  }),
                );
              }
            : play
        }
        onToggleLyrics={handleToggleLyrics}
        onToggleQueue={handleToggleQueue}
      />
    );
  }

  return (
    <DesktopFullPlayer
      currentTrack={displayTrack}
      isPlaying={displayPlaying}
      progress={displayProgress}
      duration={displayDuration}
      shuffle={shuffle}
      repeat={repeat}
      volume={volume}
      lyrics={lyrics}
      currentLineIndex={currentLineIndex}
      recommendations={recommendations}
      closing={closing}
      lyricsRef={lyricsRef}
      onClose={handleClose}
      onTogglePlay={handleTogglePlay}
      onNext={handleNext}
      onPrev={handlePrev}
      onSeek={handleSeek}
      onToggleShuffle={
        isRemoteControlling
          ? () =>
              window.dispatchEvent(
                new CustomEvent('music:remote-command', {
                  detail: 'toggle_shuffle',
                }),
              )
          : toggleShuffle
      }
      onCycleRepeat={
        isRemoteControlling
          ? () =>
              window.dispatchEvent(
                new CustomEvent('music:remote-command', {
                  detail: 'cycle_repeat',
                }),
              )
          : cycleRepeat
      }
      onSetVolume={handleSetVolume}
      onPlay={
        isRemoteControlling
          ? (track) => {
              window.dispatchEvent(
                new CustomEvent('music:remote-command', {
                  detail: { command: 'play_track', value: track },
                }),
              );
            }
          : play
      }
    />
  );
}

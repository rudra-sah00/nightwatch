'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  getSongRecommendations,
  getSyncedLyrics,
  type MusicTrack,
  type SyncedLyricLine,
} from '../api';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import { DesktopFullPlayer } from './DesktopFullPlayer';
import { MobileFullPlayer } from './MobileFullPlayer';

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
    queue,
    isRemoteControlling,
    remoteTrack,
    remoteIsPlaying,
    remoteProgress,
    remoteDuration,
    remoteQueue,
  } = useMusicPlayerContext();

  const mobile = useIsMobile();
  const [closing, setClosing] = useState(false);
  const [lyrics, setLyrics] = useState<SyncedLyricLine[] | null>(null);
  const [recommendations, setRecommendations] = useState<MusicTrack[]>([]);
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

  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;
  const displayProgress = isRemoteControlling ? remoteProgress : progress;
  const displayDuration = isRemoteControlling ? remoteDuration : duration;

  const trackId = displayTrack?.id;
  const lyricsLoadedWithDuration = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on track change
  useEffect(() => {
    setLyrics(null);
    setRecommendations([]);
    setShowLyrics(false);
    setShowQueue(false);
    lyricsLoadedWithDuration.current = false;
    if (!displayTrack) return;
    getSyncedLyrics(
      displayTrack.id,
      displayTrack.title,
      displayTrack.artist,
      displayDuration,
    ).then((result) => {
      if (displayDuration > 0) lyricsLoadedWithDuration.current = true;
      setLyrics(result);
    });
    getSongRecommendations(displayTrack.id)
      .then(setRecommendations)
      .catch(() => {});
  }, [trackId]);

  // Re-fetch lyrics once duration is available (initial fetch may have used duration=0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-fetch when duration loads
  useEffect(() => {
    if (
      !displayTrack ||
      displayDuration <= 0 ||
      lyricsLoadedWithDuration.current
    )
      return;
    lyricsLoadedWithDuration.current = true;
    getSyncedLyrics(
      displayTrack.id,
      displayTrack.title,
      displayTrack.artist,
      displayDuration,
    ).then(setLyrics);
  }, [displayDuration]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on expand/lyrics toggle
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
      container.scrollTop += diff * 0.12;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentLineIndex, expanded, showLyrics]);

  if (!expanded || !displayTrack) {
    if (expanded) {
      console.warn('[FullPlayer] expanded=true but displayTrack is null', {
        isRemoteControlling,
        remoteTrack: !!remoteTrack,
        currentTrack: !!currentTrack,
      });
    }
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
    setVolume(v);
    if (isRemoteControlling) {
      window.dispatchEvent(
        new CustomEvent('music:remote-command', {
          detail: { command: 'volume', value: v },
        }),
      );
    }
  };

  if (mobile) {
    return (
      <MobileFullPlayer
        currentTrack={displayTrack}
        isPlaying={displayPlaying}
        progress={displayProgress}
        duration={displayDuration}
        volume={volume}
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
      onToggleShuffle={toggleShuffle}
      onCycleRepeat={cycleRepeat}
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

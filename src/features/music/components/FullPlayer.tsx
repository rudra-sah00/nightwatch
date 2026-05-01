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
import { useSystemVolume } from '../hooks/use-system-volume';
import { DesktopFullPlayer } from './DesktopFullPlayer';
import { MobileFullPlayer } from './MobileFullPlayer';

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
    showAirPlay,
    queue,
  } = useMusicPlayerContext();

  const mobile = useIsMobile();
  const [closing, setClosing] = useState(false);
  const [lyrics, setLyrics] = useState<SyncedLyricLine[] | null>(null);
  const [recommendations, setRecommendations] = useState<MusicTrack[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const systemVol = useSystemVolume();

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
      setShowLyrics(false);
      setShowQueue(false);
    }, 300);
  }, [setExpanded]);

  const trackId = currentTrack?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on track change
  useEffect(() => {
    setLyrics(null);
    setRecommendations([]);
    setShowLyrics(false);
    setShowQueue(false);
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
      container.scrollTop += diff * 0.08;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentLineIndex, expanded, showLyrics]);

  if (!expanded || !currentTrack) return null;

  const handleToggleLyrics = () => {
    if (!lyrics?.length) return;
    setShowLyrics(!showLyrics);
    if (!showLyrics) setShowQueue(false);
  };

  const handleToggleQueue = () => {
    setShowQueue((v) => !v);
    if (!showQueue) setShowLyrics(false);
  };

  if (mobile) {
    return (
      <MobileFullPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        queue={queue}
        lyrics={lyrics}
        currentLineIndex={currentLineIndex}
        closing={closing}
        showLyrics={showLyrics}
        showQueue={showQueue}
        lyricsRef={lyricsRef}
        systemVol={systemVol}
        onClose={handleClose}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={prev}
        onSeek={seek}
        onSetVolume={setVolume}
        onPlay={play}
        onShowAirPlay={showAirPlay}
        onToggleLyrics={handleToggleLyrics}
        onToggleQueue={handleToggleQueue}
      />
    );
  }

  return (
    <DesktopFullPlayer
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      progress={progress}
      duration={duration}
      shuffle={shuffle}
      repeat={repeat}
      volume={volume}
      lyrics={lyrics}
      currentLineIndex={currentLineIndex}
      recommendations={recommendations}
      closing={closing}
      lyricsRef={lyricsRef}
      onClose={handleClose}
      onTogglePlay={togglePlay}
      onNext={next}
      onPrev={prev}
      onSeek={seek}
      onToggleShuffle={toggleShuffle}
      onCycleRepeat={cycleRepeat}
      onSetVolume={setVolume}
      onPlay={play}
    />
  );
}

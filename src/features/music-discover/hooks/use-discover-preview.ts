import { useCallback, useEffect, useRef, useState } from 'react';
import { getStreamUrl } from '@/features/music/api';
import { trackEvent } from '@/lib/analytics';
import { AnalyticsEvents } from '@/lib/analytics-events';
import type { DiscoverSong } from '../api';

interface PreloadedAudio {
  songId: string;
  audio: HTMLAudioElement;
}

const PRELOAD_AHEAD = 3;
const PREVIEW_DURATION = 45;

export function useDiscoverPreview(
  feed: DiscoverSong[],
  currentIndex: number,
  muted: boolean,
) {
  const preloadCache = useRef<Map<string, PreloadedAudio>>(new Map());
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSong = feed[currentIndex];

  // Preload
  const preloadSongs = useCallback(
    (startIdx: number) => {
      for (
        let i = startIdx;
        i < Math.min(startIdx + PRELOAD_AHEAD, feed.length);
        i++
      ) {
        const song = feed[i];
        if (!song || preloadCache.current.has(song.id)) continue;
        const entry: PreloadedAudio = { songId: song.id, audio: new Audio() };
        preloadCache.current.set(song.id, entry);
        getStreamUrl(song.id, 96)
          .then((url) => {
            entry.audio.src = url;
            entry.audio.preload = 'auto';
            entry.audio.addEventListener(
              'loadedmetadata',
              () => {
                entry.audio.currentTime = Math.floor(song.duration * 0.33);
              },
              { once: true },
            );
            entry.audio.load();
          })
          .catch(() => {});
      }
    },
    [feed],
  );

  useEffect(() => {
    if (feed.length > 0) preloadSongs(currentIndex);
  }, [feed, currentIndex, preloadSongs]);

  const playCurrentAudio = useCallback(() => {
    if (!currentSong) return;
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current = null;
    }
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    const cached = preloadCache.current.get(currentSong.id);
    const audio = cached?.audio || new Audio();
    activeAudio.current = audio;
    audio.volume = muted ? 0 : 0.8;

    const startPlay = () => {
      audio.currentTime = Math.floor(currentSong.duration * 0.33);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          trackEvent(AnalyticsEvents.DISCOVER_PREVIEW_PLAY, {
            songId: currentSong.id,
          });
        })
        .catch(() => {});
    };

    if (cached?.audio.src) {
      startPlay();
    } else {
      getStreamUrl(currentSong.id, 96)
        .then((url) => {
          audio.src = url;
          audio.addEventListener('loadeddata', startPlay, { once: true });
          audio.load();
        })
        .catch(() => {});
    }

    fadeTimer.current = setTimeout(() => {
      let vol = audio.volume;
      const fade = setInterval(() => {
        vol -= 0.08;
        if (vol <= 0) {
          clearInterval(fade);
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.volume = vol;
        }
      }, 150);
    }, PREVIEW_DURATION * 1000);
  }, [currentSong, muted]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentSong triggers replay
  useEffect(() => {
    if (hasInteracted) playCurrentAudio();
  }, [currentSong, hasInteracted, playCurrentAudio]);

  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playCurrentAudio();
    }
  }, [hasInteracted, playCurrentAudio]);

  useEffect(() => {
    if (activeAudio.current) activeAudio.current.volume = muted ? 0 : 0.8;
  }, [muted]);

  useEffect(
    () => () => {
      for (const e of preloadCache.current.values()) {
        e.audio.pause();
        e.audio.src = '';
      }
    },
    [],
  );

  const stopCurrent = useCallback(() => {
    if (activeAudio.current) {
      activeAudio.current.pause();
      activeAudio.current = null;
      setIsPlaying(false);
    }
  }, []);

  const cleanupSong = useCallback((songId: string) => {
    const cached = preloadCache.current.get(songId);
    if (cached) {
      cached.audio.src = '';
      preloadCache.current.delete(songId);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!activeAudio.current) {
      playCurrentAudio();
      return;
    }
    if (activeAudio.current.paused) {
      activeAudio.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      activeAudio.current.pause();
      setIsPlaying(false);
    }
  }, [playCurrentAudio]);

  return {
    hasInteracted,
    isPlaying,
    handleFirstInteraction,
    stopCurrent,
    cleanupSong,
    togglePlay,
  };
}

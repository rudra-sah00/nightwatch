'use client';

import { type RefObject, useCallback, useEffect } from 'react';
import type { PlayerAction } from '../context/types';

interface UseMp4Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  manualQualities?: { quality: string; url: string }[];
}

export function useMp4({
  videoRef,
  streamUrl,
  dispatch,
  manualQualities,
}: UseMp4Options) {
  // 1. Initial Source Setup & Event Listeners
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Clear any previous errors when loading new stream
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });
    video.src = streamUrl;

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      video.play().catch((_err) => {});
    };

    const handleError = (e: Event) => {
      const _error = (e.target as HTMLVideoElement).error;
      dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.pause();
      video.removeAttribute('src'); // Better than src='' which can cause network requests
    };
  }, [streamUrl, videoRef, dispatch]);

  // 2. Separate effect to sync manual qualities when they change
  useEffect(() => {
    if (!manualQualities || manualQualities.length === 0) return;

    const formattedQualities = manualQualities.map((q) => ({
      label: q.quality,
      height: parseInt(q.quality, 10) || 0,
      bandwidth: 0,
    }));

    dispatch({ type: 'SET_QUALITIES', qualities: formattedQualities });

    // Detect if current video.src matches any of these qualities
    const video = videoRef.current;
    if (video?.src) {
      const currentSrc = video.src;
      const matchingQ = manualQualities.find((q) => {
        try {
          const decodedSrc = decodeURIComponent(currentSrc);
          return decodedSrc.includes(q.url) || currentSrc.includes(q.url);
        } catch {
          return currentSrc.includes(q.url);
        }
      });

      if (matchingQ) {
        dispatch({ type: 'SET_CURRENT_QUALITY', quality: matchingQ.quality });
      } else if (streamUrl) {
        // Fallback: check if the master streamUrl matches
        const initialQ =
          manualQualities.find((q) => streamUrl.includes(q.url))?.quality ||
          formattedQualities[0].label;
        dispatch({ type: 'SET_CURRENT_QUALITY', quality: initialQ });
      }
    }
  }, [manualQualities, streamUrl, videoRef, dispatch]);

  const setQuality = useCallback(
    (levelIndex: number) => {
      if (manualQualities?.[levelIndex] && videoRef.current) {
        const video = videoRef.current;
        const currentTime = video.currentTime;
        const wasPlaying = !video.paused;
        const newUrl = manualQualities[levelIndex].url;

        video.src = newUrl;
        video.currentTime = currentTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }

        dispatch({
          type: 'SET_CURRENT_QUALITY',
          quality: manualQualities[levelIndex].quality,
        });
      }
    },
    [manualQualities, videoRef, dispatch],
  );

  return { setQuality };
}

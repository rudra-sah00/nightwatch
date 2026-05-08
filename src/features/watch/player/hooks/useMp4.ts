'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../context/types';

/** Options for {@link useMp4}. */
interface UseMp4Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  manualQualities?: { quality: string; url: string }[];
  onStreamExpired?: () => void;
}

/**
 * Manages direct MP4 source playback (non-HLS).
 *
 * Sets the video `src`, handles `loadedmetadata` and error events,
 * syncs manual quality options to the player state, and provides a
 * `setQuality` callback for switching between quality levels.
 *
 * @returns `setQuality` callback.
 */
export function useMp4({
  videoRef,
  streamUrl,
  dispatch,
  manualQualities,
  onStreamExpired,
}: UseMp4Options) {
  // Stable ref for onStreamExpired to avoid effect re-runs on parent renders
  const onStreamExpiredRef = useRef(onStreamExpired);
  onStreamExpiredRef.current = onStreamExpired;

  // 1. Initial Source Setup & Event Listeners
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Clear any previous errors when loading new stream
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });
    video.src = streamUrl;

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_ERROR', error: null });
      dispatch({ type: 'SET_LOADING', isLoading: false });
      video.play().catch((_err) => {});
    };

    const handleError = (e: Event) => {
      const mediaError = (e.target as HTMLVideoElement).error;

      // Ignore MEDIA_ERR_SRC_NOT_SUPPORTED (4) which happens when src is set to empty during unmount
      // Ignore MEDIA_ERR_ABORTED (1) which happens on unmount or browser interruption
      if (
        !mediaError ||
        mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
        mediaError.code === MediaError.MEDIA_ERR_ABORTED
      )
        return;

      dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
      onStreamExpiredRef.current?.();
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
        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
          : null;
        const wasPlaying = !video.paused;
        const newUrl = manualQualities[levelIndex].url;

        video.src = newUrl;

        // Wait for metadata before seeking — setting currentTime before metadata is unreliable
        const onMetadata = () => {
          video.removeEventListener('loadedmetadata', onMetadata);
          if (currentTime !== null) {
            video.currentTime = currentTime;
          }
          if (wasPlaying) {
            video.play().catch(() => {});
          }
        };
        video.addEventListener('loadedmetadata', onMetadata);

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

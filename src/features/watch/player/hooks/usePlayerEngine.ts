'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useMemo, useRef } from 'react';
import type { PlayerAction } from '../context/types';
import { useHls } from './useHls';
import { useMp4 } from './useMp4';

interface UsePlayerEngineOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  onStreamExpired?: () => void;
  qualities?: { quality: string; url: string }[];
  isLive?: boolean;
}

interface UsePlayerEngineReturn {
  engineType: 'hls' | 'mp4' | 'none';
  setQuality: (levelIndex: number) => void;
  setAudioTrack: (trackId: string) => void;
  hlsRef: RefObject<HlsType | null>;
}

/**
 * Orchestrator hook that decides which playback engine to use (HLS vs Native MP4).
 * This keeps the UI code clean and decouples specific technical logic.
 */
export function usePlayerEngine({
  videoRef,
  streamUrl,
  dispatch,
  onStreamExpired,
  qualities,
  isLive = false,
}: UsePlayerEngineOptions): UsePlayerEngineReturn {
  const nullHlsRef = useRef<HlsType | null>(null);

  // Determine engine type based on stream URL
  const engineType = useMemo(() => {
    if (!streamUrl) return 'none';

    const lowerUrl = streamUrl.toLowerCase();
    if (lowerUrl.includes('.m3u8')) return 'hls';

    // Live streams are overwhelmingly HLS, even if the URL doesn't end in .m3u8
    if (isLive) return 'hls';

    if (lowerUrl.includes('.mp4')) return 'mp4';

    // Default to mp4 for streams without a clear extension
    return 'mp4';
  }, [streamUrl, isLive]);

  // Initialize HLS engine
  const hlsResult = useHls({
    videoRef,
    streamUrl: engineType === 'hls' ? streamUrl : null,
    dispatch,
    onStreamExpired,
    qualities,
    isLive,
  });

  // Initialize MP4/Native engine
  const mp4Result = useMp4({
    videoRef,
    streamUrl: engineType === 'mp4' ? streamUrl : null,
    dispatch,
    manualQualities: qualities,
    onStreamExpired,
  });

  const setQuality = useCallback(
    (levelIndex: number) => {
      if (engineType === 'hls' && hlsResult.setQuality) {
        hlsResult.setQuality(levelIndex);
      } else if (engineType === 'mp4' && mp4Result.setQuality) {
        mp4Result.setQuality(levelIndex);
      }
    },
    [engineType, hlsResult, mp4Result],
  );

  const setAudioTrack = useCallback(
    (trackId: string) => {
      if (engineType === 'hls' && hlsResult.setAudioTrack) {
        hlsResult.setAudioTrack(trackId);
      }
      // MP4 usually has embedded audio handled by the browser
    },
    [engineType, hlsResult],
  );

  return {
    engineType,
    setQuality,
    setAudioTrack,
    hlsRef: engineType === 'hls' ? hlsResult.hlsRef : nullHlsRef,
  };
}

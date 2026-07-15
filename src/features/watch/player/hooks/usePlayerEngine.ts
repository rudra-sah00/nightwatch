'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useMemo, useRef } from 'react';
import type { PlayerAction } from '../context/types';
import { useDash } from './useDash';
import { useHls } from './useHls';
import { useMp4 } from './useMp4';

interface UsePlayerEngineOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  onStreamExpired?: () => void;
  qualities?: { quality: string; url: string }[];
  isLive?: boolean;
  /** Stream format hint from the backend (avoids URL-sniffing) */
  streamFormat?: 'hls' | 'mp4' | 'dash';
}

interface UsePlayerEngineReturn {
  engineType: 'hls' | 'mp4' | 'dash' | 'none';
  setQuality: (levelIndex: number) => void;
  setAudioTrack: (trackId: string) => void;
  hlsRef: RefObject<HlsType | null>;
}

/**
 * Orchestrator hook that decides which playback engine to use (HLS vs Native MP4 vs DASH).
 * This keeps the UI code clean and decouples specific technical logic.
 */
export function usePlayerEngine({
  videoRef,
  streamUrl,
  dispatch,
  onStreamExpired,
  qualities,
  isLive = false,
  streamFormat,
}: UsePlayerEngineOptions): UsePlayerEngineReturn {
  const nullHlsRef = useRef<HlsType | null>(null);

  // Determine engine type based on backend hint or stream URL
  const engineType = useMemo(() => {
    if (!streamUrl) return 'none';

    // Prefer backend-provided format hint (most reliable)
    if (streamFormat === 'dash') return 'dash';
    if (streamFormat === 'hls') return 'hls';
    if (streamFormat === 'mp4') return 'mp4';

    // Fallback: detect from URL
    const lowerUrl = streamUrl.toLowerCase();
    if (lowerUrl.includes('.mpd') || lowerUrl.includes('playstream.mpd'))
      return 'dash';
    if (lowerUrl.includes('.m3u8')) return 'hls';

    // Live streams are overwhelmingly HLS, even if the URL doesn't end in .m3u8
    if (isLive) return 'hls';

    if (lowerUrl.includes('.mp4')) return 'mp4';

    // Default to mp4 for streams without a clear extension
    return 'mp4';
  }, [streamUrl, isLive, streamFormat]);

  // Initialize HLS engine
  const hlsResult = useHls({
    videoRef,
    streamUrl: engineType === 'hls' ? streamUrl : null,
    dispatch,
    onStreamExpired,
    qualities,
    isLive,
  });

  // Initialize DASH engine
  const dashResult = useDash({
    videoRef,
    streamUrl: engineType === 'dash' ? streamUrl : null,
    dispatch,
    onStreamExpired,
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
      } else if (engineType === 'dash' && dashResult.setQuality) {
        dashResult.setQuality(levelIndex);
      } else if (engineType === 'mp4' && mp4Result.setQuality) {
        mp4Result.setQuality(levelIndex);
      }
    },
    [engineType, hlsResult, mp4Result, dashResult],
  );

  const setAudioTrack = useCallback(
    (trackId: string) => {
      if (engineType === 'hls' && hlsResult.setAudioTrack) {
        hlsResult.setAudioTrack(trackId);
      }
      // DASH audio track switching can be added later if needed
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

'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useMemo } from 'react';
import { useServer } from '@/providers/server-provider';
import type { PlayerAction } from '../context/types';
import { useHls } from './useHls';
import { useMp4 } from './useMp4';

interface UsePlayerEngineOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  onStreamExpired?: () => void;
  qualities?: { quality: string; url: string }[];
  providerId?: 's1' | 's2' | 's3';
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
  providerId: providerIdProp,
  isLive = false,
}: UsePlayerEngineOptions): UsePlayerEngineReturn {
  const { activeServer } = useServer();

  // Determine engine type based on provider (prop or context) OR stream URL fallback
  const engineType = useMemo(() => {
    if (!streamUrl) return 'none';

    // URL extension takes priority — .m3u8 is always HLS regardless of the active
    // server preference. This prevents the 's2' (MP4) default from breaking
    // livestream watch parties where the stream is an HLS playlist.
    const lowerUrl = streamUrl.toLowerCase();
    if (lowerUrl.includes('.m3u8')) return 'hls';
    if (lowerUrl.includes('.mp4')) return 'mp4';

    // Fall back to provider preference for streams without a clear extension
    const effectiveProvider = providerIdProp || activeServer;
    if (effectiveProvider === 's2') return 'mp4';
    if (effectiveProvider === 's1') return 'hls';
    if (effectiveProvider === 's3') return 'hls';

    return 'hls';
  }, [streamUrl, providerIdProp, activeServer]);

  // Initialize HLS engine
  const hlsResult = useHls({
    videoRef,
    streamUrl: engineType === 'hls' ? streamUrl : null,
    dispatch,
    onStreamExpired,
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
    hlsRef: engineType === 'hls' ? hlsResult.hlsRef : { current: null },
  };
}

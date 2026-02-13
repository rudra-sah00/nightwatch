'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { AudioTrack, PlayerAction, Quality } from './types';

interface UseHlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  /** Called when HLS gets a 401 (token expired). Parent can refetch a fresh stream URL. */
  onStreamExpired?: () => void;
}

export function useHls({
  videoRef,
  streamUrl,
  dispatch,
  onStreamExpired,
}: UseHlsOptions) {
  const hlsRef = useRef<HlsType | null>(null);
  // Ref for callback to avoid HLS reinit when callback identity changes
  const onStreamExpiredRef = useRef(onStreamExpired);
  onStreamExpiredRef.current = onStreamExpired;

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    let cancelled = false;

    // Clear any previous errors when loading new stream
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });

    const initHls = async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false, // Performance: VOD should prefer stability over latency
          backBufferLength: 90,
          maxBufferLength: 120, // 2 minutes (matches aggressive backend prefetch)
          maxMaxBufferLength: 300, // 5 minutes max
          maxBufferSize: 200 * 1000 * 1000, // 200MB (crucial for 1080p)
          abrEwmaFastVoD: 1.0,
          abrEwmaSlowVoD: 3.0,
          manifestLoadingMaxRetry: 5,
          levelLoadingMaxRetry: 5,
          fragLoadingMaxRetry: 10,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          dispatch({ type: 'SET_LOADING', isLoading: false });

          // Extract quality levels
          const qualities: Quality[] = data.levels.map((level, index) => {
            const hasDuplicateResolution = data.levels.some(
              (l, i) => i !== index && l.height === level.height,
            );

            let label = `${level.height}p`;
            if (hasDuplicateResolution) {
              const mbps = (level.bitrate / 1000000).toFixed(1);
              label = `${level.height}p (${mbps} Mbps)`;
            }

            return {
              label,
              height: level.height,
              bandwidth: level.bitrate,
            };
          });

          dispatch({ type: 'SET_QUALITIES', qualities });

          // Extract audio tracks
          if (data.audioTracks && data.audioTracks.length > 0) {
            const audioTracks: AudioTrack[] = data.audioTracks.map(
              (track, index) => ({
                id: String(index),
                label: track.name || track.lang || `Audio ${index + 1}`,
                language: track.lang || 'unknown',
                isDefault: track.default || index === 0,
              }),
            );
            dispatch({ type: 'SET_AUDIO_TRACKS', audioTracks });

            // Set default audio track
            const defaultTrack =
              audioTracks.find((t) => t.isDefault) || audioTracks[0];
            if (defaultTrack) {
              dispatch({
                type: 'SET_CURRENT_AUDIO_TRACK',
                trackId: defaultTrack.id,
              });
            }
          }

          // Auto-play: Removed to prevent unwanted playback on rotation/resize/fullscreen
          // video.play().catch(() => {});
        });

        // Handle audio track changes from HLS
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          dispatch({
            type: 'SET_CURRENT_AUDIO_TRACK',
            trackId: String(data.id),
          });
        });

        // Handle audio tracks loading/updating
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            const audioTracks: AudioTrack[] = data.audioTracks.map(
              (track, index) => ({
                id: String(index),
                label: track.name || track.lang || `Audio ${index + 1}`,
                language: track.lang || 'unknown',
                isDefault: track.default || index === 0,
              }),
            );
            dispatch({ type: 'SET_AUDIO_TRACKS', audioTracks });
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) {
            dispatch({
              type: 'SET_CURRENT_QUALITY',
              quality: `${level.height}p`,
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          const status =
            (data.response as { code?: number } | undefined)?.code ??
            (data as { response?: { code?: number } }).response?.code;

          // 401 always means session expired — handle immediately regardless of fatal/non-fatal
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && status === 401) {
            hls.destroy();
            // If parent can refetch a fresh stream, trigger it silently
            if (onStreamExpiredRef.current) {
              dispatch({ type: 'SET_LOADING', isLoading: true });
              onStreamExpiredRef.current();
            } else {
              dispatch({
                type: 'SET_ERROR',
                error: 'Stream session expired. Please start playback again.',
              });
            }
            return;
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // All other fatal network errors — retry
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                dispatch({
                  type: 'SET_ERROR',
                  error: 'Playback error occurred',
                });
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          // video.play().catch(() => {});
        });
      }
    };

    initHls();
    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, videoRef, dispatch]);

  const setQuality = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  }, []);

  const setAudioTrack = useCallback((trackId: string) => {
    if (hlsRef.current) {
      const trackIndex = parseInt(trackId, 10);
      if (!Number.isNaN(trackIndex) && trackIndex >= 0) {
        hlsRef.current.audioTrack = trackIndex;
      }
    }
  }, []);

  return { hlsRef, setQuality, setAudioTrack };
}

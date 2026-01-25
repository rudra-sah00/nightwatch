'use client';

import Hls from 'hls.js';
import { type MutableRefObject, useCallback, useEffect, useRef } from 'react';
import type { AudioTrack, PlayerAction, Quality } from './types';

interface UseHlsOptions {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
}

export function useHls({ videoRef, streamUrl, dispatch }: UseHlsOptions) {
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    const initHls = () => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          dispatch({ type: 'SET_LOADING', isLoading: false });

          // Extract quality levels
          const qualities: Quality[] = data.levels.map((level) => ({
            label: `${level.height}p`,
            height: level.height,
            bandwidth: level.bitrate,
          }));

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
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
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

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          // video.play().catch(() => {});
        });
      }
    };

    const cleanup = initHls();
    return cleanup;
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

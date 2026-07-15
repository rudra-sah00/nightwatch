'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../context/types';

interface UseDashOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  onStreamExpired?: () => void;
}

/**
 * Manages DASH (MPEG-DASH) playback via dash.js v5.
 *
 * Similar to useHls but for .mpd manifests. dash.js handles adaptive
 * bitrate switching automatically based on network conditions.
 */
export function useDash({
  videoRef,
  streamUrl,
  dispatch,
  onStreamExpired,
}: UseDashOptions) {
  // Use generic type since dashjs is dynamically imported
  // biome-ignore lint/suspicious/noExplicitAny: dash.js MediaPlayerClass loaded dynamically
  const dashPlayerRef = useRef<any>(null);
  const onStreamExpiredRef = useRef(onStreamExpired);
  onStreamExpiredRef.current = onStreamExpired;

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    // biome-ignore lint/suspicious/noExplicitAny: dash.js MediaPlayerClass loaded dynamically
    let player: any = null;
    let destroyed = false;

    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });

    // Dynamic import to avoid SSR issues and reduce initial bundle size
    import('dashjs')
      .then((dashjs) => {
        if (destroyed || !videoRef.current) return;

        player = dashjs.MediaPlayer().create();
        dashPlayerRef.current = player;

        // Configure for optimal playback
        player.updateSettings({
          streaming: {
            buffer: {
              fastSwitchEnabled: true,
              stableBufferTime: 20,
              bufferTimeAtTopQuality: 30,
            },
            abr: {
              autoSwitchBitrate: { video: true, audio: true },
            },
          },
        });

        player.initialize(video, streamUrl, true);

        // Handle stream initialized — report available qualities
        player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (destroyed) return;
          dispatch({ type: 'SET_LOADING', isLoading: false });

          // Extract available quality levels from the DASH manifest
          const representations =
            player.getRepresentationsByType('video') || [];
          if (representations.length > 0) {
            const qualities = [...representations]
              .sort(
                (a: { height: number }, b: { height: number }) =>
                  b.height - a.height,
              )
              .map((rep: { height: number; bandwidth: number }) => ({
                label: `${rep.height}p`,
                height: rep.height,
                bandwidth: rep.bandwidth,
              }));
            dispatch({ type: 'SET_QUALITIES', qualities });

            // Report initial quality
            const currentRep = player.getCurrentRepresentationForType('video');
            if (currentRep) {
              dispatch({
                type: 'SET_CURRENT_QUALITY',
                quality: `${currentRep.height}p`,
              });
            }
          }
        });

        // Handle quality change events
        player.on(
          dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED,
          (e: {
            mediaType?: string;
            newRepresentation?: { height: number };
          }) => {
            if (destroyed) return;
            if (e.mediaType === 'video' && e.newRepresentation) {
              dispatch({
                type: 'SET_CURRENT_QUALITY',
                quality: `${e.newRepresentation.height}p`,
              });
            }
          },
        );

        // Handle errors
        player.on(
          dashjs.MediaPlayer.events.ERROR,
          (e: { error?: { code?: number; message?: string } }) => {
            if (destroyed) return;
            const errorCode = e.error?.code;
            const errorMessage = e.error?.message || 'DASH playback error';

            // Download errors (27 = content, 28 = init segment) might indicate expired URLs
            if (errorCode === 27 || errorCode === 28) {
              onStreamExpiredRef.current?.();
              return;
            }

            dispatch({ type: 'SET_ERROR', error: errorMessage });
          },
        );
      })
      .catch((err) => {
        if (destroyed) return;
        dispatch({
          type: 'SET_ERROR',
          error: 'Failed to load DASH player',
        });
        console.error('[useDash] Failed to import dashjs:', err);
      });

    return () => {
      destroyed = true;
      if (player) {
        try {
          player.destroy();
        } catch {
          // Ignore cleanup errors
        }
        dashPlayerRef.current = null;
      }
    };
  }, [streamUrl, videoRef, dispatch]);

  const setQuality = useCallback(
    (levelIndex: number) => {
      const player = dashPlayerRef.current;
      if (!player) return;

      const representations = player.getRepresentationsByType('video') || [];
      // Sort descending by height to match display order
      const sorted = [...representations].sort(
        (a: { height: number }, b: { height: number }) => b.height - a.height,
      );

      if (sorted[levelIndex]) {
        const target = sorted[levelIndex] as { index: number; height: number };
        // Disable ABR and lock to specific quality
        player.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: false } },
          },
        });
        player.setRepresentationForTypeByIndex('video', target.index);
        dispatch({
          type: 'SET_CURRENT_QUALITY',
          quality: `${target.height}p`,
        });
      }
    },
    [dispatch],
  );

  return { setQuality, dashPlayerRef };
}

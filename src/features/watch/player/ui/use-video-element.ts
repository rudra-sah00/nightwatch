import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { PlayerAction } from '../context/types';

interface SubtitleTrackDef {
  id: string;
  label: string;
  language: string;
  src: string;
}

interface UseVideoElementOptions {
  dispatch: React.Dispatch<PlayerAction>;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  captionUrl?: string | null;
  subtitleTracks?: SubtitleTrackDef[];
  currentTrackId?: string | null;
  ref?: React.Ref<HTMLVideoElement>;
}

const EMPTY_SUBTITLE_TRACKS: SubtitleTrackDef[] = [];

export function useVideoElement({
  dispatch,
  onTimeUpdate,
  onDurationChange,
  captionUrl,
  subtitleTracks = EMPTY_SUBTITLE_TRACKS,
  currentTrackId,
  ref,
}: UseVideoElementOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const mergedRef = useCallback(
    (el: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
        el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      }
    },
    [ref],
  );

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handlePlay = () => dispatch({ type: 'PLAY' });
    const handlePause = () => dispatch({ type: 'PAUSE' });
    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', time: video.currentTime });
      onTimeUpdate?.(video.currentTime);
    };
    const handleDurationChange = () => {
      dispatch({ type: 'SET_DURATION', duration: video.duration });
      onDurationChange?.(video.duration);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        dispatch({
          type: 'SET_BUFFERED',
          buffered: video.buffered.end(video.buffered.length - 1),
        });
      }
    };
    const handleVolumeChange = () => {
      dispatch({ type: 'SET_VOLUME', volume: video.volume });
      if (video.muted) {
        dispatch({ type: 'MUTE' });
      } else {
        dispatch({ type: 'UNMUTE' });
      }
    };
    const handleWaiting = () => {
      dispatch({ type: 'SET_BUFFERING', isBuffering: true });
      trackEvent('video_buffer_start');
    };
    const handlePlaying = () => {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_BUFFERING', isBuffering: false });
      dispatch({ type: 'SET_ERROR', error: null });
      trackEvent('video_buffer_end');
    };
    const handleCanPlay = () => {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_ERROR', error: null });
    };
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      if (!target?.error) return;
      if (target.error.code !== MediaError.MEDIA_ERR_DECODE) return;

      /*
        Report, do not decide.

        This handler used to start a 1200 ms timer and then dispatch
        `SET_ERROR: 'Video playback error'`, which made it a second owner of "playback has
        failed" racing the engine that was already handling the same event. The engine
        nearly always lost: `hls.recoverMediaError()` rebuilds the MediaSource and needs at
        least one fragment fetch, and the `onStreamExpired` path makes a full backend
        round-trip, so both routinely exceed 1200 ms. `clearPendingError` on
        `playing`/`canplay` cancelled the toast when recovery was fast, but a reload-based
        recovery cannot be. The result was an error shown for a failure the player then
        silently recovered from — and, before the reducer fix, an unrecoverable spinner when
        `isBuffering` was still set.

        Every engine already owns this: `useHls` handles fatal MEDIA_ERROR for MSE and
        installs `nativeErrorHandler` for native HLS, `useMp4` and `useDash` have their own
        error paths. So there is nothing for this handler to add except the signal itself,
        which is worth keeping because the decode code is the `is_key_frame=0` open-GOP
        signature described in SEEKING.md.
      */
      trackEvent('video_element_decode_error', {
        mediaErrorCode: target.error.code,
        mediaErrorMessage: target.error.message,
        currentTime: Math.round(target.currentTime),
        readyState: target.readyState,
      });
    };
    const handleEnded = () => dispatch({ type: 'PAUSE' });
    const handleLoadStart = () => {};
    const handleStalled = () => {};
    const handleSuspend = () => {};
    const handleAbort = () => {};

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', () => {});
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('suspend', handleSuspend);
    video.addEventListener('abort', handleAbort);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('suspend', handleSuspend);
      video.removeEventListener('abort', handleAbort);
    };
  }, [dispatch, onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video?.textTracks) return;

    const trackId = currentTrackId;
    const textTracks = video.textTracks;

    for (let i = 0; i < textTracks.length; i++) {
      textTracks[i].mode = 'hidden';
    }

    if (trackId && trackId !== 'off') {
      // Find which index in our subtitleTracks array matches the selected ID
      const targetIndex = subtitleTracks.findIndex((t) => t.id === trackId);

      if (targetIndex !== -1 && targetIndex < textTracks.length) {
        // Direct index match — track elements render in the same order as subtitleTracks
        textTracks[targetIndex].mode = 'showing';
      } else {
        // Fallback: match by id, label, or language on the TextTrack object
        const targetTrack = subtitleTracks.find((t) => t.id === trackId);
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          if (
            track.id === trackId ||
            (targetTrack && track.label === targetTrack.label)
          ) {
            track.mode = 'showing';
            break;
          }
        }
      }
    }
  }, [currentTrackId, subtitleTracks]);

  const tracks = useMemo(() => {
    const result = [...subtitleTracks];
    if (captionUrl && !result.some((t) => t.src === captionUrl)) {
      result.push({
        id: 'fallback-captions',
        src: captionUrl,
        label: 'English',
        language: 'en',
      });
    }
    return result;
  }, [subtitleTracks, captionUrl]);

  return { mergedRef, tracks };
}

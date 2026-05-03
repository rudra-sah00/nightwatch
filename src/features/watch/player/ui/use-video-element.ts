import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  const pendingErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref],
  );

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const clearPendingError = () => {
      if (pendingErrorTimerRef.current) {
        clearTimeout(pendingErrorTimerRef.current);
        pendingErrorTimerRef.current = null;
      }
    };

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
    const handleWaiting = () =>
      dispatch({ type: 'SET_BUFFERING', isBuffering: true });
    const handlePlaying = () => {
      clearPendingError();
      dispatch({ type: 'SET_BUFFERING', isBuffering: false });
      dispatch({ type: 'SET_ERROR', error: null });
    };
    const handleCanPlay = () => {
      clearPendingError();
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_ERROR', error: null });
    };
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      if (!target?.error) return;
      if (target.error.code !== MediaError.MEDIA_ERR_DECODE) return;

      clearPendingError();
      pendingErrorTimerRef.current = setTimeout(() => {
        pendingErrorTimerRef.current = null;
        dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
      }, 1200);
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
      clearPendingError();
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
      const targetTrack = subtitleTracks.find((t) => t.id === trackId);
      let found = false;

      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (
          track.id === trackId ||
          (targetTrack && track.label === targetTrack.label) ||
          (targetTrack && track.language === targetTrack.language)
        ) {
          track.mode = 'showing';
          found = true;
          break;
        }
      }

      if (!found) {
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          if (
            targetTrack &&
            track.label.toLowerCase().includes(targetTrack.label.toLowerCase())
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

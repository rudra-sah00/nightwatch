'use client';

import type React from 'react';
import { forwardRef, memo, useEffect } from 'react';
import type { PlayerAction } from './types';

interface VideoElementProps {
  dispatch: React.Dispatch<PlayerAction>;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onClick?: () => void;
  captionUrl?: string | null;
}

// Memoized video element that should never re-render
export const VideoElement = memo(
  forwardRef<HTMLVideoElement, VideoElementProps>(function VideoElement(
    { dispatch, onTimeUpdate, onDurationChange, onClick, captionUrl },
    ref,
  ) {
    const videoRef = ref as React.MutableRefObject<HTMLVideoElement | null>;

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
      const handleWaiting = () => dispatch({ type: 'SET_BUFFERING', isBuffering: true });
      const handlePlaying = () => dispatch({ type: 'SET_BUFFERING', isBuffering: false });
      const handleCanPlay = () => dispatch({ type: 'SET_LOADING', isLoading: false });
      const handleError = () => dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
      const handleEnded = () => dispatch({ type: 'PAUSE' });

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('progress', handleProgress);
      video.addEventListener('volumechange', handleVolumeChange);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('ended', handleEnded);

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
      };
    }, [videoRef, dispatch, onTimeUpdate, onDurationChange]);

    return (
      <video
        ref={ref}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
        onClick={onClick}
      >
        {captionUrl && (
          <track
            kind="captions"
            src={captionUrl}
            label="English"
            srcLang="en"
          />
        )}
      </video>
    );
  }),
);

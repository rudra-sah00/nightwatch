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
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  currentTrackId?: string | null;
  controls?: boolean;
}

// Memoized video element that should never re-render
export const VideoElement = memo(
  forwardRef<HTMLVideoElement, VideoElementProps>(function VideoElement(
    {
      dispatch,
      onTimeUpdate,
      onDurationChange,
      onClick,
      captionUrl,
      subtitleTracks = [],
      currentTrackId,
      controls,
    },
    ref,
  ) {
    const videoRef = ref as React.RefObject<HTMLVideoElement | null>;

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
      const handleWaiting = () =>
        dispatch({ type: 'SET_BUFFERING', isBuffering: true });
      const handlePlaying = () =>
        dispatch({ type: 'SET_BUFFERING', isBuffering: false });
      const handleCanPlay = () =>
        dispatch({ type: 'SET_LOADING', isLoading: false });
      const handleError = () =>
        dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
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

    // Handle imperative subtitle switching
    useEffect(() => {
      const video = videoRef?.current;
      if (!video || !video.textTracks) return;

      const trackId = currentTrackId;
      const textTracks = video.textTracks;

      // Disable all tracks first (to ensure clean switch)
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = 'disabled';
      }

      if (trackId && trackId !== 'off') {
        let found = false;
        // Find and enable match
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          // Match by language or label (since track element id isn't always exposed on TextTrack object)
          // The <track> element's 'label' attribute maps to TextTrack.label
          // Also check srcLang for language code match
          if (
            track.label === trackId || // Exact label match (if ID used label)
            track.language === trackId || // Language code match
            subtitleTracks.find((t) => t.id === trackId)?.label === track.label // ID lookup to label
          ) {
            track.mode = 'showing';
            found = true;
            break;
          }
        }
        if (!found) {
          // Track not found
        }
      } else {
        // Subtitles turned off
      }
    }, [currentTrackId, videoRef, subtitleTracks]);

    return (
      <video
        ref={ref}
        className="w-full h-full object-contain bg-black"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        playsInline
        autoPlay
        crossOrigin="anonymous"
        onClick={onClick}
        controls={controls}
      >
        {/* Primary/Fallback Track - Statically rendered to satisfy linter */}
        <track
          kind="captions"
          src={
            (subtitleTracks.length > 0 ? subtitleTracks[0].src : null) ||
            captionUrl ||
            'data:text/vtt;base64,V0VCVlRUCgowMDowMDowMC4wMDAgLS0+IDAwOjAwOjAwLjAwMQo='
          }
          label={
            (subtitleTracks.length > 0 ? subtitleTracks[0].label : null) ||
            'English'
          }
          srcLang={
            (subtitleTracks.length > 0 ? subtitleTracks[0].language : null) ||
            'en'
          }
        />
        {/* Additional Tracks */}
        {subtitleTracks.slice(1).map((track) => {
          return (
            <track
              key={track.id}
              kind="captions"
              src={track.src}
              label={track.label}
              srcLang={track.language}
            />
          );
        })}
      </video>
    );
  }),
);

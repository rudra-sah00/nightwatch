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
      const handleError = (e: Event) => {
        // Only dispatch error if video has a source - prevents false errors during initialization
        const target = e.target as HTMLVideoElement;
        if (target?.src || target?.currentSrc) {
          dispatch({ type: 'SET_ERROR', error: 'Video playback error' });
        }
      };
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
          const targetTrack = subtitleTracks.find((t) => t.id === trackId);

          if (
            track.label === trackId || // ID is the label
            track.language === trackId || // ID is the language code
            (targetTrack && track.label === targetTrack.label) || // ID maps to this label
            (targetTrack && track.language === targetTrack.language) // ID maps to this language
          ) {
            track.mode = 'showing';
            found = true;
            break;
          }
        }

        // Fallback: if not found by exact match, try partial label match
        if (!found) {
          for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            const targetTrack = subtitleTracks.find((t) => t.id === trackId);
            if (
              targetTrack &&
              track.label
                .toLowerCase()
                .includes(targetTrack.label.toLowerCase())
            ) {
              track.mode = 'showing';
              found = true;
              break;
            }
          }
        }
      }
    }, [currentTrackId, videoRef, subtitleTracks]);

    const tracks = [...subtitleTracks];
    if (captionUrl && !tracks.some((t) => t.src === captionUrl)) {
      tracks.push({
        id: 'fallback-captions',
        src: captionUrl,
        label: 'English',
        language: 'en',
      });
    }

    return (
      <video
        ref={ref}
        className="w-full h-full bg-black"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
        }}
        playsInline
        crossOrigin="anonymous"
        onClick={onClick}
        controls={controls}
      >
        {tracks.map((track) => (
          <track
            key={track.id}
            kind="captions"
            src={track.src}
            label={track.label}
            srcLang={track.language}
          />
        ))}
        <track kind="captions" src="data:text/vtt," label="None" srcLang="en" />
      </video>
    );
  }),
);

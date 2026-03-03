'use client';

import type React from 'react';
import { memo } from 'react';
import type { PlayerAction } from '../context/types';
import { useVideoElement } from './use-video-element';

// Hoisted style constant to prevent recreation on each render (rule 5.4)
const VIDEO_STYLE = {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
} as const;

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
  ref?: React.Ref<HTMLVideoElement>;
}

// Memoized video element that should never re-render
export const VideoElement = memo(function VideoElement({
  dispatch,
  onTimeUpdate,
  onDurationChange,
  onClick,
  captionUrl,
  subtitleTracks = [],
  currentTrackId,
  controls,
  ref,
}: VideoElementProps) {
  const { mergedRef, tracks } = useVideoElement({
    dispatch,
    onTimeUpdate,
    onDurationChange,
    captionUrl,
    subtitleTracks,
    currentTrackId,
    ref,
  });

  return (
    <video
      ref={mergedRef}
      className="w-full h-full bg-black"
      style={VIDEO_STYLE}
      autoPlay
      playsInline
      crossOrigin="anonymous"
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      controls={controls}
    >
      {tracks.map((track) => (
        <track
          key={track.id}
          id={track.id}
          kind="captions"
          src={track.src}
          label={track.label}
          srcLang={track.language}
        />
      ))}
      <track kind="captions" src="data:text/vtt," label="None" srcLang="en" />
    </video>
  );
});

'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { memo } from 'react';
import type { PlayerAction } from '../context/types';
import { useVideoElement } from './use-video-element';

// Hoisted style constant to prevent recreation on each render (rule 5.4)
const VIDEO_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'contain',
};

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
  /** @deprecated No longer used — objectFit is always contain. */
  isUltrawide?: boolean;
  ref?: React.Ref<HTMLVideoElement>;
}

// Stable empty array — prevents new reference on every parent render (rule 5.4)
const EMPTY_SUBTITLE_TRACKS: VideoElementProps['subtitleTracks'] = [];

// Memoized video element that should never re-render
export const VideoElement = memo(function VideoElement({
  dispatch,
  onTimeUpdate,
  onDurationChange,
  onClick,
  captionUrl,
  subtitleTracks = EMPTY_SUBTITLE_TRACKS,
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
  const t = useTranslations('watch.player');

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
          kind="subtitles"
          src={track.src}
          label={track.label}
          srcLang={track.language}
          default={
            currentTrackId
              ? track.id === currentTrackId
              : track.id === tracks[0]?.id
          }
        />
      ))}
      <track
        kind="captions"
        src="data:text/vtt,"
        label={t('captionNone')}
        srcLang="en"
      />
    </video>
  );
});

'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { memo, useMemo } from 'react';
import type { PlayerAction } from '../context/types';
import { useVideoElement } from './use-video-element';

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
  isUltrawide?: boolean;
  ref?: React.Ref<HTMLVideoElement>;
}

const EMPTY_SUBTITLE_TRACKS: VideoElementProps['subtitleTracks'] = [];

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

  const crossOrigin = useMemo(
    () =>
      typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
        ? undefined
        : 'anonymous',
    [],
  );

  return (
    <video
      ref={mergedRef}
      className="w-full h-full bg-black"
      style={VIDEO_STYLE}
      autoPlay
      playsInline
      crossOrigin={crossOrigin}
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

'use client';

import { useRouter } from 'next/navigation';
import type {
  SubtitleTrack,
  VideoMetadata,
} from '@/features/watch/player/context/types';
import { TvPlayer } from '../components/TvPlayer';

interface TvWatchProps {
  streamUrl: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  isLive?: boolean;
  qualities?: { quality: string; url: string }[];
  subtitleTracks?: SubtitleTrack[];
  onStreamExpired?: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  /** Live clipping */
  isClipping?: boolean;
  clipDuration?: number;
  onClipStart?: () => void;
  onClipStop?: () => void;
  metadata?: VideoMetadata;
}

/**
 * TV Watch page (Solo mode) - wraps TvPlayer with navigation exit behavior.
 */
export function TvWatch({
  streamUrl,
  title,
  subtitle,
  posterUrl,
  isLive,
  qualities,
  subtitleTracks,
  onStreamExpired,
  onNextEpisode,
  onPrevEpisode,
  isClipping,
  clipDuration,
  onClipStart,
  onClipStop,
  metadata,
}: TvWatchProps) {
  const router = useRouter();

  return (
    <TvPlayer
      streamUrl={streamUrl}
      title={title}
      subtitle={subtitle}
      posterUrl={posterUrl}
      isLive={isLive}
      qualities={qualities}
      subtitleTracks={subtitleTracks}
      onStreamExpired={onStreamExpired}
      onNextEpisode={onNextEpisode}
      onPrevEpisode={onPrevEpisode}
      onExit={() => router.back()}
      isClipping={isClipping}
      clipDuration={clipDuration}
      onClipStart={onClipStart}
      onClipStop={onClipStop}
      metadata={metadata}
    />
  );
}

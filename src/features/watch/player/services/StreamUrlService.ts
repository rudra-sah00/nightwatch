/**
 * StreamUrlService — Handles HLS token injection, URL normalization, and response processing.
 */

import { normalizeWatchUrls } from '@/features/watch/utils';
import type { PlayResponse } from '@/types/content';

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
}

export interface QualityOption {
  quality: string;
  url: string;
}

interface NormalizedUrls {
  streamUrl: string | null;
  captionUrl: string | null;
  spriteVtt: string | undefined;
  qualities: QualityOption[] | undefined;
  subtitleTracks: SubtitleTrack[] | undefined;
  apiDurationSeconds?: number;
}

/**
 * Normalizes a set of raw URLs using an extracted token.
 */
export function normalizeRawUrls(
  raw: {
    streamUrl: string | null;
    captionUrl: string | null;
    spriteVtt?: string;
    qualities?: QualityOption[];
    subtitleTracks?: SubtitleTrack[];
  },
  token: string | null,
): NormalizedUrls {
  const effectiveStreamUrl = raw.streamUrl || (raw.qualities?.[0]?.url ?? null);

  if (!token) {
    return {
      streamUrl: effectiveStreamUrl,
      captionUrl: raw.captionUrl,
      spriteVtt: raw.spriteVtt,
      qualities: raw.qualities,
      subtitleTracks: raw.subtitleTracks,
    };
  }

  const normalized = normalizeWatchUrls(
    {
      streamUrl: effectiveStreamUrl,
      captionUrl: raw.captionUrl,
      spriteVtt: raw.spriteVtt,
      qualities: raw.qualities,
      subtitleTracks: raw.subtitleTracks,
    },
    token,
  );

  return {
    streamUrl: normalized.streamUrl,
    captionUrl: normalized.captionUrl ?? null,
    spriteVtt: normalized.spriteVtt,
    qualities: normalized.qualities,
    subtitleTracks: undefined,
  };
}

/**
 * Processes a direct MP4/stream PlayResponse (no proxy wrapping needed).
 */
function processDirectResponse(response: PlayResponse): NormalizedUrls {
  if (!response.success || !response.masterPlaylistUrl) {
    throw new Error('Invalid play response');
  }

  return {
    streamUrl: response.masterPlaylistUrl,
    captionUrl: response.captionSrt ?? null,
    spriteVtt: response.spriteVtt,
    subtitleTracks: response.subtitleTracks?.map((t, i) => ({
      id: t.language ? `${t.language}-${i}` : `track-${i}`,
      label: t.label,
      language: t.language,
      src: t.url,
    })),
    qualities: response.qualities,
    apiDurationSeconds: response.durationSeconds || undefined,
  };
}

/**
 * Unified processor for any server response.
 */
export function processResponse(response: PlayResponse): NormalizedUrls {
  return processDirectResponse(response);
}

/**
 * Processes only subtitles from a PlayResponse.
 */
export function processSubtitles(
  response: PlayResponse,
): Partial<NormalizedUrls> {
  if (!response.success) return {};

  return {
    captionUrl: response.captionSrt ?? null,
    subtitleTracks: response.subtitleTracks?.map((t, i) => ({
      id: t.language ? `${t.language}-${i}` : `track-${i}`,
      label: t.label,
      language: t.language,
      src: t.url,
    })),
  };
}

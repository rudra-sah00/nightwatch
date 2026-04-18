/**
 * StreamUrlService — Handles HLS token injection, URL normalization, and response processing.
 */

import {
  extractTokenFromUrl,
  normalizeWatchUrls,
} from '@/features/watch/utils';
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
 * Generic HLS response processor (S1, S3).
 */
function processHlsResponse(
  response: PlayResponse,
  serverId: string,
): NormalizedUrls {
  if (!response.success || !response.masterPlaylistUrl) {
    throw new Error(`Invalid ${serverId} response`);
  }

  const token = extractTokenFromUrl(response.masterPlaylistUrl) || '';

  const normalized = normalizeWatchUrls(
    {
      streamUrl: response.masterPlaylistUrl,
      captionUrl: response.captionSrt,
      spriteVtt: response.spriteVtt,
      subtitleTracks: response.subtitleTracks?.map((t, i) => ({
        id: t.language ? `${t.language}-${i}` : `track-${i}`,
        label: t.label,
        language: t.language,
        src: t.url,
      })),
      qualities: response.qualities,
    },
    token,
  );

  return {
    streamUrl: normalized.streamUrl,
    captionUrl: normalized.captionUrl ?? null,
    spriteVtt: normalized.spriteVtt,
    subtitleTracks: normalized.subtitleTracks,
    qualities: normalized.qualities,
  };
}

/**
 * Processes a Server 1 (VidSrc / HLS) PlayResponse.
 */
function processS1Response(response: PlayResponse): NormalizedUrls {
  return processHlsResponse(response, 'S1');
}

/**
 * Processes a Server 3 (VidSrc.plus / HLS) PlayResponse.
 */
function processS3Response(response: PlayResponse): NormalizedUrls {
  return processHlsResponse(response, 'S3');
}

/**
 * Processes a Server 2 (SuperEmbed / MP4) PlayResponse.
 */
function processS2Response(response: PlayResponse): NormalizedUrls {
  if (!response.success || !response.masterPlaylistUrl) {
    throw new Error('Invalid S2 response');
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
export function processResponse(
  server: 's1' | 's2' | 's3',
  response: PlayResponse,
): NormalizedUrls {
  switch (server) {
    case 's3':
      return processS3Response(response);
    case 's2':
      return processS2Response(response);
    default:
      return processS1Response(response);
  }
}

/**
 * Processes only subtitles from an S2 PlayResponse.
 */
export function processS2Subtitles(
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

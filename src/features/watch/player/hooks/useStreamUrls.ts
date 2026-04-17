'use client';

import {
  normalizeRawUrls,
  processResponse,
  processS2Subtitles,
} from '../services/StreamUrlService';

/**
 * useStreamUrls — Unified stream URL management for all servers (S1, S2, S3).
 *
 * This hook manages the shared state for the video player (streamUrl, captions, etc.)
 * and delegates server-specific normalization logic to the StreamUrlService.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractTokenFromUrl } from '@/features/watch/utils';
import type { PlayResponse } from '@/types/content';
import type {
  QualityOption,
  SubtitleTrack,
} from '../services/StreamUrlService';

interface UseStreamUrlsProps {
  /** Raw HLS master URL from the route (before token injection). */
  initialStreamUrlRaw: string | null;
  /** Raw caption SRT URL from the route. */
  initialCaptionUrlRaw: string | null;
  /** Raw sprite VTT URL from the route. */
  initialSpriteVttRaw: string | undefined;
  /** Raw quality list from the route. */
  initialQualitiesRaw: QualityOption[] | undefined;
}

interface StreamUrlsReturn {
  streamUrl: string | null;
  setStreamUrl: (url: string | null) => void;
  captionUrl: string | null;
  spriteVtt: string | undefined;
  qualities: QualityOption[] | undefined;
  subtitleTracks: SubtitleTrack[] | undefined;
  apiDurationSeconds: number | undefined;
  applyResponse: (server: 's1' | 's2' | 's3', response: PlayResponse) => void;
  applyS2Subtitles: (response: PlayResponse) => void;
}

export function useStreamUrls({
  initialStreamUrlRaw,
  initialCaptionUrlRaw,
  initialSpriteVttRaw,
  initialQualitiesRaw,
}: UseStreamUrlsProps): StreamUrlsReturn {
  const streamToken = useMemo(
    () => extractTokenFromUrl(initialStreamUrlRaw),
    [initialStreamUrlRaw],
  );

  // Initial normalized state
  const initial = useMemo(
    () =>
      normalizeRawUrls(
        {
          streamUrl: initialStreamUrlRaw,
          captionUrl: initialCaptionUrlRaw,
          spriteVtt: initialSpriteVttRaw,
          qualities: initialQualitiesRaw,
        },
        streamToken,
      ),
    [
      initialStreamUrlRaw,
      initialCaptionUrlRaw,
      initialSpriteVttRaw,
      initialQualitiesRaw,
      streamToken,
    ],
  );

  const [streamUrl, setStreamUrl] = useState<string | null>(initial.streamUrl);
  const [captionUrl, setCaptionUrl] = useState<string | null>(
    initial.captionUrl,
  );
  const [spriteVtt, setSpriteVtt] = useState<string | undefined>(
    initial.spriteVtt,
  );
  const [qualities, setQualities] = useState<QualityOption[] | undefined>(
    initial.qualities,
  );
  const [subtitleTracks, setSubtitleTracks] = useState<
    SubtitleTrack[] | undefined
  >(undefined);
  const [apiDurationSeconds, setApiDurationSeconds] = useState<
    number | undefined
  >(undefined);

  const subtitleTracksRef = useRef(subtitleTracks);
  subtitleTracksRef.current = subtitleTracks;

  // Sync effect for soft navigation
  useEffect(() => {
    const token = extractTokenFromUrl(initialStreamUrlRaw);
    if (!initialStreamUrlRaw) return;

    const normalized = normalizeRawUrls(
      {
        streamUrl: initialStreamUrlRaw,
        captionUrl: initialCaptionUrlRaw,
        spriteVtt: initialSpriteVttRaw,
        qualities: initialQualitiesRaw,
      },
      token,
    );

    setStreamUrl(normalized.streamUrl);
    if (normalized.captionUrl) setCaptionUrl(normalized.captionUrl);
    if (normalized.spriteVtt) setSpriteVtt(normalized.spriteVtt);
    if (normalized.qualities) setQualities(normalized.qualities);
  }, [
    initialStreamUrlRaw,
    initialCaptionUrlRaw,
    initialSpriteVttRaw,
    initialQualitiesRaw,
  ]);

  const applyResponse = useCallback(
    (server: 's1' | 's2' | 's3', response: PlayResponse) => {
      try {
        const normalized = processResponse(server, response);
        setStreamUrl(normalized.streamUrl);
        setCaptionUrl(normalized.captionUrl);
        setSpriteVtt(normalized.spriteVtt);
        setSubtitleTracks(normalized.subtitleTracks);
        setQualities(normalized.qualities);
        setApiDurationSeconds(normalized.apiDurationSeconds);
      } catch (_e) {}
    },
    [],
  );

  const applyS2Subtitles = useCallback((response: PlayResponse) => {
    const normalized = processS2Subtitles(response);
    if (normalized.captionUrl !== undefined)
      setCaptionUrl(normalized.captionUrl);
    if (normalized.subtitleTracks) setSubtitleTracks(normalized.subtitleTracks);
  }, []);

  return {
    streamUrl,
    setStreamUrl,
    captionUrl,
    spriteVtt,
    qualities,
    subtitleTracks,
    apiDurationSeconds,
    applyResponse,
    applyS2Subtitles,
  };
}

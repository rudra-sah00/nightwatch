/**
 * useS1StreamUrls — Server 1 (VidSrc / HLS CDN) stream URL management.
 *
 * Why a separate hook?
 * -------------------
 * Server 1 streams every URL segment through a backend CDN proxy that embeds a
 * short-lived auth token in the path:
 *   /api/stream/hls/TOKEN/MOVIE_ID/…
 *   /api/stream/cdn/TOKEN/BASE64_URL
 *
 * All S1 URLs (master playlist, captions, sprites, qualities, subtitle tracks)
 * must have the same token injected before the player tries to load them.
 * This is pure S1 infra detail — S2 serves direct MP4s with no tokens.
 *
 * Responsibilities
 * ----------------
 * 1. Initial state: normalise URLs from URL params using the embedded token.
 * 2. Sync effect: re-normalise on soft navigation (next-episode URL push).
 * 3. applyResponse(): normalise a fresh PlayResponse and update all URL state.
 * 4. setStreamUrl(): escape hatch so S2 can overwrite streamUrl in place.
 *
 * S2 notes
 * --------
 * page.tsx uses the state returned here for BOTH servers, but only calls
 * `applyResponse` for S1 responses.  For S2, the page calls `setStreamUrl`
 * directly — S2 URLs are absolute and require no token injection.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlayResponse } from '@/features/search/types';
import {
  extractTokenFromUrl,
  normalizeWatchUrls,
} from '@/features/watch/utils';

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

interface UseS1StreamUrlsProps {
  /** Raw HLS master URL from the route (before token injection). */
  initialStreamUrlRaw: string | null;
  /** Raw caption SRT URL from the route. */
  initialCaptionUrlRaw: string | null;
  /** Raw sprite VTT URL from the route. */
  initialSpriteVttRaw: string | undefined;
  /** Raw quality list from the route. */
  initialQualitiesRaw: QualityOption[] | undefined;
}

export interface S1StreamUrlsReturn {
  /** Token-injected stream URL ready for the HLS player. */
  streamUrl: string | null;
  /** Override stream URL (used by S2 to swap in a direct MP4 URL). */
  setStreamUrl: (url: string | null) => void;
  captionUrl: string | null;
  spriteVtt: string | undefined;
  qualities: QualityOption[] | undefined;
  subtitleTracks: SubtitleTrack[] | undefined;
  /** Provider-sourced duration in seconds from the S2 play response (fallback for Infinity video.duration). */
  apiDurationSeconds: number | undefined;
  /**
   * Apply a fresh S1 PlayResponse: extracts the new CDN token, runs all URLs
   * through normalizeWatchUrls, and updates state.
   *
   * ONLY call this for S1 responses — S2 URLs must be set directly via
   * setStreamUrl because wrapInProxy() with an empty token would corrupt them.
   */
  applyResponse: (response: PlayResponse) => void;
  /**
   * Apply a fresh S2 PlayResponse: sets stream URL, caption, and subtitle tracks
   * directly WITHOUT token injection (S2 serves absolute proxy URLs).
   *
   * Use this instead of applyResponse() for all Server 2 responses.
   * NOTE: also changes streamUrl — do NOT call from onDiscovered (use applyS2Subtitles instead).
   */
  applyS2Response: (response: PlayResponse) => void;
  /**
   * Subtitle-only variant of applyS2Response.
   * Applies caption URL and subtitle tracks from an S2 response WITHOUT
   * touching streamUrl — safe to call from the audio-discovery path so the
   * video is not needlessly reloaded with a new CDN token.
   */
  applyS2Subtitles: (response: PlayResponse) => void;
}

export function useS1StreamUrls({
  initialStreamUrlRaw,
  initialCaptionUrlRaw,
  initialSpriteVttRaw,
  initialQualitiesRaw,
}: UseS1StreamUrlsProps): S1StreamUrlsReturn {
  // Extract the S1 CDN token embedded in the initial HLS URL.
  const streamToken = useMemo(
    () => extractTokenFromUrl(initialStreamUrlRaw),
    [initialStreamUrlRaw],
  );

  // ── Initial state: normalise using the token from URL params ──────────────

  const [streamUrl, setStreamUrl] = useState<string | null>(() => {
    if (!initialStreamUrlRaw || !streamToken) return initialStreamUrlRaw;
    return normalizeWatchUrls({ streamUrl: initialStreamUrlRaw }, streamToken)
      .streamUrl;
  });

  const [captionUrl, setCaptionUrl] = useState<string | null>(() => {
    if (!initialCaptionUrlRaw || !streamToken) return initialCaptionUrlRaw;
    return (
      normalizeWatchUrls(
        { streamUrl: null, captionUrl: initialCaptionUrlRaw },
        streamToken,
      ).captionUrl ?? null
    );
  });

  const [spriteVtt, setSpriteVtt] = useState<string | undefined>(() => {
    if (!initialSpriteVttRaw || !streamToken) return initialSpriteVttRaw;
    return normalizeWatchUrls(
      { streamUrl: null, spriteVtt: initialSpriteVttRaw },
      streamToken,
    ).spriteVtt;
  });

  const [qualities, setQualities] = useState<QualityOption[] | undefined>(
    () => {
      if (!initialQualitiesRaw || !streamToken) return initialQualitiesRaw;
      return normalizeWatchUrls(
        { streamUrl: null, qualities: initialQualitiesRaw },
        streamToken,
      ).qualities;
    },
  );

  const [subtitleTracks, setSubtitleTracks] = useState<
    SubtitleTrack[] | undefined
  >(undefined);

  const [apiDurationSeconds, setApiDurationSeconds] = useState<
    number | undefined
  >(undefined);

  // ── Sync effect: re-normalise when route params change (soft navigation) ──
  // Triggered by next-episode pushes where the page does NOT remount.

  useEffect(() => {
    const token = extractTokenFromUrl(initialStreamUrlRaw);
    if (!initialStreamUrlRaw) return;

    const normalized = normalizeWatchUrls(
      {
        streamUrl: initialStreamUrlRaw,
        captionUrl: initialCaptionUrlRaw,
        spriteVtt: initialSpriteVttRaw,
        qualities: initialQualitiesRaw,
        subtitleTracks,
      },
      token || '',
    );

    if (normalized.streamUrl) setStreamUrl(normalized.streamUrl);
    if (normalized.captionUrl) setCaptionUrl(normalized.captionUrl);
    if (normalized.spriteVtt) setSpriteVtt(normalized.spriteVtt);
    if (normalized.subtitleTracks) setSubtitleTracks(normalized.subtitleTracks);
    if (normalized.qualities) setQualities(normalized.qualities);
  }, [
    initialStreamUrlRaw,
    initialCaptionUrlRaw,
    initialSpriteVttRaw,
    initialQualitiesRaw,
    subtitleTracks,
  ]);

  // ── applyResponse: S1-only — normalise a fresh play response ─────────────
  // Extracts the NEW token from the response's master playlist URL and rewrites
  // all sibling URLs (caption, sprite, qualities, subtitle tracks) accordingly.

  const applyResponse = useCallback((response: PlayResponse) => {
    if (!response.success || !response.masterPlaylistUrl) return;
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

    setStreamUrl(normalized.streamUrl);
    if (response.captionSrt) setCaptionUrl(normalized.captionUrl ?? null);
    if (response.spriteVtt) setSpriteVtt(normalized.spriteVtt);
    if (normalized.subtitleTracks?.length)
      setSubtitleTracks(normalized.subtitleTracks);
    if (normalized.qualities?.length) setQualities(normalized.qualities);
  }, []);

  // ── applyS2Response: S2-only — set URLs directly, no token injection ─────
  // S2 serves absolute proxy URLs — running them through normalizeWatchUrls
  // with an empty token would corrupt them.

  const applyS2Response = useCallback((response: PlayResponse) => {
    if (!response.success || !response.masterPlaylistUrl) return;
    setStreamUrl(response.masterPlaylistUrl);
    if (response.captionSrt) setCaptionUrl(response.captionSrt);
    if (response.subtitleTracks && response.subtitleTracks.length > 0) {
      setSubtitleTracks(
        response.subtitleTracks.map((t, i) => ({
          id: t.language ? `${t.language}-${i}` : `track-${i}`,
          label: t.label,
          language: t.language,
          src: t.url,
        })),
      );
    }
    // S2 qualities are direct MP4 URLs at different resolutions — set them so
    // the quality picker in the player UI is populated.
    if (response.qualities && response.qualities.length > 0) {
      setQualities(response.qualities);
    }
    // Store provider-sourced duration (used as fallback when video.duration is
    // Infinity because the CDN omits Content-Length on MP4 streams).
    if (response.durationSeconds && response.durationSeconds > 0) {
      setApiDurationSeconds(response.durationSeconds);
    }
  }, []);

  // ── applyS2Subtitles: subtitle-only, never changes streamUrl ──────────
  // Safe to call from onDiscovered — the video keeps playing from where it is.

  const applyS2Subtitles = useCallback((response: PlayResponse) => {
    if (!response.success) return;
    if (response.captionSrt) setCaptionUrl(response.captionSrt);
    if (response.subtitleTracks && response.subtitleTracks.length > 0) {
      setSubtitleTracks(
        response.subtitleTracks.map((t, i) => ({
          id: t.language ? `${t.language}-${i}` : `track-${i}`,
          label: t.label,
          language: t.language,
          src: t.url,
        })),
      );
    }
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
    applyS2Response,
    applyS2Subtitles,
  };
}

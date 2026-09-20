'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { reportError, trackEvent } from '@/lib/analytics';
import type { AudioTrack, PlayerAction, Quality } from '../context/types';

/**
 * Fatal MEDIA_ERROR recoveries allowed before giving up on a source.
 *
 * Two, because the escalation only has two rungs: rebuild the MediaSource, then rebuild
 * it with the alternate audio codec. A third attempt repeats the second with no new
 * information while re-downloading the buffer again.
 */
const MAX_MEDIA_RECOVERY_ATTEMPTS = 2;

interface ManualQualityOption {
  label: string;
  height: number;
  bandwidth: number;
  url: string;
}

function parseManualQualityHeight(label: string): number {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('4k')) return 2160;
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface UseHlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamUrl: string | null;
  dispatch: React.Dispatch<PlayerAction>;
  /** Called when HLS gets a 401 (token expired). Parent can refetch a fresh stream URL. */
  onStreamExpired?: () => void;
  qualities?: { quality: string; url: string }[];
  /** When true, uses live-optimised HLS config (small buffer, seek to live edge on start) */
  isLive?: boolean;
}

interface NativeAudioTrack {
  id?: string;
  label?: string;
  language?: string;
  enabled: boolean;
}

interface VideoWithNativeAudioTracks extends HTMLVideoElement {
  audioTracks?: {
    length: number;
    [index: number]: NativeAudioTrack;
  };
}

export function useHls({
  videoRef,
  streamUrl,
  dispatch,
  onStreamExpired,
  qualities: _manualQualities,
  isLive = false,
}: UseHlsOptions) {
  const hlsRef = useRef<HlsType | null>(null);
  const unauthorizedRetryCountRef = useRef(0);
  const manualQualitiesRef = useRef<ManualQualityOption[]>([]);
  /**
   * Fatal MEDIA_ERROR recoveries attempted for the current source.
   *
   * `recoverMediaError()` tears down and rebuilds the MediaSource, then reloads from
   * `currentTime` — refilling up to `maxBufferLength` seconds of video and audio. Left
   * uncapped it loops: the same decode failure recurs, we recover again, and each cycle
   * re-requests the whole buffer. That is a request flood with no exit, so cap it and
   * surface a real error instead.
   */
  const mediaRecoveryCountRef = useRef(0);
  /** Set when the page was restored from the back/forward cache — see the MEDIA_ERROR handler. */
  const restoredFromBfcacheRef = useRef(false);
  /**
   * Playhead to restore after a reload we initiated ourselves.
   *
   * `onStreamExpired` refetches the stream, which remounts the engine against the same
   * video element and resets `currentTime` to 0. The saved-progress restore cannot cover
   * this: its effect keys on `metadata`/socket state, not `streamUrl`, so it does not
   * re-run for a refetch. Without this, recovering a decode error 33 minutes into an
   * episode would silently restart it from the beginning.
   */
  const resumePositionRef = useRef<number | null>(null);
  // Ref for callback to avoid HLS reinit when callback identity changes
  const onStreamExpiredRef = useRef(onStreamExpired);
  onStreamExpiredRef.current = onStreamExpired;

  /**
   * hls.js raises `mediaSourceRequiresReset` when the browser closes the MediaSource
   * while media is still attached, and flags it fatal only once `video.error` has been
   * set `appendErrorMaxRetry` times — i.e. a genuine decode failure, not a buffer
   * hiccup. One of its documented causes is bfcache restoration on WebKit, which is
   * indistinguishable from a codec fault unless we record that it happened.
   */
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        restoredFromBfcacheRef.current = true;
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    const manualQualities = (_manualQualities || [])
      .filter((q) => q.url)
      .map((q) => ({
        label: q.quality,
        height: parseManualQualityHeight(q.quality),
        bandwidth: 0,
        url: q.url,
      }))
      .filter((q) => !q.label.toLowerCase().startsWith('auto'));

    manualQualitiesRef.current = manualQualities;
    if (manualQualities.length === 0) return;

    // Keep quality menu aligned with backend-provided options even when
    // manual qualities arrive after HLS manifest parsing.
    dispatch({
      type: 'SET_QUALITIES',
      qualities: manualQualities.map((q) => ({
        label: q.label,
        height: q.height,
        bandwidth: q.bandwidth,
      })),
    });
  }, [_manualQualities, dispatch]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const isNativePlatform =
      typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

    let cancelled = false;
    // Capture native HLS handler so the cleanup closure can remove it
    let nativeLoadedMetadataHandler: (() => void) | null = null;

    // Clear any previous errors when loading new stream
    dispatch({ type: 'SET_ERROR', error: null });
    // Fresh source — the previous source's recovery budget must not carry over.
    mediaRecoveryCountRef.current = 0;
    dispatch({ type: 'SET_LOADING', isLoading: true });
    unauthorizedRetryCountRef.current = 0;

    const initHls = async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (
        Hls.isSupported() &&
        // WKWebView (Capacitor iOS) reports MediaSource support since iOS 17.1
        // but its implementation is unreliable for VOD — buffer stalls, silent failures.
        // Force native HLS on Capacitor iOS for VOD which handles .m3u8 natively.
        // However, for LIVE streams use HLS.js even on Capacitor because native AVPlayer
        // can't handle the proxied playlist URLs (relative paths, recursive rewrites).
        !(
          typeof window !== 'undefined' &&
          window.Capacitor?.isNativePlatform?.() &&
          !isLive
        ) &&
        (streamUrl.includes('.m3u8') || !streamUrl.includes('.mp4'))
      ) {
        const hlsConfig = isLive
          ? {
              // Live-optimised: stay close to the live edge without over-shooting it.
              // liveSyncDurationCount:2 keeps us 2 segments behind the edge — stable
              // enough that the origin always has the segment ready, but still low
              // latency. Count:1 caused 404 storms because the segment at the very
              // tip of the edge isn't always propagated to the CDN yet.
              enableWorker: true,
              lowLatencyMode: false,
              // Reduced to 3 for slightly better latency while keeping stability;
              // Combined with nudge logic it won't stall.
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 10,
              maxLiveSyncPlaybackRate: 1.15,
              abrEwmaFastLive: 2.0,
              abrEwmaSlowLive: 5.0,
              // PREFETCHING: crucially important to eliminate the gap between segments.
              startFragPrefetch: true,
              // GAP SKIPPING: Tell HLS.js to jump over micro-holes (up to 0.5s) in the buffer.
              maxBufferHole: 0.5,
              nudgeOffset: 0.1,
              nudgeMaxRetry: 3,
              maxBufferLength: 15,
              maxMaxBufferLength: 30,
              backBufferLength: 60,
              highBufferWatchdogPeriod: 2,
              fragLoadingRetryDelay: 1000,
              fragLoadingMaxRetryTimeout: 15000,
              manifestLoadingRetryDelay: 1000,
              levelLoadingRetryDelay: 1000,
              manifestLoadingMaxRetry: 8,
              levelLoadingMaxRetry: 6,
              fragLoadingMaxRetry: 10,
            }
          : {
              // VOD-optimised: prefer stability over latency
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 90,
              // Forward buffer. The comment this replaces claimed it matched an
              // "aggressive backend prefetch" — that prefetch was removed (the CDN proxy
              // is direct-pipe only now), so the sizing is no longer justified by it.
              // Left as-is because changing it is a throughput decision, not part of the
              // seek fix; at ~2 Mbps this reaches ~21 MB, well under the cap below.
              maxBufferLength: 120,
              maxMaxBufferLength: 300, // 5 minutes max
              maxBufferSize: 200 * 1000 * 1000, // 200MB (crucial for 1080p)
              // Gap handling on seek. These streams are open-GOP: segments start on
              // non-IDR frames, so Chrome logs "Promoting non-IDR frame with SEI recovery
              // point to keyframe for MSE random access" and the resulting buffer can
              // carry sub-frame holes at fragment joins. hls.js defaults to a 0.1s
              // tolerance, which is tight enough that a seek lands in a hole and stalls
              // instead of nudging over it. The live branch already used 0.5 for the same
              // reason; VOD was silently on the default.
              maxBufferHole: 0.5,
              // Fetch the next fragment before the current one is fully buffered, so a
              // seek forward is more likely to find data already in flight.
              startFragPrefetch: true,
              // nudgeOffset (0.1) and nudgeMaxRetry (3) are deliberately not set — those
              // are already the hls.js defaults, so restating them would be noise.
              abrEwmaFastVoD: 1.0,
              abrEwmaSlowVoD: 3.0,
              manifestLoadingMaxRetry: 5,
              levelLoadingMaxRetry: 5,
              fragLoadingMaxRetry: 10,
            };

        const finalConfig = {
          ...hlsConfig,
          xhrSetup: (xhr: XMLHttpRequest, url: string) => {
            if (url.includes('/api/stream/')) {
              // Don't send credentials on Capacitor for CDN URLs
              if (
                !(
                  typeof window !== 'undefined' &&
                  window.Capacitor?.isNativePlatform?.()
                )
              ) {
                xhr.withCredentials = true;
              }
            }
          },
          fetchSetup: (context: { url: string }, initParams: RequestInit) => {
            // Capacitor WebView: don't send credentials to CDN URLs
            // (avoids CORS preflight failures on third-party CDNs)
            if (
              typeof window !== 'undefined' &&
              window.Capacitor?.isNativePlatform?.() &&
              !context.url.includes('/api/')
            ) {
              return new Request(context.url, {
                ...initParams,
                credentials: 'omit',
              });
            }
            // cdnlivetv / cdn-aws: suppress Referer to avoid cross-origin block
            if (context.url.includes('cdn-aws')) {
              return new Request(context.url, {
                ...initParams,
                referrerPolicy: 'no-referrer',
                credentials: 'omit',
              });
            }
            return new Request(context.url, initParams);
          },
          // Validate that manifest/playlist responses are actually HLS content.
          // Some CDNs return HTML/CSS error pages with 200 OK when tokens
          // when tokens expire, which HLS.js blindly parses as M3U8 — producing
          // garbage segment URLs and silent playback failure.
        };

        const hls = new Hls(finalConfig);
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          // Restore the playhead after a reload we triggered. Done on MANIFEST_PARSED
          // rather than canplay because duration is not set before this, which makes a
          // currentTime assignment silently fail.
          const resumeAt = resumePositionRef.current;
          resumePositionRef.current = null;
          if (resumeAt !== null && resumeAt > 0 && !isLive) {
            video.currentTime = resumeAt;
            video.play().catch(() => {
              // Autoplay may be refused; the user can resume manually.
            });
          }

          // Detect garbage manifests: when a CDN returns non-HLS content
          // (e.g. HTML/CSS block page) and the CF Worker rewrites every line
          // as a proxied segment URL, HLS.js "parses" it but produces levels
          // with no resolution or bitrate info. Reject these early.
          if (
            manualQualitiesRef.current.length === 0 &&
            data.levels.length > 0 &&
            data.levels.every(
              (l: { height: number; bitrate: number }) =>
                l.height === 0 && l.bitrate === 0,
            )
          ) {
            dispatch({
              type: 'SET_ERROR',
              error:
                'Live stream unavailable — source returned invalid content.',
            });
            hls.destroy();
            return;
          }

          dispatch({ type: 'SET_ERROR', error: null });
          dispatch({ type: 'SET_LOADING', isLoading: false });

          const manualQualities = manualQualitiesRef.current;

          if (manualQualities.length > 0) {
            dispatch({
              type: 'SET_QUALITIES',
              qualities: manualQualities.map((q) => ({
                label: q.label,
                height: q.height,
                bandwidth: q.bandwidth,
              })),
            });
          } else {
            // Extract quality levels from parsed HLS manifest
            const qualities: Quality[] = data.levels.map((level, index) => {
              const hasDuplicateResolution = data.levels.some(
                (l, i) => i !== index && l.height === level.height,
              );

              let label = `${level.height}p`;
              if (hasDuplicateResolution) {
                const mbps = (level.bitrate / 1000000).toFixed(1);
                label = `${level.height}p (${mbps} Mbps)`;
              }

              return {
                label,
                height: level.height,
                bandwidth: level.bitrate,
              };
            });

            dispatch({ type: 'SET_QUALITIES', qualities });
          }

          // Extract audio tracks
          if (data.audioTracks && data.audioTracks.length > 0) {
            const audioTracks: AudioTrack[] = data.audioTracks.map(
              (track, index) => ({
                id: String(index),
                label: track.name || track.lang || `Audio ${index + 1}`,
                language: track.lang || 'unknown',
                isDefault: track.default || index === 0,
              }),
            );
            dispatch({ type: 'SET_AUDIO_TRACKS', audioTracks });

            // Set default audio track
            const defaultTrack =
              audioTracks.find((t) => t.isDefault) || audioTracks[0];
            if (defaultTrack) {
              dispatch({
                type: 'SET_CURRENT_AUDIO_TRACK',
                trackId: defaultTrack.id,
              });
            }
          }

          // Auto-play: Re-enabled by user request
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          // Live retries can briefly mark buffering; clear it as soon as
          // a fragment arrives so the spinner doesn't stick while video plays.
          dispatch({ type: 'SET_BUFFERING', isBuffering: false });
        });

        // Handle audio track changes from HLS
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          dispatch({
            type: 'SET_CURRENT_AUDIO_TRACK',
            trackId: String(data.id),
          });
        });

        // Handle audio tracks loading/updating
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            const audioTracks: AudioTrack[] = data.audioTracks.map(
              (track, index) => ({
                id: String(index),
                label: track.name || track.lang || `Audio ${index + 1}`,
                language: track.lang || 'unknown',
                isDefault: track.default || index === 0,
              }),
            );
            dispatch({ type: 'SET_AUDIO_TRACKS', audioTracks });
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) {
            // Static import (see reportPlaybackError): quality switches recur throughout
            // playback, and the module is already a static dependency of this file.
            trackEvent('video_quality_switch', {
              height: level.height,
              auto: hls.autoLevelEnabled,
            });
            dispatch({
              type: 'SET_CURRENT_QUALITY',
              quality: `${level.height}p`,
            });
          }
        });

        /**
         * Record a fatal playback failure to the console and to analytics.
         *
         * Previously only the `default:` branch reported, so fatal MEDIA_ERROR and
         * NETWORK_ERROR — the two that actually occur in the field — were invisible in
         * error dashboards. A single console line on one device cannot show whether a
         * failure is platform-specific, title-specific or session-length-specific.
         *
         * `video.error` is the decisive field and was previously omitted: hls.js only
         * marks `mediaSourceRequiresReset` fatal once the element has reported a decode
         * error, so its code and message name the underlying fault. `audioTrack` and the
         * bfcache/visibility flags separate the three known causes — a codec mismatch
         * after a track switch, a WebKit bfcache restore, and buffer eviction while
         * backgrounded.
         *
         * @param data - The hls.js error payload.
         * @param action - What we did about it, so the console and analytics agree on
         *   whether this attempt recovered or gave up.
         */
        const reportPlaybackError = (
          data: { type: string; details: unknown; fatal?: boolean },
          action: string,
        ) => {
          const diagnostics = {
            type: data.type,
            details: data.details,
            action,
            // The reason hls.js escalated to fatal — absent for non-decode failures.
            mediaErrorCode: video.error?.code,
            mediaErrorMessage: video.error?.message,
            audioTrack: hls.audioTrack,
            audioTrackCount: hls.audioTracks?.length,
            currentLevel: hls.currentLevel,
            videoReadyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            currentTime: Math.round(video.currentTime),
            buffered: video.buffered.length,
            restoredFromBfcache: restoredFromBfcacheRef.current,
            visibility:
              typeof document === 'undefined'
                ? undefined
                : document.visibilityState,
            isLive,
          };

          console.warn(`[NW-HLS] Fatal ${data.type} (${action}):`, diagnostics);

          // Statically imported rather than dynamically: this path can fire repeatedly
          // during a recovery sequence, and analytics is already a static dependency
          // elsewhere. It lazy-loads the Firebase SDKs internally, so there is nothing
          // heavy to defer here.
          try {
            reportError(
              `[HLS Fatal] ${data.type}: ${String(data.details)} (${action})`,
            );
            trackEvent('video_error', { ...diagnostics, fatal: true });
          } catch {
            // Analytics must never mask the playback failure it is describing.
          }
        };

        hls.on(Hls.Events.ERROR, (_, data) => {
          // Ignore all errors after cleanup has started (cancelled flag is set
          // synchronously at the top of the effect cleanup function).
          if (cancelled) return;

          const status =
            (data.response as { code?: number } | undefined)?.code ??
            (data as { response?: { code?: number } }).response?.code;

          // Detect non-HLS content from CDNs that return HTML/CSS block pages
          // with 200 OK when tokens expire. HLS.js fires manifestParsingError
          // when the response body isn't a valid M3U8 playlist.
          if (
            data.fatal &&
            (data.details as string) === 'manifestParsingError'
          ) {
            dispatch({
              type: 'SET_ERROR',
              error:
                'Live stream unavailable — source returned invalid content.',
            });
            hls.destroy();
            return;
          }

          // 429 Rate Limited — back off before retrying to avoid a tight loop
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && status === 429) {
            dispatch({ type: 'SET_BUFFERING', isBuffering: true });
            setTimeout(() => {
              if (!cancelled) hls.startLoad();
            }, 5000);
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && status === 401) {
            if (isLive) {
              unauthorizedRetryCountRef.current += 1;
              const isLikelyStalled = video.paused || video.readyState < 3;
              if (isLikelyStalled) {
                dispatch({ type: 'SET_BUFFERING', isBuffering: true });
              }
              hls.startLoad();
              return;
            }

            // A transient 401 can happen while auth refresh is in-flight.
            // Retry a few times before considering it truly expired.
            unauthorizedRetryCountRef.current += 1;

            if (unauthorizedRetryCountRef.current <= 3) {
              hls.startLoad();
              return;
            }

            // If parent can refetch a fresh stream, trigger it after retries
            if (onStreamExpiredRef.current) {
              hls.destroy();
              dispatch({ type: 'SET_LOADING', isLoading: true });
              onStreamExpiredRef.current();
            } else {
              dispatch({
                type: 'SET_ERROR',
                error: 'Stream session expired. Please start playback again.',
              });
            }
            return;
          }

          if (data.type !== Hls.ErrorTypes.NETWORK_ERROR || status !== 401) {
            unauthorizedRetryCountRef.current = 0;
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // All other fatal network errors — retry
                reportPlaybackError(data, 'retry');
                dispatch({ type: 'SET_BUFFERING', isBuffering: true });
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR: {
                /**
                 * A platform decoder that cannot re-initialise is unrecoverable by
                 * rebuilding the MediaSource, so go straight to a full reload.
                 *
                 * Observed on macOS Chrome (media-internals, 2026-09-20): backgrounding
                 * the tab makes Chrome disable the video track to save power; on return it
                 * re-enables it and rebuilds the hardware decoder, and
                 * `CMVideoFormatDescriptionCreateFromH264ParameterSets()` fails with
                 * OSStatus -12712 because these streams use open GOPs — segments start on
                 * non-IDR frames ("Promoting non-IDR frame with SEI recovery point to
                 * keyframe") and the config carries no avcC extradata, so there are no
                 * usable H.264 parameter sets to re-initialise from.
                 *
                 * `recoverMediaError()` re-appends at that same promoted non-IDR frame, so
                 * it fails identically every time — it just re-downloads the buffer first.
                 * Only a fresh player and decoder recovers, so skip the attempts that
                 * cannot work rather than spending ~15s of rebuffering to learn nothing.
                 */
                // MediaError.MEDIA_ERR_DECODE. Compared as a literal because the
                // `MediaError` global is not present in every environment this runs in.
                const MEDIA_ERR_DECODE = 3;
                const isUnrecoverableDecode =
                  (data.details as string) === 'mediaSourceRequiresReset' &&
                  video.error?.code === MEDIA_ERR_DECODE;

                if (isUnrecoverableDecode && onStreamExpiredRef.current) {
                  reportPlaybackError(data, 'reload-decoder');
                  resumePositionRef.current = video.currentTime;
                  hls.destroy();
                  dispatch({ type: 'SET_LOADING', isLoading: true });
                  onStreamExpiredRef.current();
                  break;
                }

                mediaRecoveryCountRef.current += 1;
                const attempt = mediaRecoveryCountRef.current;

                if (attempt > MAX_MEDIA_RECOVERY_ATTEMPTS) {
                  // Out of rebuild attempts. A reload still gets a fresh decoder, so
                  // prefer it over stranding the user on an error they cannot act on.
                  if (onStreamExpiredRef.current) {
                    reportPlaybackError(data, 'reload-exhausted');
                    resumePositionRef.current = video.currentTime;
                    hls.destroy();
                    dispatch({ type: 'SET_LOADING', isLoading: true });
                    onStreamExpiredRef.current();
                    break;
                  }

                  reportPlaybackError(data, 'gave-up');
                  dispatch({
                    type: 'SET_ERROR',
                    error: 'Playback failed — the media could not be decoded.',
                  });
                  hls.destroy();
                  break;
                }

                reportPlaybackError(data, `recover-${attempt}`);
                dispatch({ type: 'SET_BUFFERING', isBuffering: true });

                // Second attempt: the usual cause of a decode error that survives one
                // MediaSource rebuild is an audio codec the current SourceBuffer cannot
                // take — typically after switching between tracks that were encoded
                // differently. swapAudioCodec() flips hls.js to the alternate codec
                // before rebuilding, which is the documented escalation and does
                // nothing useful on the first attempt.
                if (attempt === 2) {
                  hls.swapAudioCodec();
                }
                hls.recoverMediaError();
                break;
              }
              default:
                reportPlaybackError(data, 'gave-up');
                dispatch({
                  type: 'SET_ERROR',
                  error: 'Playback error occurred',
                });
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari) — keep custom player state in sync so the
        // custom overlay is ALWAYS shown and the browser never falls through to
        // its own error / control UI.
        nativeLoadedMetadataHandler = () => {
          if (cancelled) return;

          dispatch({ type: 'SET_ERROR', error: null });

          const nativeVideo = video as VideoWithNativeAudioTracks;
          const nativeAudioTracks = nativeVideo.audioTracks;
          if (nativeAudioTracks && nativeAudioTracks.length > 0) {
            const audioTracks: AudioTrack[] = [];
            let selectedTrackId: string | null = null;

            for (let i = 0; i < nativeAudioTracks.length; i++) {
              const track = nativeAudioTracks[i];
              const id = String(i);
              const isDefault = !!track.enabled || i === 0;
              if (track.enabled) selectedTrackId = id;

              audioTracks.push({
                id,
                label: track.label || track.language || `Audio ${i + 1}`,
                language: track.language || 'unknown',
                isDefault,
              });
            }

            dispatch({ type: 'SET_AUDIO_TRACKS', audioTracks });
            dispatch({
              type: 'SET_CURRENT_AUDIO_TRACK',
              trackId: selectedTrackId || audioTracks[0]?.id || null,
            });
          }

          // Parse master playlist for quality levels on native iOS
          // (AVPlayer handles quality internally but we want to show options in UI)
          if (manualQualitiesRef.current.length === 0) {
            fetch(absoluteStreamUrl, { credentials: 'include' })
              .then((r) => r.text())
              .then((text) => {
                if (cancelled) return;
                const qualities: Quality[] = [];
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (line.startsWith('#EXT-X-STREAM-INF:')) {
                    const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                    const bwMatch = line.match(/BANDWIDTH=(\d+)/);
                    if (resMatch) {
                      const height = parseInt(resMatch[1], 10);
                      const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
                      qualities.push({
                        label: `${height}p`,
                        height,
                        bandwidth,
                      });
                    }
                  }
                }
                // Deduplicate by height
                const seen = new Set<number>();
                const unique = qualities.filter((q) => {
                  if (seen.has(q.height)) return false;
                  seen.add(q.height);
                  return true;
                });
                if (unique.length > 0) {
                  dispatch({ type: 'SET_QUALITIES', qualities: unique });
                }
              })
              .catch(() => {});
          }

          dispatch({ type: 'SET_LOADING', isLoading: false });
          video.play().catch(() => {});
        };

        const nativeErrorHandler = () => {
          if (cancelled) return;

          // Ignore empty source errors triggered by cleanup or browser abort (e.g. backgrounding)
          if (!video.error || video.error.code === MediaError.MEDIA_ERR_ABORTED)
            return;

          // On native iOS, error 4 (SRC_NOT_SUPPORTED) means the HLS session
          // was invalidated by a previous mount. Treat it as stream expired
          // so the player re-fetches a fresh session.
          if (
            video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED &&
            isNativePlatform &&
            onStreamExpiredRef.current
          ) {
            dispatch({ type: 'SET_LOADING', isLoading: true });
            onStreamExpiredRef.current();
            return;
          }

          if (video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)
            return;

          const code = video.error.code;
          const isExpired = code === MediaError.MEDIA_ERR_NETWORK;
          const isRecoverable =
            isExpired || code === MediaError.MEDIA_ERR_DECODE;
          if (isRecoverable && isLive) {
            const isLikelyStalled = video.paused || video.readyState < 3;
            if (isLikelyStalled) {
              dispatch({ type: 'SET_BUFFERING', isBuffering: true });
            }
            video.play().catch(() => {});
          } else if (isRecoverable && isNativePlatform) {
            // Capacitor iOS: AVPlayer fires MEDIA_ERR_NETWORK on pause/play
            // when the HLS session socket drops. Retry playback first instead
            // of refetching the entire stream — the CDN URL is still valid.
            dispatch({ type: 'SET_BUFFERING', isBuffering: true });
            video.load();
            video.play().catch(() => {});
          } else if (isRecoverable && onStreamExpiredRef.current) {
            dispatch({ type: 'SET_LOADING', isLoading: true });
            onStreamExpiredRef.current();
          } else {
            dispatch({
              type: 'SET_ERROR',
              error: 'Playback error occurred. Please try again.',
            });
          }
        };

        const nativeStalledHandler = () => {
          if (cancelled) return;
          // Only mark buffering if the video isn't actually progressing
          if (video.readyState < 3) {
            dispatch({ type: 'SET_BUFFERING', isBuffering: true });
          }
        };

        const nativePlayingHandler = () => {
          if (cancelled) return;
          dispatch({ type: 'SET_BUFFERING', isBuffering: false });
        };

        const nativeTimeupdateHandler = () => {
          if (cancelled) return;
          // Clear stale buffering state — iOS fires 'waiting' spuriously on
          // live HLS segment boundaries even while video continues playing.
          dispatch({ type: 'SET_BUFFERING', isBuffering: false });
        };

        // Native AVPlayer doesn't resolve relative URLs against the WKWebView
        // origin automatically. On Capacitor, resolve against the backend API URL
        // directly — the frontend domain is behind CF Access which blocks AVPlayer.
        let absoluteStreamUrl = streamUrl;
        if (streamUrl.startsWith('/') && typeof window !== 'undefined') {
          const baseUrl =
            isNativePlatform && process.env.NEXT_PUBLIC_BACKEND_URL
              ? process.env.NEXT_PUBLIC_BACKEND_URL
              : window.location.origin;
          absoluteStreamUrl = `${baseUrl}${streamUrl}`;
        }
        video.src = absoluteStreamUrl;
        video.addEventListener('loadedmetadata', nativeLoadedMetadataHandler);
        video.addEventListener('error', nativeErrorHandler);
        video.addEventListener('stalled', nativeStalledHandler);
        video.addEventListener('waiting', nativeStalledHandler);
        video.addEventListener('playing', nativePlayingHandler);
        video.addEventListener('timeupdate', nativeTimeupdateHandler);

        // Store extra handlers on the element for cleanup (avoids closure capture issues)
        (
          video as HTMLVideoElement & { _nativeHlsHandlers?: (() => void)[] }
        )._nativeHlsHandlers = [
          () => video.removeEventListener('error', nativeErrorHandler),
          () => video.removeEventListener('stalled', nativeStalledHandler),
          () => video.removeEventListener('waiting', nativeStalledHandler),
          () => video.removeEventListener('playing', nativePlayingHandler),
          () =>
            video.removeEventListener('timeupdate', nativeTimeupdateHandler),
        ];
      }
    };

    initHls();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (nativeLoadedMetadataHandler) {
        video.removeEventListener(
          'loadedmetadata',
          nativeLoadedMetadataHandler,
        );
        nativeLoadedMetadataHandler = null;
      }
      // Clean up extra native Safari HLS handlers
      const extra = (
        video as HTMLVideoElement & { _nativeHlsHandlers?: (() => void)[] }
      )._nativeHlsHandlers;
      if (extra) {
        for (const remove of extra) remove();
        delete (
          video as HTMLVideoElement & { _nativeHlsHandlers?: (() => void)[] }
        )._nativeHlsHandlers;
      }
      if (video) {
        video.pause();
        // Only strip src on HLS.js (web). On native iOS, removing src kills
        // the session permanently — the same URL cannot be reloaded.
        if (!isNativePlatform) {
          video.removeAttribute('src');
        }
      }
    };
  }, [streamUrl, videoRef, dispatch, isLive]); // Keep this minimal to avoid HLS re-init

  const setQuality = useCallback(
    (levelIndex: number) => {
      if (!hlsRef.current) return;

      const manualQualities = manualQualitiesRef.current;
      if (manualQualities.length > 0) {
        const video = videoRef.current;
        const savedTime = video?.currentTime ?? 0;
        const wasPlaying = video ? !video.paused : false;

        if (levelIndex === -1) {
          hlsRef.current.loadSource(streamUrl || manualQualities[0].url);
        } else {
          const selected = manualQualities[levelIndex];
          if (selected) {
            hlsRef.current.loadSource(selected.url);
          } else {
            return;
          }
        }

        // Restore position after manifest is parsed for the new source.
        // Using MANIFEST_PARSED instead of canplay avoids a race where canplay
        // fires before HLS.js has set the duration, making currentTime assignment fail.
        const hls = hlsRef.current;
        if (hls) {
          const MANIFEST_PARSED = 'hlsManifestParsed';
          const onParsed = () => {
            (hls as unknown as { off(e: string, fn: () => void): void }).off(
              MANIFEST_PARSED,
              onParsed,
            );
            const v = videoRef.current;
            if (!v) return;
            if (savedTime > 0) {
              v.currentTime = savedTime;
            }
            if (wasPlaying) {
              v.play().catch(() => {});
            }
          };
          (hls as unknown as { on(e: string, fn: () => void): void }).on(
            MANIFEST_PARSED,
            onParsed,
          );
        }
        return;
      }

      hlsRef.current.currentLevel = levelIndex;
    },
    [streamUrl, videoRef],
  );

  const setAudioTrack = useCallback(
    (trackId: string) => {
      if (hlsRef.current) {
        const trackIndex = parseInt(trackId, 10);
        if (!Number.isNaN(trackIndex) && trackIndex >= 0) {
          hlsRef.current.audioTrack = trackIndex;
        }
        return;
      }

      const nativeVideo = videoRef.current as VideoWithNativeAudioTracks | null;
      const nativeAudioTracks = nativeVideo?.audioTracks;
      if (!nativeAudioTracks) return;

      const trackIndex = parseInt(trackId, 10);
      if (Number.isNaN(trackIndex) || trackIndex < 0) return;

      for (let i = 0; i < nativeAudioTracks.length; i++) {
        nativeAudioTracks[i].enabled = i === trackIndex;
      }
    },
    [videoRef],
  );

  return { hlsRef, setQuality, setAudioTrack };
}

'use client';

import type HlsType from 'hls.js';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { AudioTrack, PlayerAction, Quality } from '../context/types';

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
  // Ref for callback to avoid HLS reinit when callback identity changes
  const onStreamExpiredRef = useRef(onStreamExpired);
  onStreamExpiredRef.current = onStreamExpired;

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
    dispatch({ type: 'SET_LOADING', isLoading: true });
    unauthorizedRetryCountRef.current = 0;

    const initHls = async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (
        Hls.isSupported() &&
        // WKWebView (Capacitor iOS) reports MediaSource support since iOS 17.1
        // but its implementation is unreliable — buffer stalls, silent failures.
        // Force native HLS on Capacitor iOS which handles .m3u8 natively.
        !(
          typeof window !== 'undefined' &&
          window.Capacitor?.isNativePlatform?.()
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
              maxBufferLength: 120, // 2 minutes (matches aggressive backend prefetch)
              maxMaxBufferLength: 300, // 5 minutes max
              maxBufferSize: 200 * 1000 * 1000, // 200MB (crucial for 1080p)
              abrEwmaFastVoD: 1.0,
              abrEwmaSlowVoD: 3.0,
              manifestLoadingMaxRetry: 5,
              levelLoadingMaxRetry: 5,
              fragLoadingMaxRetry: 10,
            };

        const finalConfig = {
          ...hlsConfig,
          xhrSetup: (xhr: XMLHttpRequest, url: string) => {
            if (
              url.includes('/api/stream/') &&
              !url.startsWith('offline-media://')
            ) {
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
          // HLS.js switches to FetchLoader (progressive streaming) when fetch is available.
          // For offline-media:// URLs, the default mode:'cors' causes fetch to fail because
          // Electron's custom protocol handler is treated as cross-origin. Override to use
          // mode:'cors' only for real network URLs; offline-media:// gets no-cors.
          fetchSetup: (context: { url: string }, initParams: RequestInit) => {
            if (context.url.startsWith('offline-media://')) {
              return new Request(context.url, {
                ...initParams,
                mode: 'cors',
                credentials: 'omit',
              });
            }
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
            dispatch({
              type: 'SET_CURRENT_QUALITY',
              quality: `${level.height}p`,
            });
          }
        });

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
                dispatch({ type: 'SET_BUFFERING', isBuffering: true });
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                dispatch({ type: 'SET_BUFFERING', isBuffering: true });
                hls.recoverMediaError();
                break;
              default:
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
          dispatch({ type: 'SET_BUFFERING', isBuffering: true });
        };

        const nativePlayingHandler = () => {
          if (cancelled) return;
          dispatch({ type: 'SET_BUFFERING', isBuffering: false });
        };

        // Native AVPlayer doesn't resolve relative URLs against the WKWebView
        // origin and can't follow Next.js rewrite proxies reliably. Point
        // directly to the backend for absolute HLS URLs on Capacitor.
        let absoluteStreamUrl = streamUrl;
        if (streamUrl.startsWith('/') && isNativePlatform) {
          const backendOrigin =
            process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
          absoluteStreamUrl = `${backendOrigin}${streamUrl}`;
        } else if (streamUrl.startsWith('/') && typeof window !== 'undefined') {
          absoluteStreamUrl = `${window.location.origin}${streamUrl}`;
        }
        video.src = absoluteStreamUrl;
        video.addEventListener('loadedmetadata', nativeLoadedMetadataHandler);
        video.addEventListener('error', nativeErrorHandler);
        video.addEventListener('stalled', nativeStalledHandler);
        video.addEventListener('waiting', nativeStalledHandler);
        video.addEventListener('playing', nativePlayingHandler);

        // Store extra handlers on the element for cleanup (avoids closure capture issues)
        (
          video as HTMLVideoElement & { _nativeHlsHandlers?: (() => void)[] }
        )._nativeHlsHandlers = [
          () => video.removeEventListener('error', nativeErrorHandler),
          () => video.removeEventListener('stalled', nativeStalledHandler),
          () => video.removeEventListener('waiting', nativeStalledHandler),
          () => video.removeEventListener('playing', nativePlayingHandler),
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
          // biome-ignore lint/suspicious/noExplicitAny: HLS.js internal event not exported in types
          const MANIFEST_PARSED = 'hlsManifestParsed' as any;
          const onParsed = () => {
            hls.off(MANIFEST_PARSED, onParsed);
            const v = videoRef.current;
            if (!v) return;
            if (savedTime > 0) {
              v.currentTime = savedTime;
            }
            if (wasPlaying) {
              v.play().catch(() => {});
            }
          };
          hls.on(MANIFEST_PARSED, onParsed);
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

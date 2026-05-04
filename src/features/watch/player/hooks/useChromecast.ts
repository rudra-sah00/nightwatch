'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Default receiver app — Google's default media receiver. */
const DEFAULT_RECEIVER_APP_ID = 'CC1AD845';

type CastState = 'unavailable' | 'available' | 'connecting' | 'connected';

interface UseChromecastOptions {
  /** HLS or MP4 stream URL to cast. */
  streamUrl: string | null;
  /** Content title shown on the Cast device. */
  title?: string;
  /** Poster image URL shown on the Cast device. */
  posterUrl?: string;
  /** Whether the stream is live (affects streamType). */
  isLive?: boolean;
}

/**
 * Hook that manages Google Cast SDK lifecycle for Chromecast support.
 *
 * - Loads the Cast SDK script once on mount (Chrome only).
 * - Tracks cast device availability and session state.
 * - Provides `startCast` / `stopCast` actions.
 *
 * Returns `castState: 'unavailable'` on non-Chrome browsers so the
 * UI can hide the cast button entirely.
 */
export function useChromecast({
  streamUrl,
  title,
  posterUrl,
  isLive = false,
}: UseChromecastOptions) {
  const [castState, setCastState] = useState<CastState>('unavailable');
  const sdkReady = useRef(false);

  // Load Cast SDK script (Chrome only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only Chrome/Chromium has built-in Cast support
    const isChrome =
      /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    if (!isChrome) return;
    // Skip on Capacitor/Electron
    if (
      window.Capacitor?.isNativePlatform?.() ||
      (window as unknown as Record<string, unknown>).electronBridge
    )
      return;

    const init = () => {
      if (
        typeof cast === 'undefined' ||
        !cast?.framework ||
        typeof chrome === 'undefined' ||
        !chrome?.cast
      )
        return;
      const ctx = cast.framework.CastContext.getInstance();
      ctx.setOptions({
        receiverApplicationId: DEFAULT_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      const updateState = () => {
        const state = ctx.getCastState();
        switch (state) {
          case cast.framework.CastState.CONNECTED:
            setCastState('connected');
            break;
          case cast.framework.CastState.CONNECTING:
            setCastState('connecting');
            break;
          case cast.framework.CastState.NOT_CONNECTED:
            setCastState('available');
            break;
          default:
            setCastState('unavailable');
        }
      };

      ctx.addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        updateState,
      );
      updateState();
    };

    if (document.querySelector('script[src*="cast_sender"]')) {
      if (window.cast?.framework) {
        sdkReady.current = true;
        init();
      }
      return;
    }

    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        sdkReady.current = true;
        init();
      }
    };

    const script = document.createElement('script');
    script.src =
      'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const startCast = useCallback(async () => {
    if (
      !sdkReady.current ||
      !streamUrl ||
      typeof cast === 'undefined' ||
      typeof chrome === 'undefined'
    )
      return;
    const ctx = cast.framework.CastContext.getInstance();
    try {
      await ctx.requestSession();
      const session = ctx.getCurrentSession();
      if (!session) return;

      const contentType = streamUrl.includes('.mp4')
        ? 'video/mp4'
        : 'application/x-mpegurl';
      // Cast needs an absolute URL
      const absoluteUrl = streamUrl.startsWith('/')
        ? `${window.location.origin}${streamUrl}`
        : streamUrl;

      const mediaInfo = new chrome.cast.media.MediaInfo(
        absoluteUrl,
        contentType,
      );
      mediaInfo.streamType = isLive
        ? chrome.cast.media.StreamType.LIVE
        : chrome.cast.media.StreamType.BUFFERED;

      if (title || posterUrl) {
        const metadata = new chrome.cast.media.GenericMediaMetadata();
        if (title) metadata.title = title;
        if (posterUrl) metadata.images = [{ url: posterUrl }];
        mediaInfo.metadata = metadata;
      }

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      await session.loadMedia(request);
    } catch {
      // User cancelled or error — no action needed
    }
  }, [streamUrl, title, posterUrl, isLive]);

  const stopCast = useCallback(() => {
    if (!sdkReady.current || typeof cast === 'undefined') return;
    const ctx = cast.framework.CastContext.getInstance();
    ctx.endCurrentSession(true);
  }, []);

  return { castState, startCast, stopCast };
}

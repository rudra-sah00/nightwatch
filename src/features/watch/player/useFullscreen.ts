'use client';

import { type RefObject, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PlayerAction } from './types';

interface UseFullscreenOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef?: RefObject<HTMLVideoElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
}

interface DocumentWithWebkit extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
}

interface VideoElementWithWebkit extends HTMLVideoElement {
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export function useFullscreen({
  containerRef,
  videoRef,
  dispatch,
}: UseFullscreenOptions) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const videoElem = videoRef?.current;
    const handleFullscreenChange = () => {
      const doc = document as DocumentWithWebkit;
      const video = videoElem as VideoElementWithWebkit | undefined;
      const isFullscreen =
        !!document.fullscreenElement ||
        !!doc.webkitFullscreenElement ||
        !!video?.webkitDisplayingFullscreen;
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // iOS Safari video fullscreen events
    if (videoElem) {
      videoElem.addEventListener(
        'webkitbeginfullscreen',
        handleFullscreenChange,
      );
      videoElem.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
      if (videoElem) {
        videoElem.removeEventListener(
          'webkitbeginfullscreen',
          handleFullscreenChange,
        );
        videoElem.removeEventListener(
          'webkitendfullscreen',
          handleFullscreenChange,
        );
      }
    };
  }, [dispatch, videoRef]);

  const enterFullscreen = useCallback(async () => {
    try {
      // On mobile, use video element fullscreen (native player)
      if (isMobile && videoRef?.current) {
        const video = videoRef.current as VideoElementWithWebkit;

        // iOS Safari uses webkitEnterFullscreen on video element
        if (video.webkitEnterFullscreen) {
          await video.webkitEnterFullscreen();
          return;
        }

        // Android Chrome - try video fullscreen first
        if (video.requestFullscreen) {
          await video.requestFullscreen();
          return;
        }
      }

      // Desktop: use container fullscreen for custom controls
      if (!containerRef.current) return;

      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        const container = containerRef.current as HTMLElementWithWebkit;
        if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
      }
    } catch {
      toast.error('Failed to enter fullscreen');
    }
  }, [isMobile, containerRef, videoRef]);

  const exitFullscreen = useCallback(async () => {
    try {
      const doc = document as DocumentWithWebkit;
      const video = videoRef?.current as VideoElementWithWebkit | undefined;

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (video?.webkitExitFullscreen) {
        await video.webkitExitFullscreen();
      }
    } catch {
      toast.error('Failed to exit fullscreen');
    }
  }, [videoRef]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as DocumentWithWebkit;
    const video = videoRef?.current as VideoElementWithWebkit | undefined;

    const isCurrentlyFullscreen =
      !!document.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!video?.webkitDisplayingFullscreen;

    if (isCurrentlyFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, videoRef]);

  return { enterFullscreen, exitFullscreen, toggleFullscreen, isMobile };
}

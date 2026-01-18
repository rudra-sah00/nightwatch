'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseFullscreenOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  isMobile: boolean;
}

// Check if device is mobile/touch
const checkIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    'ontouchstart' in window ||
    window.matchMedia('(max-width: 768px)').matches
  );
};

export function useFullscreen({
  containerRef,
  videoRef,
}: UseFullscreenOptions): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(checkIsMobile());

    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check both document fullscreen and video fullscreen (for iOS)
      const video = videoRef?.current as HTMLVideoElement & {
        webkitDisplayingFullscreen?: boolean;
      };
      const isVideoFullscreen = video?.webkitDisplayingFullscreen ?? false;
      setIsFullscreen(!!document.fullscreenElement || isVideoFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // iOS video fullscreen events
    const video = videoRef?.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
        video.removeEventListener('webkitendfullscreen', handleFullscreenChange);
      }
    };
  }, [videoRef]);

  const enterFullscreen = useCallback(() => {
    const video = videoRef?.current as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitSupportsFullscreen?: boolean;
    };

    // On iOS, use video element fullscreen (native player)
    if (isMobile && video?.webkitSupportsFullscreen && video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    // Standard fullscreen API
    const container = containerRef.current;
    if (container?.requestFullscreen) {
      container.requestFullscreen();
    } else if (
      (container as HTMLElement & { webkitRequestFullscreen?: () => void })?.webkitRequestFullscreen
    ) {
      (
        container as HTMLElement & { webkitRequestFullscreen: () => void }
      ).webkitRequestFullscreen();
    }
  }, [containerRef, videoRef, isMobile]);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (
      (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen
    ) {
      (document as Document & { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef?.current as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean };
    const isVideoFullscreen = video?.webkitDisplayingFullscreen ?? false;

    if (document.fullscreenElement || isVideoFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, videoRef]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isMobile,
  };
}

import { useEffect, useRef } from 'react';
import type { PartyEvent } from '../types';

interface UseWatchPartyHostSyncProps {
  videoElement: HTMLVideoElement | null;
  isHost: boolean;
  isLive?: boolean;
  onPartyEvent: (event: PartyEvent) => void;
}

/**
 * Attaches video event listeners for the host to broadcast sync events
 * (play, pause, seek, ratechange) to all party members via the socket.
 *
 * Only active when `isHost` is true — no-ops for guests.
 */
export function useWatchPartyHostSync({
  videoElement,
  isHost,
  isLive = false,
  onPartyEvent,
}: UseWatchPartyHostSyncProps) {
  // Stabilize callback via ref to prevent video listener teardown/reattach on every room state change
  const onPartyEventRef = useRef(onPartyEvent);
  onPartyEventRef.current = onPartyEvent;

  useEffect(() => {
    if (!videoElement || !isHost) return;

    let syncDebounceTimer: NodeJS.Timeout | null = null;
    let playPauseDebounce: NodeJS.Timeout | null = null;
    let lastSeekTime = 0;

    const handlePlay = () => {
      if (playPauseDebounce) clearTimeout(playPauseDebounce);
      playPauseDebounce = setTimeout(() => {
        onPartyEventRef.current({
          eventType: 'play',
          videoTime: videoElement.currentTime,
          playbackRate: videoElement.playbackRate,
        });
      }, 100);
    };

    const handlePause = () => {
      if (playPauseDebounce) clearTimeout(playPauseDebounce);
      playPauseDebounce = setTimeout(() => {
        onPartyEventRef.current({
          eventType: 'pause',
          videoTime: videoElement.currentTime,
        });
      }, 100);
    };

    const handleSeek = () => {
      if (isLive) return;
      const now = Date.now();
      if (now - lastSeekTime < 50) return; // Debounce rapid seek events
      lastSeekTime = now;

      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        onPartyEventRef.current({
          eventType: 'seek',
          videoTime: videoElement.currentTime,
          playbackRate: videoElement.playbackRate,
          wasPlaying: !videoElement.paused,
        });
      }, 50);
    };

    const handleRateChange = () => {
      if (isLive) return;
      onPartyEventRef.current({
        eventType: 'rate',
        videoTime: videoElement.currentTime,
        playbackRate: videoElement.playbackRate,
        wasPlaying: !videoElement.paused,
      });
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    if (!isLive) {
      videoElement.addEventListener('seeked', handleSeek);
      videoElement.addEventListener('ratechange', handleRateChange);
    }

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('seeked', handleSeek);
      videoElement.removeEventListener('ratechange', handleRateChange);
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      if (playPauseDebounce) clearTimeout(playPauseDebounce);
    };
  }, [videoElement, isHost, isLive]);
}

import { useEffect } from 'react';
import type { PartyEvent } from '../types';

interface UseWatchPartyHostSyncProps {
  videoElement: HTMLVideoElement | null;
  isHost: boolean;
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
  onPartyEvent,
}: UseWatchPartyHostSyncProps) {
  useEffect(() => {
    if (!videoElement || !isHost) return;

    let syncDebounceTimer: NodeJS.Timeout | null = null;
    let lastSeekTime = 0;

    const handlePlay = () => {
      onPartyEvent({
        eventType: 'play',
        videoTime: videoElement.currentTime,
        playbackRate: videoElement.playbackRate,
      });
    };

    const handlePause = () => {
      onPartyEvent({
        eventType: 'pause',
        videoTime: videoElement.currentTime,
      });
    };

    const handleSeek = () => {
      const now = Date.now();
      if (now - lastSeekTime < 50) return; // Debounce rapid seek events
      lastSeekTime = now;

      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        onPartyEvent({
          eventType: 'seek',
          videoTime: videoElement.currentTime,
          playbackRate: videoElement.playbackRate,
          wasPlaying: !videoElement.paused,
        });
      }, 50);
    };

    const handleRateChange = () => {
      onPartyEvent({
        eventType: 'rate',
        videoTime: videoElement.currentTime,
        playbackRate: videoElement.playbackRate,
      });
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('seeked', handleSeek);
    videoElement.addEventListener('ratechange', handleRateChange);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('seeked', handleSeek);
      videoElement.removeEventListener('ratechange', handleRateChange);
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    };
  }, [videoElement, isHost, onPartyEvent]);
}

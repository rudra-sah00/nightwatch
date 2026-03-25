import { useCallback, useEffect, useState } from 'react';
import { usePlayerContext } from '../../../context/PlayerContext';

const LIVE_EDGE_THRESHOLD_S = 15;

export function usePlayerLiveBadge() {
  const { metadata, videoRef } = usePlayerContext();
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);

  useEffect(() => {
    if (metadata.type !== 'livestream') return;

    const video = videoRef.current;
    if (!video) return;

    const checkEdge = () => {
      // Prefer seekable (HLS DVR window), fall back to buffered
      const src = video.seekable.length > 0 ? video.seekable : video.buffered;
      if (!src.length) return;
      const liveEdge = src.end(src.length - 1);
      const behind = liveEdge - video.currentTime;
      setIsAtLiveEdge(behind <= LIVE_EDGE_THRESHOLD_S);
    };

    video.addEventListener('timeupdate', checkEdge);
    checkEdge();
    return () => video.removeEventListener('timeupdate', checkEdge);
  }, [metadata.type, videoRef]);

  const handleGoLive = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Jump to the live edge using seekable range
    const src = video.seekable.length > 0 ? video.seekable : video.buffered;
    if (!src.length) return;
    video.currentTime = src.end(src.length - 1);
    video.play().catch(() => {});
  }, [videoRef]);

  return { metadata, isAtLiveEdge, handleGoLive };
}

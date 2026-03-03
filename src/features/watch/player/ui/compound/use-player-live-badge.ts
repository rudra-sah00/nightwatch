import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';

const LIVE_EDGE_THRESHOLD_S = 15;

export function usePlayerLiveBadge() {
  const { metadata } = usePlayerContext();
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (metadata.type !== 'livestream') return;

    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) return;
    videoRef.current = video;

    const checkEdge = () => {
      if (!video.buffered.length) return;
      const liveEdge = video.buffered.end(video.buffered.length - 1);
      const behind = liveEdge - video.currentTime;
      setIsAtLiveEdge(behind <= LIVE_EDGE_THRESHOLD_S);
    };

    video.addEventListener('timeupdate', checkEdge);
    checkEdge();
    return () => video.removeEventListener('timeupdate', checkEdge);
  }, [metadata.type]);

  const handleGoLive = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    video.currentTime = video.buffered.end(video.buffered.length - 1);
    video.play().catch(() => {});
  }, []);

  return { metadata, isAtLiveEdge, handleGoLive };
}

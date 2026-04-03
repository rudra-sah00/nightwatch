import { useCallback, useEffect, useRef, useState } from 'react';
import { useSketch } from '../interactions/context/SketchContext';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import { useAudioDucking } from '../media/hooks/useAudioDucking';
import { useWatchPartyFullscreen } from '../room/hooks/useWatchPartyFullscreen';
import { useWatchPartyHostSync } from '../room/hooks/useWatchPartyHostSync';
import type { PartyEvent, WatchPartyRoom } from '../room/types';

interface UseActiveWatchPartyOptions {
  room: WatchPartyRoom;
  isHost: boolean;
  currentUserId?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPartyEvent: (event: PartyEvent) => void;
  onUpdateContent: (content: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  }) => void;
}

export function useActiveWatchParty({
  room,
  isHost,
  currentUserId,
  videoRef,
  onPartyEvent,
  onUpdateContent,
}: UseActiveWatchPartyOptions) {
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  const watchPartyContainerRef = useRef<HTMLDivElement>(null);

  const {
    isSketchMode,
    setIsSketchMode,
    setIsHost,
    setCanDraw,
    videoRef: contextVideoRef,
  } = useSketch();

  const currentMember = room.members.find((m) => m.id === currentUserId);
  const canDraw =
    currentMember?.permissions?.canDraw ??
    room.permissions?.canGuestsDraw ??
    false;

  useEffect(() => {
    setIsHost(isHost);
    setCanDraw(isHost || canDraw);
  }, [isHost, canDraw, setIsHost, setCanDraw]);

  useEffect(() => {
    if (contextVideoRef && videoRef.current) {
      contextVideoRef.current = videoRef.current;
    }
  }, [videoRef, contextVideoRef]);

  const { isFullscreen, toggleFullscreen } = useWatchPartyFullscreen({
    containerRef: watchPartyContainerRef,
  });

  useWatchPartyHostSync({
    videoElement,
    isHost,
    isLive: room.type === 'livestream',
    onPartyEvent,
  });

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check, { passive: true });
    window.addEventListener('orientationchange', check, { passive: true });
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  const [agoraParticipants, setAgoraParticipants] = useState<
    AgoraParticipant[]
  >([]);
  const [userVolume, setUserVolume] = useState(1);
  const isDuckingRef = useRef(false);
  const originalVolumeRef = useRef(1);

  const handleAgoraReady = useCallback(
    (data: { participants: AgoraParticipant[] }) => {
      setAgoraParticipants(data.participants);
    },
    [],
  );

  useEffect(() => {
    if (videoElement && userVolume === 1) {
      const vol = videoElement.volume;
      setUserVolume(vol);
      originalVolumeRef.current = vol;
    }
  }, [videoElement, userVolume]);

  useEffect(() => {
    const video = videoElement;
    if (!video) return;
    let lastUserChange = Date.now();

    const handleVolumeChange = () => {
      const diff = Math.abs(video.volume - userVolume);
      if (diff > 0.01 && !isDuckingRef.current) {
        const now = Date.now();
        if (now - lastUserChange > 500) {
          setUserVolume(video.volume);
          originalVolumeRef.current = video.volume;
          lastUserChange = now;
        }
      }
    };

    video.addEventListener('volumechange', handleVolumeChange);
    return () => video.removeEventListener('volumechange', handleVolumeChange);
  }, [videoElement, userVolume]);

  useAudioDucking({
    videoRef,
    participants: agoraParticipants,
    userVolume,
    duckingFactor: 0.25,
    transitionMs: 200,
    enabled: true,
    isDuckingRef,
  });

  const handleVideoRef = useCallback(
    (ref: HTMLVideoElement | null) => {
      videoRef.current = ref;
      setVideoElement(ref);
    },
    [videoRef],
  );

  const handleNavigate = useCallback(
    (url: string) => {
      if (!isHost) return;
      try {
        const urlObj = new URL(url, 'http://localhost');
        const params = urlObj.searchParams;
        const type = params.get('type') as 'movie' | 'series';
        const title = params.get('title');
        const season = params.get('season');
        const episode = params.get('episode');
        if (type && title) {
          onUpdateContent({
            title: decodeURIComponent(title),
            type,
            season: season ? parseInt(season, 10) : undefined,
            episode: episode ? parseInt(episode, 10) : undefined,
          });
        }
      } catch {
        // Ignore URL parsing errors
      }
    },
    [isHost, onUpdateContent],
  );

  const handleNextEpisode = useCallback(
    (season: number, episode: number) => {
      if (!isHost) return;
      onUpdateContent({ title: room.title, type: 'series', season, episode });
    },
    [isHost, room.title, onUpdateContent],
  );

  return {
    watchPartyContainerRef,
    showDesktopSidebar,
    setShowDesktopSidebar,
    isPortrait,
    isFullscreen,
    toggleFullscreen,
    isSketchMode,
    setIsSketchMode,
    handleVideoRef,
    handleNavigate,
    handleNextEpisode,
    handleAgoraReady,
  };
}

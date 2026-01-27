import type { Participant, Room } from 'livekit-client';
import { useCallback, useEffect, useState } from 'react';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
import { getProxyUrl } from '@/lib/proxy';
import { cn } from '@/lib/utils';
import { useAudioDucking } from '../hooks/useAudioDucking';
import type { ChatMessage, WatchPartyRoom } from '../types';
import { WatchPartySidebar } from './WatchPartySidebar';

interface ActiveWatchPartyProps {
  room: WatchPartyRoom;
  isHost: boolean;
  copied: boolean;
  onKick: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onSync: (time: number, isPlaying: boolean) => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onUpdateContent: (content: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  }) => void;
  currentUserId?: string;
}

export function ActiveWatchParty({
  room,
  currentUserId,
  isHost,
  copied,
  onKick,
  onApprove,
  onReject,
  onCopyLink,
  onLeave,
  onSync,
  videoRef,
  messages,
  onSendMessage,
  onUpdateContent,
}: ActiveWatchPartyProps) {
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [_isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  // LiveKit state for audio ducking
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [liveKitParticipants, setLiveKitParticipants] = useState<Participant[]>(
    [],
  );

  // Handle LiveKit data from sidebar
  const handleLiveKitReady = useCallback(
    (data: { room: Room | null; participants: Participant[] }) => {
      setLiveKitRoom(data.room);
      setLiveKitParticipants(data.participants);
    },
    [],
  );

  // Audio ducking - reduces movie volume when participants speak
  // The hook handles volume transitions automatically
  useAudioDucking({
    videoRef,
    room: liveKitRoom,
    participants: liveKitParticipants,
    normalVolume: 1,
    duckedVolume: 0.25, // Reduce to 25% when someone speaks
    transitionMs: 200,
    enabled: true,
  });

  // Detect mobile and portrait/landscape orientation
  useEffect(() => {
    const checkLayout = () => {
      const mobile =
        window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
      const portrait = window.innerHeight > window.innerWidth;
      setIsMobile(mobile);
      setIsPortrait(portrait);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, []);

  // Auto-show mobile members if new pending members (Host only)
  useEffect(() => {
    if (isHost && isMobile && room.pendingMembers?.length > 0) {
      // Optional: Could auto-expand or show notification
    }
  }, [room.pendingMembers, isHost, isMobile]);

  const metadata: VideoMetadata = {
    title: room.title,
    type: room.type,
    season: room.season,
    episode: room.episode,
    movieId: room.contentId,
    seriesId: room.type === 'series' ? room.contentId : undefined,
    posterUrl: getProxyUrl(room.posterUrl) || '', // Ensure posterUrl is proxied
  };

  const handleNavigate = (url: string) => {
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
    } catch (_error) {
      // Ignore URL parsing errors
    }
  };

  const handleVideoRef = useCallback(
    (ref: HTMLVideoElement | null) => {
      videoRef.current = ref;
      setVideoElement(ref);
    },
    [videoRef],
  );

  // Handle Sync Listeners (Host Only)
  useEffect(() => {
    const ref = videoElement;
    if (!ref || !isHost) return;

    let lastSyncTime = 0;
    const handleSync = () => {
      onSync(ref.currentTime, !ref.paused);
      lastSyncTime = Date.now();
    };

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (!ref.paused && now - lastSyncTime > 1000) {
        handleSync();
      }
    };

    ref.addEventListener('play', handleSync);
    ref.addEventListener('pause', handleSync);
    ref.addEventListener('seeked', handleSync);
    ref.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      ref.removeEventListener('play', handleSync);
      ref.removeEventListener('pause', handleSync);
      ref.removeEventListener('seeked', handleSync);
      ref.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoElement, isHost, onSync]);

  // Render Logic
  // Layout handles both Mobile (Portrait/Landscape) and Desktop via CSS + Minimal JS

  return (
    <div
      className={cn(
        'flex h-[100dvh] w-screen bg-black overflow-hidden',
        // Default: Column (Mobile Portrait), Small+: Row (Landscape/Tablet/Desktop)
        'flex-col sm:flex-row',
      )}
    >
      {/* Sidebar Container */}
      {/* Mobile: Order 2 (Bottom). Desktop: Order 1 (Left) per original design? 
          Wait, original desktop had sidebar on Left? 
          Line 204 says 'order-1'. Video 'order-2'.
          So Desktop: Sidebar Left, Video Right.
          Mobile: Video Top (Order 1), Sidebar Bottom (Order 2).
      */}
      <div
        className={cn(
          'relative overflow-hidden flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-black/40 backdrop-blur-xl z-20',

          // Mobile (Default): Width 100%, Order 2 (Bottom), Flex-1 (Fill rest of height)
          'w-full order-2 flex-1 border-t border-white/10 sm:border-t-0',

          // Desktop (sm+): Width variable, Order 1 (Left), Height 100%, Border Right
          'sm:w-auto sm:h-full sm:order-1 sm:border-r sm:flex-none',

          // Desktop Visibility Toggle
          showDesktopSidebar
            ? 'sm:w-64 lg:w-80 xl:w-96'
            : 'sm:w-0 sm:border-none',
        )}
      >
        <WatchPartySidebar
          room={room}
          currentUserId={currentUserId}
          isHost={isHost}
          onKick={onKick}
          onApprove={onApprove}
          onReject={onReject}
          onCopyLink={onCopyLink}
          onLeave={onLeave}
          linkCopied={copied}
          messages={messages}
          onSendMessage={onSendMessage}
          className="h-full rounded-none border-0 bg-transparent shadow-none"
          onLiveKitReady={handleLiveKitReady}
        />
      </div>

      {/* Main Content Area (Video) */}
      <div
        className={cn(
          'relative min-w-0 bg-black transition-all duration-500',
          // Mobile: Order 1 (Top), Fixed Aspect Ratio
          'w-full aspect-video order-1 shrink-0',

          // Landscape/Desktop (sm+): Order 2 (Right), Fill Height & Width
          'sm:w-auto sm:h-full sm:flex-1 sm:order-2 sm:aspect-auto',
        )}
      >
        <WatchPage
          streamUrl={getProxyUrl(room.streamUrl) || ''}
          metadata={metadata}
          captionUrl={getProxyUrl(room.captionUrl) || null}
          spriteVtt={getProxyUrl(room.spriteVtt)}
          onVideoRef={handleVideoRef}
          readOnly={!isHost}
          isHost={isHost}
          onSidebarToggle={() => setShowDesktopSidebar((prev) => !prev)}
          onNavigate={handleNavigate}
          hideBackButton={true} // Always hide standard back button (handled by sidebar leave or custom header)
        />
      </div>
    </div>
  );
}

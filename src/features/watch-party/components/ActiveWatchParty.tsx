import type { Participant, Room } from 'livekit-client';
import { useCallback, useEffect, useState } from 'react';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
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
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, _setIsFullscreen] = useState(false);
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
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
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
    posterUrl: room.posterUrl || '', // Ensure posterUrl is passed
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
  // We use a unified layout structure with CSS flex-direction changes to preserve the Video Component instance
  // This prevents unmounting/remounting on rotation, which causes auto-play glitches.

  const isMobilePortrait = isMobile && isPortrait && !isFullscreen;
  const isMobileLandscape = isMobile && !isPortrait;

  return (
    <div
      className={cn(
        'flex h-[100dvh] w-screen bg-black overflow-hidden',
        isMobilePortrait ? 'flex-col' : 'flex-row',
      )}
    >
      {/* Sidebar Container */}
      <div
        className={cn(
          'relative overflow-hidden flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-black/40 backdrop-blur-xl z-20',
          // Mobile Portrait: Sidebar at bottom, fills remaining space
          isMobilePortrait
            ? 'w-full flex-1 order-2 border-t border-white/10'
            : cn(
                // Desktop / Mobile Landscape: Sidebar at left
                'h-full order-1 border-r border-white/10',
                showDesktopSidebar
                  ? isMobile
                    ? 'w-64'
                    : 'w-80 lg:w-96'
                  : 'w-0 border-none',
              ),
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
          isMobilePortrait
            ? 'w-full shrink-0 aspect-video order-1' // Portrait: Video top, fixed aspect
            : 'flex-1 h-full order-2', // Landscape/Desktop: Video fills right side
        )}
      >
        <WatchPage
          streamUrl={room.streamUrl}
          metadata={metadata}
          captionUrl={room.captionUrl || null}
          spriteVtt={room.spriteVtt}
          onVideoRef={handleVideoRef}
          readOnly={!isHost}
          isHost={isHost}
          onSidebarToggle={() => setShowDesktopSidebar((prev) => !prev)}
          onNavigate={handleNavigate}
          hideBackButton={true} // Always hide standard back button (handled by sidebar leave or custom header)
          mobileHeaderContent={
            isMobileLandscape ? (
              <button
                type="button"
                onClick={() => setShowDesktopSidebar((prev) => !prev)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                {/* We use a simple icon for the mobile header toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Party</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
              </button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMobileDetection } from '@/features/watch/page/useMobileDetection';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
import { cn } from '@/lib/utils';
import type { AgoraParticipant } from '../hooks/useAgora';
import { useAudioDucking } from '../hooks/useAudioDucking';
import type { ChatMessage, PartyEvent, WatchPartyRoom } from '../types';
import { FloatingEmojis } from './interactions/FloatingEmojis';
import { WatchPartySidebar } from './WatchPartySidebar';

interface TypingUser {
  userId: string;
  userName: string;
}

interface ActiveWatchPartyProps {
  room: WatchPartyRoom;
  isHost: boolean;
  copied: boolean;
  onKick: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onConfirmLeave: () => void;
  showLeaveDialog: boolean;
  onShowLeaveDialog: (show: boolean) => void;
  onPartyEvent: (event: PartyEvent) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onUpdateContent: (content: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  }) => void;
  currentUserId?: string;
  typingUsers?: TypingUser[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
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
  onConfirmLeave,
  showLeaveDialog,
  onShowLeaveDialog,
  onPartyEvent,
  videoRef,
  messages,
  onSendMessage,
  onUpdateContent,
  typingUsers = [],
  onTypingStart,
  onTypingStop,
}: ActiveWatchPartyProps) {
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);
  const isMobile = useMobileDetection();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  // Ref for the outer watch party container (fullscreen target)
  const watchPartyContainerRef = useRef<HTMLDivElement>(null);

  // True browser fullscreen — hides URL bar, keeps sidebar & audio intact
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const container = watchPartyContainerRef.current as
        | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> })
        | null;

      // Exit if already fullscreen
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        return;
      }

      // Enter fullscreen
      if (container) {
        if (container.requestFullscreen) {
          await container.requestFullscreen({ navigationUI: 'hide' });
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
      }
    } catch {
      toast.error('Failed to toggle fullscreen');
    }
  }, []);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
      };
      setIsFullscreen(
        !!document.fullscreenElement || !!doc.webkitFullscreenElement,
      );
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
    };
  }, []);

  // Agora state for audio ducking
  const [agoraParticipants, setAgoraParticipants] = useState<
    AgoraParticipant[]
  >([]);

  // Handle Agora data from sidebar
  const handleAgoraReady = useCallback(
    (data: { participants: AgoraParticipant[] }) => {
      setAgoraParticipants(data.participants);
    },
    [],
  );

  // Audio ducking - reduces movie volume when participants speak
  // The hook handles volume transitions automatically
  const [userVolume, setUserVolume] = useState(1);
  const isDuckingRef = useRef(false);
  const originalVolumeRef = useRef(1); // Store original volume before ducking

  // Initialize user volume from video element when it becomes available
  useEffect(() => {
    if (videoElement && userVolume === 1) {
      const vol = videoElement.volume;
      setUserVolume(vol);
      originalVolumeRef.current = vol;
    }
  }, [videoElement, userVolume]);

  // Track video volume changes from user controls (not from ducking)
  useEffect(() => {
    const video = videoElement;
    if (!video) return;

    let lastUserChange = Date.now();

    const handleVolumeChange = () => {
      // Only update userVolume if:
      // 1. Not currently ducking
      // 2. Volume is significantly different (user manually changed it)
      const volumeDiff = Math.abs(video.volume - userVolume);
      const isUserChange = volumeDiff > 0.01 && !isDuckingRef.current;

      if (isUserChange) {
        const now = Date.now();
        // Debounce: only if it's been > 500ms since last user change
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
    duckingFactor: 0.25, // Reduce to 25% when someone speaks
    transitionMs: 200,
    enabled: true,
    isDuckingRef,
  });

  // Detect portrait/landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation, { passive: true });
    window.addEventListener('orientationchange', checkOrientation, {
      passive: true,
    });
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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

    let syncDebounceTimer: NodeJS.Timeout | null = null;
    let lastSeekTime = 0;

    // Handle Play
    const handlePlay = () => {
      onPartyEvent({
        eventType: 'play',
        videoTime: ref.currentTime,
        playbackRate: ref.playbackRate,
      });
    };

    // Handle Pause
    const handlePause = () => {
      onPartyEvent({
        eventType: 'pause',
        videoTime: ref.currentTime,
      });
    };

    // Handle Seek
    const handleSeek = () => {
      const now = Date.now();
      if (now - lastSeekTime < 50) return; // Debounce rapid seek events
      lastSeekTime = now;

      // Use timeout to coalesce rapid seeking (scrubbing)
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

      syncDebounceTimer = setTimeout(() => {
        onPartyEvent({
          eventType: 'seek',
          videoTime: ref.currentTime,
          playbackRate: ref.playbackRate,
          wasPlaying: !ref.paused,
        });
      }, 50);
    };

    // Handle Rate Change
    const handleRateChange = () => {
      onPartyEvent({
        eventType: 'rate',
        videoTime: ref.currentTime,
        playbackRate: ref.playbackRate,
      });
    };

    ref.addEventListener('play', handlePlay);
    ref.addEventListener('pause', handlePause);
    ref.addEventListener('seeked', handleSeek);
    ref.addEventListener('ratechange', handleRateChange);

    return () => {
      ref.removeEventListener('play', handlePlay);
      ref.removeEventListener('pause', handlePause);
      ref.removeEventListener('seeked', handleSeek);
      ref.removeEventListener('ratechange', handleRateChange);
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    };
  }, [videoElement, isHost, onPartyEvent]);

  // Render Logic
  // Layout handles both Mobile (Portrait/Landscape) and Desktop via CSS + Minimal JS
  const _isMobilePortrait = isMobile && isPortrait && !isFullscreen;
  // Note: We keep isMobilePortrait for specific specific sizing tweaks, but main layout is now CSS-first
  const _isMobileLandscape = isMobile && !isPortrait;

  return (
    <div
      ref={watchPartyContainerRef}
      className={cn(
        'flex h-[100dvh] w-screen bg-black overflow-hidden relative',
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
          'relative overflow-hidden flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-black/40 backdrop-blur-xl z-30',

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
          onAgoraReady={handleAgoraReady}
          typingUsers={typingUsers}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </div>

      {/* Main Content Area (Video) */}
      <div
        className={cn(
          'relative min-w-0 bg-black transition-all duration-500 watch-party-video',
          // Mobile: Order 1 (Top), Fixed Aspect Ratio
          'w-full aspect-video order-1 shrink-0',

          // Landscape/Desktop (sm+): Order 2 (Right), Fill Height & Width
          'sm:w-auto sm:h-full sm:flex-1 sm:order-2 sm:aspect-auto',
        )}
      >
        {/* Overlay for floating emojis - restricted to video area */}
        <FloatingEmojis />

        <WatchPage
          streamUrl={room.streamUrl}
          metadata={metadata}
          captionUrl={room.captionUrl || null}
          subtitleTracks={room.subtitleTracks}
          spriteVtt={room.spriteVtt}
          onVideoRef={handleVideoRef}
          readOnly={!isHost}
          isHost={isHost}
          isAuthenticated={
            !!currentUserId && !currentUserId.startsWith('guest:')
          }
          onSidebarToggle={() => setShowDesktopSidebar((prev) => !prev)}
          onNavigate={handleNavigate}
          hideBackButton={true}
          fullscreenToggleOverride={toggleFullscreen}
          isFullscreenOverride={isFullscreen}
        />
      </div>

      {/* Leave Confirmation Dialog — must be inside fullscreen container */}
      <AlertDialog open={showLeaveDialog} onOpenChange={onShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isHost ? 'End Watch Party?' : 'Leave Watch Party?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isHost
                ? 'As the host, ending the watch party will close the room for all members. This action cannot be undone.'
                : 'Are you sure you want to leave this watch party? You can rejoin if the host approves.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onShowLeaveDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmLeave}>
              {isHost ? 'End Party' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Fullscreen, Minimize } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
import { cn } from '@/lib/utils';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    } catch (error) {
      // Ignore URL parsing errors
    }
  };

  const handleVideoRef = (ref: HTMLVideoElement | null) => {
    videoRef.current = ref;

    // Guard against null ref (happens when component unmounts)
    if (!ref) return;

    if (isHost) {
      let lastSyncTime = 0;
      const handleSync = () => {
        if (!ref) return;
        onSync(ref.currentTime, !ref.paused);
        lastSyncTime = Date.now();
      };

      const handleTimeUpdate = () => {
        if (!ref) return;
        const now = Date.now();
        if (!ref.paused && now - lastSyncTime > 1000) {
          handleSync();
        }
      };

      ref.addEventListener('play', handleSync);
      ref.addEventListener('pause', handleSync);
      ref.addEventListener('seeked', handleSync);
      ref.addEventListener('timeupdate', handleTimeUpdate);
    }
  };

  // Mobile Portrait Layout - YouTube Style (Video Top, Sidebar Below)
  if (isMobile && isPortrait && !isFullscreen) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen bg-black overflow-hidden">
        {/* Video Player Section - Fixed aspect ratio at top */}
        <div
          className="relative w-full bg-black shrink-0"
          style={{ aspectRatio: '16/9' }}
        >
          {/* Video Header Bar */}
          <div className="absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">
                {metadata.title}
              </h1>
              {metadata.season && metadata.episode && (
                <p className="text-[10px] text-white/60">
                  S{metadata.season}:E{metadata.episode}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ml-2"
              title="Fullscreen"
            >
              <Fullscreen className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Simple Video Element for Portrait Mode */}
          {/* biome-ignore lint/a11y/useMediaCaption: Captions conditionally rendered */}
          <video
            ref={handleVideoRef}
            className="w-full h-full object-contain bg-black"
            src={room.streamUrl || undefined}
            controls={isHost}
            playsInline
            crossOrigin="anonymous"
          >
            {room.captionUrl && (
              <track
                kind="captions"
                src={room.captionUrl}
                label="English"
                srcLang="en"
              />
            )}
            {room.captionUrl && (
              <track
                kind="subtitles"
                src={room.captionUrl}
                srcLang="en"
                label="English"
                default
              />
            )}
          </video>

          {/* Guest Waiting Overlay */}
          {!isHost && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/20 text-xs text-white/80">
                Host controls playback
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Content Below Video - Full Height Remaining */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-gray-900 to-black">
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
          />
        </div>
      </div>
    );
  }

  // Mobile Landscape Layout - Show sidebar like desktop (side by side)
  if (isMobile && !isPortrait) {
    return (
      <div className="flex h-[100dvh] w-screen bg-black overflow-hidden">
        {/* Sidebar - Always visible in landscape, smaller width */}
        <div
          className={cn(
            'relative overflow-hidden h-full flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            showDesktopSidebar
              ? 'w-64 border-r border-white/10'
              : 'w-0 border-none',
          )}
        >
          <div className="absolute top-0 left-0 w-64 h-full bg-black/40 backdrop-blur-xl">
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
              onClose={() => setShowDesktopSidebar(false)}
            />
          </div>
        </div>

        {/* Video Player - Takes remaining space */}
        <div className="flex-1 relative min-w-0 h-full bg-black">
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
          />
        </div>
      </div>
    );
  }

  // If mobile and in fullscreen portrait mode, show like landscape
  if (isMobile && isPortrait && isFullscreen) {
    return (
      <div className="flex h-[100dvh] w-screen bg-black overflow-hidden">
        {/* Full Video with Exit Button */}
        <div className="flex-1 relative min-w-0 h-full bg-black">
          {/* Exit Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm transition-colors border border-white/20"
            title="Exit Fullscreen"
          >
            <Minimize className="w-5 h-5 text-white" />
          </button>

          <WatchPage
            streamUrl={room.streamUrl}
            metadata={metadata}
            captionUrl={room.captionUrl || null}
            spriteVtt={room.spriteVtt}
            onVideoRef={handleVideoRef}
            readOnly={!isHost}
            isHost={isHost}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    );
  }

  // Desktop Layout - Sidebar on left, video on right
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden">
      {/* Desktop Party Sidebar - Resizes Video Area - Smooth Transition */}
      <div
        className={cn(
          'relative overflow-hidden h-full flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          showDesktopSidebar
            ? 'w-80 lg:w-96 border-r border-white/10'
            : 'w-0 border-none',
        )}
      >
        <div className="absolute top-0 left-0 w-80 lg:w-96 h-full bg-black/40 backdrop-blur-xl">
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
            onClose={() => setShowDesktopSidebar(false)}
          />
        </div>
      </div>

      {/* Main Content Area (Video) */}
      <div className="flex-1 relative min-w-0 h-full bg-black">
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
        />
      </div>
    </div>
  );
}

import dynamic from 'next/dynamic';
import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { useActiveWatchParty } from '../hooks/use-active-watch-party';
import type { ChatMessage, PartyEvent, WatchPartyRoom } from '../room/types';
import { WatchPartyVideoArea } from './WatchPartyVideoArea';

const WatchPartySidebar = dynamic(
  () => import('./WatchPartySidebar').then((mod) => mod.WatchPartySidebar),
  { ssr: false },
);

const FloatingChat = dynamic(
  () =>
    import('../chat/components/FloatingChat').then((mod) => mod.FloatingChat),
  { ssr: false },
);

interface TypingUser {
  userId: string;
  userName: string;
}

// Stable empty array — prevents new reference on every parent render (rule 5.4)
const EMPTY_TYPING_USERS: TypingUser[] = [];

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
  typingUsers = EMPTY_TYPING_USERS,
  onTypingStart,
  onTypingStop,
}: ActiveWatchPartyProps) {
  const {
    watchPartyContainerRef,
    showDesktopSidebar,
    setShowDesktopSidebar,
    isFullscreen,
    toggleFullscreen,
    isSketchMode,
    setIsSketchMode,
    handleVideoRef,
    handleNavigate,
    handleNextEpisode,
    handleAgoraReady,
  } = useActiveWatchParty({
    room,
    isHost,
    currentUserId,
    videoRef,
    onPartyEvent,
    onUpdateContent,
  });

  // ── Floating chat toggle (personal preference, persisted) ──────────────
  // Lazy initializer reads localStorage before first paint — no flicker
  const [floatingChatEnabled, setFloatingChatEnabled] = useState(() => {
    try {
      return localStorage.getItem('wp:floatingChat') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFloatingChat = () => {
    setFloatingChatEnabled((prev) => {
      try {
        localStorage.setItem('wp:floatingChat', String(!prev));
      } catch {
        /* ignore */
      }
      return !prev;
    });
  };

  // Whether the current user is permitted to send chat messages
  const currentMember = room.members.find((m) => m.id === currentUserId);
  const canChatInParty =
    isHost ||
    (currentMember?.permissions?.canChat ??
      room.permissions?.canGuestsChat ??
      true);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={watchPartyContainerRef}
      className={cn(
        'flex flex-row h-[100dvh] w-screen bg-black overflow-hidden relative',
      )}
    >
      {/* Sidebar */}
      <div
        className={cn(
          'relative overflow-hidden flex-shrink-0 transition-[width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-black/40 backdrop-blur-xl z-30',
          'h-full order-1 flex-none border-r border-white/10',
          showDesktopSidebar ? 'w-64 lg:w-80 xl:w-96' : 'w-0 border-none',
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
          onTabChange={(tab) => setIsSketchMode(tab === 'sketch')}
          floatingChatEnabled={floatingChatEnabled}
          onToggleFloatingChat={handleToggleFloatingChat}
        />
      </div>

      {/* Video Area */}
      <div
        className={cn(
          'relative min-w-0 bg-black transition-[width] duration-500 watch-party-video',
          'h-full flex-1 order-2',
        )}
      >
        <WatchPartyVideoArea
          room={room}
          isHost={isHost}
          isFullscreen={isFullscreen}
          isSketchMode={isSketchMode}
          onVideoRef={handleVideoRef}
          onNavigate={handleNavigate}
          onSidebarToggle={() => setShowDesktopSidebar((prev) => !prev)}
          toggleFullscreen={toggleFullscreen}
          onNextEpisode={
            isHost && room.type === 'series' ? handleNextEpisode : undefined
          }
        />
      </div>

      {/* Floating chat overlay — text-only, no background, bottom-right */}
      {!showDesktopSidebar && floatingChatEnabled ? (
        <FloatingChat
          messages={messages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          canChat={canChatInParty}
        />
      ) : null}

      {/* Leave Confirmation Dialog */}
      {showLeaveDialog ? (
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
      ) : null}
    </div>
  );
}

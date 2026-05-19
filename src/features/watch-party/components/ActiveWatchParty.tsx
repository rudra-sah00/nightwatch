import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useActiveWatchParty } from '../hooks/use-active-watch-party';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import type { ChatMessage, PartyEvent, WatchPartyRoom } from '../room/types';
import { FloatingParticipants } from './FloatingParticipants';
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

/** Props for the {@link ActiveWatchParty} component. */
interface ActiveWatchPartyProps {
  room: WatchPartyRoom;
  currentUserId: string | undefined;
  currentUserName?: string;
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
  typingUsers?: TypingUser[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  rtmSendMessage?: (msg: RTMMessage) => Promise<void>;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => Promise<void>;
}

/**
 * Top-level layout component for an active watch party session.
 *
 * Composes the sidebar (chat, participants, soundboard, sketch), the video
 * area, floating chat overlay, and the leave-confirmation dialog into a
 * full-screen split layout. Manages fullscreen toggling, floating chat
 * persistence, and sketch-mode state.
 */
export function ActiveWatchParty({
  room,
  currentUserId,
  currentUserName: propUserName,
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
  rtmSendMessage,
  rtmSendMessageToPeer,
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
    participants: agoraParticipants,
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

  // ── Floating tiles toggle (personal preference, persisted) ─────────────
  const [floatingTilesEnabled, setFloatingTilesEnabled] = useState(() => {
    try {
      return localStorage.getItem('wp:floatingTiles') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleFloatingTiles = () => {
    setFloatingTilesEnabled((prev) => {
      try {
        localStorage.setItem('wp:floatingTiles', String(!prev));
      } catch {
        /* ignore */
      }
      return !prev;
    });
  };

  const handleTabChange = useCallback(
    (tab: 'chat' | 'participants' | 'soundboard' | 'sketch') => {
      setIsSketchMode(tab === 'sketch');
    },
    [setIsSketchMode],
  );

  // Whether the current user is permitted to send chat messages
  const { user } = useAuth();
  const t = useTranslations('party');
  const tAria = useTranslations('party.aria');
  const currentMember = room.members.find((m) => m.id === currentUserId);
  const currentUserName =
    currentMember?.name ||
    propUserName ||
    user?.name ||
    (isHost
      ? t('roles.host')
      : currentUserId?.startsWith('guest')
        ? t('roles.guest')
        : t('roles.member'));

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
        'flex flex-row h-[100dvh] w-screen bg-background overflow-hidden relative',
      )}
    >
      {/* Sidebar */}
      <aside
        aria-label={tAria('partySidebar')}
        aria-hidden={!showDesktopSidebar}
        className={cn(
          'relative overflow-hidden flex-shrink-0 transition-[width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-background z-30',
          'h-full order-1 flex-none border-r-4 border-border',
          showDesktopSidebar ? 'w-64 lg:w-80 xl:w-96' : 'w-0 border-none',
        )}
      >
        <WatchPartySidebar
          room={room}
          currentUserId={currentUserId}
          isHost={isHost}
          isFullscreen={isFullscreen}
          onKick={onKick}
          onApprove={onApprove}
          onReject={onReject}
          onCopyLink={onCopyLink}
          onLeave={onLeave}
          linkCopied={copied}
          messages={messages}
          onSendMessage={onSendMessage}
          className="h-full rounded-none border-0 shadow-none"
          onAgoraReady={handleAgoraReady}
          typingUsers={typingUsers}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          onTabChange={handleTabChange}
          floatingChatEnabled={floatingChatEnabled}
          onToggleFloatingChat={handleToggleFloatingChat}
          floatingTilesEnabled={floatingTilesEnabled}
          onToggleFloatingTiles={handleToggleFloatingTiles}
          isVisible={showDesktopSidebar}
          rtmSendMessage={rtmSendMessage}
          rtmSendMessageToPeer={rtmSendMessageToPeer}
          currentUserName={currentUserName}
        />
      </aside>

      {/* Video Area */}
      <main
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
          isSidebarOpen={showDesktopSidebar}
          toggleFullscreen={toggleFullscreen}
          onNextEpisode={
            isHost && room.type === 'series' ? handleNextEpisode : undefined
          }
          rtmSendMessage={rtmSendMessage}
          rtmSendMessageToPeer={rtmSendMessageToPeer}
          userId={currentUserId}
          currentUserName={currentUserName}
        />

        {/* Floating participant tiles when sidebar is closed */}
        {!showDesktopSidebar &&
        floatingTilesEnabled &&
        agoraParticipants.length > 0 ? (
          <FloatingParticipants participants={agoraParticipants} />
        ) : null}
      </main>

      {/* Floating chat overlay — text-only, no background, bottom-right */}
      {!showDesktopSidebar && floatingChatEnabled ? (
        <FloatingChat
          messages={messages}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onSendMessage={onSendMessage}
          canChat={canChatInParty}
        />
      ) : null}

      {/* Leave Confirmation Dialog */}
      {showLeaveDialog ? (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center backdrop-blur-sm bg-black/40"
          onClick={() => onShowLeaveDialog(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onShowLeaveDialog(false);
          }}
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="alertdialog"
            className="flex flex-col items-center gap-4 text-center"
          >
            <span className="text-6xl mb-2">{isHost ? '🫠' : '👋'}</span>
            <h2 className="font-black font-headline uppercase tracking-tight text-xl text-white">
              {isHost ? t('dialog.endTitle') : t('dialog.leaveTitle')}
            </h2>
            <p className="text-white/40 text-xs font-headline font-bold uppercase tracking-wider max-w-xs">
              {isHost ? t('dialog.endDesc') : t('dialog.leaveDesc')}
            </p>
            <div className="flex items-center gap-6 mt-4">
              <button
                type="button"
                onClick={() => onShowLeaveDialog(false)}
                className="text-white/60 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-white"
              >
                {t('dialog.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirmLeave}
                className="text-red-400 text-xs font-headline font-bold uppercase tracking-wider cursor-pointer hover:text-red-300"
              >
                {isHost ? t('dialog.endParty') : t('dialog.leave')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

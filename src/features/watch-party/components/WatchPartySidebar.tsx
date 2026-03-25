import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  WatchPartyChat,
  WatchPartyChatDisabled,
} from '../chat/components/WatchPartyChat';
// Hooks
import { useWatchPartySidebar } from '../hooks/use-watch-party-sidebar';
import {
  Soundboard,
  SoundboardDisabled,
} from '../interactions/components/Soundboard';
import {
  WatchPartySketch,
  WatchPartySketchDisabled,
} from '../interactions/components/WatchPartySketch';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
// Types
import type { ChatMessage, WatchPartyRoom } from '../room/types';
// Components
import { MediaControls } from './MediaControls';
import { PendingRequests } from './PendingRequests';
import { SidebarTabs } from './SidebarTabs';
import { VideoGrid } from './VideoGrid';

/**
 * Represents a user currently typing in the chat.
 */

interface TypingUser {
  userId: string;
  userName: string;
}

// Stable empty array — prevents new reference on every parent render (rule 5.4)
const EMPTY_TYPING_USERS: TypingUser[] = [];

interface WatchPartySidebarProps {
  room: WatchPartyRoom;
  messages: ChatMessage[];
  currentUserId?: string;
  isHost: boolean;
  onKick: (userId: string) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
  linkCopied: boolean;
  className?: string;
  onAgoraReady?: (data: { participants: AgoraParticipant[] }) => void;
  typingUsers?: TypingUser[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onTabChange?: (
    tab: 'chat' | 'participants' | 'soundboard' | 'sketch',
  ) => void;
  /** Whether the floating chat overlay is enabled (shown when sidebar is closed) */
  floatingChatEnabled?: boolean;
  onToggleFloatingChat?: () => void;
  // Theme sync from RTM
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  currentUserName?: string;
}

/**
 * Main sidebar component for the Watch Party feature.
 * Handles tab navigation between chat and participants, as well as Agora media integration.
 */

export const WatchPartySidebar = memo(function WatchPartySidebar({
  room,
  messages,
  currentUserId,
  isHost,
  onKick,
  onApprove,
  onReject,
  onCopyLink,
  onLeave,
  onSendMessage,
  linkCopied,
  className,
  onAgoraReady,
  typingUsers = EMPTY_TYPING_USERS,
  onTypingStart,
  onTypingStop,
  onTabChange,
  floatingChatEnabled = false,
  onToggleFloatingChat,
  rtmSendMessage,
  currentUserName: currentUserNameProp,
}: WatchPartySidebarProps) {
  const {
    activeTab,
    setActiveTab,
    currentUserName: currentUserNameFromHook,
    canDraw,
    canPlaySound,
    canChat,
    participants,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    isAgoraConnected,
  } = useWatchPartySidebar({
    room,
    currentUserId,
    onTabChange,
    onAgoraReady,
    rtmSendMessage,
  });

  const currentUserName = currentUserNameProp || currentUserNameFromHook;

  return (
    <div
      className={cn(
        'w-full bg-[#f5f0e8] overflow-hidden flex flex-col h-full relative border-l-[4px] border-[#1a1a1a] theme-wp-sidebar',
        className,
      )}
    >
      {/* Tab Navigation */}
      <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[#f5f0e8]">
        {/* Participants Tab - renders first */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out bg-[#f5f0e8]',
            activeTab === 'participants'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {/* Pending Requests (Host Only) */}
          {isHost && room.pendingMembers && room.pendingMembers.length > 0 ? (
            <PendingRequests
              pendingMembers={room.pendingMembers}
              onApprove={onApprove}
              onReject={onReject}
            />
          ) : null}

          {/* Video Grid with profile photos */}
          <VideoGrid
            participants={participants}
            currentUserId={currentUserId}
            hostId={room.hostId}
            isHost={isHost}
            onKick={onKick}
          />
        </div>

        {/* Chat Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out bg-[#f5f0e8]',
            activeTab === 'chat'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {isHost || canChat ? (
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              typingUsers={typingUsers}
              onTypingStart={onTypingStart}
              onTypingStop={onTypingStop}
            />
          ) : (
            <WatchPartyChatDisabled
              messages={messages}
              currentUserId={currentUserId}
            />
          )}
        </div>

        {/* Soundboard Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out p-4 bg-[#f5f0e8]',
            activeTab === 'soundboard'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {isHost || canPlaySound ? (
            <Soundboard
              rtmSendMessage={rtmSendMessage}
              userId={currentUserId}
              userName={currentUserName}
            />
          ) : (
            <SoundboardDisabled />
          )}
        </div>

        {/* Sketch Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out bg-[#f5f0e8]',
            activeTab === 'sketch'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {isHost || canDraw ? (
            <WatchPartySketch />
          ) : (
            <WatchPartySketchDisabled />
          )}
        </div>
      </div>

      {/* Media Controls Footer */}
      <MediaControls
        room={room}
        userName={currentUserName}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        audioInputDevices={audioInputDevices}
        selectedAudioDevice={selectedAudioDevice}
        onSwitchAudioDevice={switchAudioDevice}
        videoEnabled={videoEnabled}
        onToggleVideo={toggleVideo}
        videoInputDevices={videoInputDevices}
        selectedVideoDevice={selectedVideoDevice}
        onSwitchVideoDevice={switchVideoDevice}
        isHost={isHost}
        linkCopied={linkCopied}
        onCopyLink={onCopyLink}
        onLeave={onLeave}
        floatingChatEnabled={floatingChatEnabled}
        onToggleFloatingChat={onToggleFloatingChat}
        isAgoraConnected={isAgoraConnected}
        rtmSendMessage={rtmSendMessage}
      />
    </div>
  );
});

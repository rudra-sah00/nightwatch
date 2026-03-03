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
  typingUsers = [],
  onTypingStart,
  onTypingStop,
  onTabChange,
}: WatchPartySidebarProps) {
  const {
    activeTab,
    setActiveTab,
    currentUserName,
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
  } = useWatchPartySidebar({ room, currentUserId, onTabChange, onAgoraReady });

  return (
    <div
      className={cn(
        'w-full bg-zinc-950/95 backdrop-blur-xl border-l border-white/5 shadow-2xl overflow-hidden flex flex-col h-full relative',
        className,
      )}
    >
      {/* Tab Navigation */}
      <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Participants Tab - renders first */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out',
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
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out',
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
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out p-4',
            activeTab === 'soundboard'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {isHost || canPlaySound ? <Soundboard /> : <SoundboardDisabled />}
        </div>

        {/* Sketch Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-[opacity,transform] duration-250 ease-out',
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
      />
    </div>
  );
});

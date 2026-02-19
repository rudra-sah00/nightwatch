import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AgoraParticipant } from '../hooks/useAgora';
// Hooks
import { useAgora } from '../hooks/useAgora';
import { useAgoraToken } from '../hooks/useAgoraToken';
import { useGestureDetection } from '../hooks/useGestureDetection';

// Types
import type { ChatMessage, WatchPartyRoom } from '../types';
import { Soundboard } from './interactions/Soundboard';
// Components
import { MediaControls } from './MediaControls';
import { PendingRequests } from './PendingRequests';
import { SidebarTabs } from './SidebarTabs';
import { VideoGrid } from './VideoGrid';
import { WatchPartyChat } from './WatchPartyChat';

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
}

/**
 * Main sidebar component for the Watch Party feature.
 * Handles tab navigation between chat and participants, as well as Agora media integration.
 */

export function WatchPartySidebar({
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
}: WatchPartySidebarProps) {
  // Tab state - participants first
  const [activeTab, setActiveTab] = useState<
    'chat' | 'participants' | 'interactions'
  >('participants');

  // Get current user's name for display
  const currentUserName =
    room.members.find((m) => m.id === currentUserId)?.name || 'You';

  // Stabilise members reference — only rebuild when member IDs or names change,
  // not on every room state update (playback position, etc.)
  const stableMembers = useMemo(
    () =>
      room.members.map(({ id, name, profilePhoto }) => ({
        id,
        name,
        profilePhoto,
      })),
    [room.members],
  );

  // Agora token fetch
  const { token, appId, channel, uid } = useAgoraToken({
    roomId: room?.id,
    userId: currentUserId,
    userName: currentUserName,
  });

  // Agora connection and media controls
  const {
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
    localVideoTrack,
  } = useAgora({
    token,
    appId,
    channel,
    uid,
    members: stableMembers,
    userId: currentUserId,
  });

  // Initialize gesture detection - now runs automatically when camera is on
  useGestureDetection(localVideoTrack);

  // Use ref for callback to avoid effect re-runs on parent re-renders
  const onAgoraReadyRef = useRef(onAgoraReady);
  onAgoraReadyRef.current = onAgoraReady;

  // Notify parent about Agora participants — only when the list identity changes
  useEffect(() => {
    onAgoraReadyRef.current?.({ participants });
  }, [participants]);

  return (
    <div
      className={cn(
        'w-full bg-zinc-950/95 backdrop-blur-xl border-l border-white/5 shadow-2xl overflow-hidden flex flex-col h-full relative',
        className,
      )}
    >
      {/* Tab Navigation */}
      <SidebarTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        participantCount={participants.length}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Participants Tab - renders first */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-all duration-250 ease-out',
            activeTab === 'participants'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          {/* Pending Requests (Host Only) */}
          {isHost && room.pendingMembers && room.pendingMembers.length > 0 && (
            <PendingRequests
              pendingMembers={room.pendingMembers}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}

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
            'absolute inset-0 flex flex-col transition-all duration-250 ease-out',
            activeTab === 'chat'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          <WatchPartyChat
            messages={messages}
            currentUserId={currentUserId}
            onSendMessage={onSendMessage}
            typingUsers={typingUsers}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
          />
        </div>

        {/* Interactions Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-all duration-250 ease-out p-4',
            activeTab === 'interactions'
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-[0.98] pointer-events-none z-0',
          )}
        >
          <Soundboard />
        </div>
      </div>

      {/* Media Controls Footer */}
      <MediaControls
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
}

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Hooks
import { useLiveKit } from '../hooks/useLiveKit';
import { useLiveKitToken } from '../hooks/useLiveKitToken';

// Types
import type { ChatMessage, WatchPartyRoom } from '../types';

// Components
import { MediaControls } from './MediaControls';
import { PendingRequests } from './PendingRequests';
import { SidebarTabs } from './SidebarTabs';
import { VideoGrid } from './VideoGrid';
import { WatchPartyChat } from './WatchPartyChat';

// ============================================
// Props Interface
// ============================================

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
  onLiveKitReady?: (data: {
    room: import('livekit-client').Room | null;
    participants: import('livekit-client').Participant[];
  }) => void;
}

// ============================================
// Main Component
// ============================================

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
  onLiveKitReady,
}: WatchPartySidebarProps) {
  // Tab state - participants first
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>(
    'participants',
  );

  // Get current user's name for display
  const currentUserName =
    room.members.find((m) => m.id === currentUserId)?.name || 'You';

  // LiveKit token fetch
  const { token, liveKitUrl } = useLiveKitToken({
    roomId: room?.id,
    userId: currentUserId,
    userName: currentUserName,
  });

  // LiveKit connection and media controls
  const {
    room: liveKitRoom,
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
  } = useLiveKit(token, liveKitUrl);

  // Notify parent about LiveKit state for audio ducking
  useEffect(() => {
    onLiveKitReady?.({ room: liveKitRoom, participants });
  }, [liveKitRoom, participants, onLiveKitReady]);

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
          />
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

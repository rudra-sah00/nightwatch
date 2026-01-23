import { useState } from 'react';
import { cn } from '@/lib/utils';

// Hooks
import { useLiveKit } from '../hooks/useLiveKit';
import { useLiveKitToken } from '../hooks/useLiveKitToken';

// Types
import type { ChatMessage, WatchPartyRoom } from '../types';

// Components
import { MediaControls } from './MediaControls';
import { PartyActions } from './PartyActions';
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
  onClose?: () => void;
}

// ============================================
// Main Component
// ============================================

export function WatchPartySidebar({
  room,
  messages,
  currentUserId,
  isHost,

  onApprove,
  onReject,
  onCopyLink,
  onLeave,
  onSendMessage,
  linkCopied,
  className,
  onClose,
}: WatchPartySidebarProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');

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

  return (
    <div
      className={cn(
        'w-full bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-hidden flex flex-col h-full relative',
        className,
      )}
    >
      {/* Tab Navigation */}
      <SidebarTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        participantCount={room.members.length}
        onClose={onClose}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Chat Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-all duration-300 ease-out',
            activeTab === 'chat'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-4 pointer-events-none',
          )}
        >
          <WatchPartyChat
            messages={messages}
            currentUserId={currentUserId}
            onSendMessage={onSendMessage}
          />
        </div>

        {/* Participants Tab */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col transition-all duration-300 ease-out',
            activeTab === 'participants'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4 pointer-events-none',
          )}
        >
          {/* Pending Requests (Host Only) */}
          {isHost && room.pendingMembers && (
            <PendingRequests
              pendingMembers={room.pendingMembers}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}

          {/* Video Grid */}
          <VideoGrid
            participants={participants}
            currentUserId={currentUserId}
          />

          {/* Party Actions */}
          <PartyActions
            isHost={isHost}
            linkCopied={linkCopied}
            onCopyLink={onCopyLink}
            onLeave={onLeave}
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
      />
    </div>
  );
}

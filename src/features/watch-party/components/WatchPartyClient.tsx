'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SketchProvider } from '@/features/watch-party/interactions/context/SketchContext';
import type { RoomPreview } from '@/features/watch-party/room/types';
import { useWatchPartyClient } from '../hooks/use-watch-party-client';

// Dynamic imports for heavy watch party components
const ActiveWatchParty = dynamic(
  () =>
    import('@/features/watch-party/components/ActiveWatchParty').then((m) => ({
      default: m.ActiveWatchParty,
    })),
  { ssr: false },
);

const WatchPartyLobby = dynamic(
  () =>
    import('@/features/watch-party/components/WatchPartyLobby').then((m) => ({
      default: m.WatchPartyLobby,
    })),
  { ssr: false },
);

interface WatchPartyClientProps {
  roomId: string;
  isNewParty: boolean;
  initialRoomPreview: RoomPreview | null;
  initialRoomNotFound: boolean;
}

export function WatchPartyClient({
  roomId,
  isNewParty,
  initialRoomPreview,
  initialRoomNotFound,
}: WatchPartyClientProps) {
  const {
    user,
    room,
    isLoading,
    partyError,
    partyErrorCode,
    isConnected,
    requestStatus,
    isGuestSocketReady,
    isHost,
    currentUserId,
    roomPreview,
    roomNotFound,
    videoRef,
    guestName,
    setGuestName,
    copied,
    captchaToken,
    setCaptchaToken,
    showLeaveDialog,
    setShowLeaveDialog,
    messages,
    typingUsers,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    emitEvent,
    updateContent,
    approveMember,
    rejectMember,
    kickUser,
    handleJoin,
    handleCancelRequest,
    handleLeave,
    confirmLeave,
    copyInviteLink,
  } = useWatchPartyClient({
    roomId,
    isNewParty,
    initialRoomPreview,
    initialRoomNotFound,
  });

  if (!isGuestSocketReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <WatchPartyLobby
        roomPreview={null}
        isLoading={false}
        error={null}
        requestStatus="idle"
        roomNotFound={true}
        user={user}
        guestName=""
        onGuestNameChange={() => {}}
        onJoin={() => {}}
        onLeave={() => {}}
      />
    );
  }

  if (isConnected && room) {
    return (
      <SketchProvider>
        <ActiveWatchParty
          room={room}
          currentUserId={currentUserId}
          isHost={isHost}
          copied={copied}
          onKick={kickUser}
          onApprove={approveMember}
          onReject={rejectMember}
          onCopyLink={copyInviteLink}
          onLeave={handleLeave}
          onConfirmLeave={confirmLeave}
          showLeaveDialog={showLeaveDialog}
          onShowLeaveDialog={setShowLeaveDialog}
          onPartyEvent={emitEvent}
          videoRef={videoRef}
          messages={messages}
          onSendMessage={sendMessage}
          onUpdateContent={updateContent}
          typingUsers={typingUsers}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </SketchProvider>
    );
  }

  return (
    <WatchPartyLobby
      roomPreview={roomPreview}
      isLoading={isLoading}
      error={partyError}
      errorCode={partyErrorCode}
      requestStatus={requestStatus}
      roomNotFound={false}
      user={user}
      guestName={guestName}
      onGuestNameChange={setGuestName}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onCancelRequest={handleCancelRequest}
      captchaToken={captchaToken}
      onCaptchaVerify={setCaptchaToken}
    />
  );
}

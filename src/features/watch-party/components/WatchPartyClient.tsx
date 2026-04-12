'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { WatchPartyLoading } from '@/features/watch-party/components/WatchPartyLoading';
import { SketchProvider } from '@/features/watch-party/interactions/context/SketchContext';
import type { RoomPreview } from '@/features/watch-party/room/types';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
    isCreator,
    currentUserId,
    currentUserName,
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
    rtmSendMessage,
    rtmSendMessageToPeer,
    handleJoin,
    handleCancelRequest,
    handleLeave,
    confirmLeave,
    handleCopyLink,
  } = useWatchPartyClient({
    roomId,
    isNewParty,
    initialRoomPreview,
    initialRoomNotFound,
  });

  useEffect(() => {
    // Prefetch ActiveWatchParty while request is pending for instant flip upon approval
    if (requestStatus === 'pending') {
      import('@/features/watch-party/components/ActiveWatchParty');
    }
  }, [requestStatus]);

  const isMobile = useIsMobile();

  if (!isGuestSocketReady) {
    return <WatchPartyLoading message="Connecting to watch party…" />;
  }

  if (roomNotFound) {
    return (
      <WatchPartyLobby
        roomPreview={roomPreview}
        isLoading={isLoading}
        error={partyError}
        errorCode={partyErrorCode}
        requestStatus={requestStatus}
        roomNotFound={true}
        user={user}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onCancelRequest={handleCancelRequest}
        captchaToken={captchaToken}
        onCaptchaVerify={setCaptchaToken}
        isMobile={isMobile}
      />
    );
  }

  // Creator (host) is setting up — skip the lobby pending state entirely
  if (isCreator && !isConnected) {
    return <WatchPartyLoading message="Setting up your party…" />;
  }

  if (isConnected && room) {
    return (
      <SketchProvider>
        <ActiveWatchParty
          room={room}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isHost={isHost}
          copied={copied}
          onKick={kickUser}
          onApprove={approveMember}
          onReject={rejectMember}
          onCopyLink={handleCopyLink}
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
          rtmSendMessage={rtmSendMessage}
          rtmSendMessageToPeer={rtmSendMessageToPeer}
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
      isMobile={isMobile}
    />
  );
}

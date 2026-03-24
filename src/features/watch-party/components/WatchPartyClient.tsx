'use client';

import { Users } from 'lucide-react'; // Re-adding this import as it's used in the component
import dynamic from 'next/dynamic';
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
    copyInviteLink,
  } = useWatchPartyClient({
    roomId,
    isNewParty,
    initialRoomPreview,
    initialRoomNotFound,
  });

  const isMobile = useIsMobile();

  if (!isGuestSocketReady) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-white/50 text-sm font-medium tracking-wide">
            Connecting to watch party…
          </span>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-white/50 text-sm font-medium tracking-wide">
            Setting up your party…
          </span>
        </div>
      </div>
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

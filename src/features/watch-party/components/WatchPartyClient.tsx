'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { WatchPartyLoading } from '@/features/watch-party/components/WatchPartyLoading';
import { SketchProvider } from '@/features/watch-party/interactions/context/SketchContext';
import type { RoomPreview } from '@/features/watch-party/room/types';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDesktopNotifications } from '../hooks/use-desktop-notifications';
import { useWatchPartyClient } from '../hooks/use-watch-party-client';

// Dynamic imports for heavy watch party components
/**
 * Dynamically imported `ActiveWatchParty` component (client-only, no SSR).
 */
const ActiveWatchParty = dynamic(
  () =>
    import('@/features/watch-party/components/ActiveWatchParty').then((m) => ({
      default: m.ActiveWatchParty,
    })),
  { ssr: false },
);

/**
 * Dynamically imported `WatchPartyLobby` component (client-only, no SSR).
 */
const WatchPartyLobby = dynamic(
  () =>
    import('@/features/watch-party/components/WatchPartyLobby').then((m) => ({
      default: m.WatchPartyLobby,
    })),
  { ssr: false },
);

/**
 * Props for the {@link WatchPartyClient} component.
 */
interface WatchPartyClientProps {
  /** Unique identifier of the watch party room. */
  roomId: string;
  /** Whether this is a freshly created party (triggers auto-join and toast). */
  isNewParty: boolean;
  /** Server-fetched room preview data for the lobby, or `null` if unavailable. */
  initialRoomPreview: RoomPreview | null;
  /** Whether the room was not found during server-side lookup. */
  initialRoomNotFound: boolean;
}

/**
 * Top-level client component orchestrating the entire watch party experience.
 *
 * Manages the lifecycle from socket connection through lobby, pending request,
 * and active party states. Dynamically imports heavy sub-components, handles
 * desktop notifications, and delegates all room logic to {@link useWatchPartyClient}.
 *
 * @param props - Room ID, creation flag, and server-fetched initial data.
 * @returns The appropriate watch party view based on connection and room state.
 */
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

  useDesktopNotifications({
    room,
    isConnected,
    messages: messages || [],
    currentUserId,
  });

  const t = useTranslations('party');
  const isMobile = useIsMobile();

  if (!isGuestSocketReady) {
    return <WatchPartyLoading message={t('loading.connecting')} />;
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
    return <WatchPartyLoading message={t('loading.settingUp')} />;
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

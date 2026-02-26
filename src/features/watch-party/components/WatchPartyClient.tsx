'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SketchProvider } from '@/features/watch-party/context/SketchContext';
import { usePredictiveSync } from '@/features/watch-party/hooks/usePredictiveSync';
import { useWatchParty } from '@/features/watch-party/hooks/useWatchParty';
import type { RoomPreview } from '@/features/watch-party/types';
import { useAuth } from '@/providers/auth-provider';
import { useSocket } from '@/providers/socket-provider';

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
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected: isSocketConnected, connectGuest } = useSocket();

  const [roomPreview, _setRoomPreview] = useState<RoomPreview | null>(
    initialRoomPreview,
  );
  const [roomNotFound, _setRoomNotFound] = useState(initialRoomNotFound);
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [movieEndWarningShown, setMovieEndWarningShown] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomCreationTimeRef = useRef<number>(0);
  const isHostRef = useRef(false);

  // Ensure guest socket is connected for unauthenticated users
  const hasConnectedGuest = useRef(false);
  useEffect(() => {
    if (!user && !hasConnectedGuest.current) {
      hasConnectedGuest.current = true;
      connectGuest();
    }
  }, [user, connectGuest]);

  const isGuestSocketReady = !!user || isSocketConnected;

  const {
    room,
    isLoading,
    error: partyError,
    errorCode: partyErrorCode,
    requestJoin,
    leaveRoom,
    cancelRequest,
    emitEvent,
    clockOffset,
    isCalibrated,
    isConnected,
    requestStatus,
    approveMember,
    rejectMember,
    kickUser,

    messages,
    typingUsers,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    updateContent,
  } = useWatchParty({
    onStateUpdate: (state) => {
      if (isHostRef.current) return;
      applyState(state);
    },
    userId: user?.id,
  });

  const { applyState } = usePredictiveSync(videoRef, clockOffset, isCalibrated);

  const isHost = user?.id === room?.hostId;
  isHostRef.current = isHost;
  const prevMemberCount = useRef(0);

  const currentUserId = useMemo(() => {
    if (user?.id) return user.id;
    const token =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('guest_token')
        : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub as string | undefined;
      } catch (_e) {
        /* invalid token */
      }
    }
    return socket?.id ? `guest:${socket.id}` : undefined;
  }, [user?.id, socket?.id]);

  useEffect(() => {
    if (room && !roomCreationTimeRef.current) {
      roomCreationTimeRef.current = room.createdAt;
    }
  }, [room]);

  useEffect(() => {
    if (!room || !isHost) return;

    const checkDuration = () => {
      const now = Date.now();
      const duration = now - roomCreationTimeRef.current;
      const threeHours = 3 * 60 * 60 * 1000;

      if (duration >= threeHours) {
        toast.info('Watch party has reached 3-hour limit and will now end.');
        setTimeout(() => {
          leaveRoom();
          router.push('/home');
        }, 3000);
      }
    };

    const interval = setInterval(checkDuration, 60 * 1000);
    return () => clearInterval(interval);
  }, [room, isHost, leaveRoom, router]);

  useEffect(() => {
    if (!room || !isHost || room.type !== 'movie' || !videoRef.current) return;

    const video = videoRef.current;

    const checkMovieProgress = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      const timeRemaining = video.duration - video.currentTime;
      if (
        timeRemaining <= 15 * 60 &&
        timeRemaining > 14 * 60 &&
        !movieEndWarningShown
      ) {
        setMovieEndWarningShown(true);
        toast.warning(
          'This watch party will automatically end when the movie finishes.',
          { duration: 8000 },
        );
      }
    };

    const handleMovieEnd = () => {
      toast.info('Movie has ended. Closing watch party...');
      setTimeout(() => {
        leaveRoom();
        router.push('/home');
      }, 3000);
    };

    video.addEventListener('timeupdate', checkMovieProgress, { passive: true });
    video.addEventListener('ended', handleMovieEnd, { passive: true });

    return () => {
      video.removeEventListener('timeupdate', checkMovieProgress);
      video.removeEventListener('ended', handleMovieEnd);
    };
  }, [room, isHost, movieEndWarningShown, leaveRoom, router]);

  // Auto-rejoin for authenticated users on mount
  const hasAttemptedAutoJoin = useRef(false);
  useEffect(() => {
    if (
      user &&
      !room &&
      requestStatus === 'idle' &&
      !hasAttemptedAutoJoin.current &&
      !roomNotFound
    ) {
      hasAttemptedAutoJoin.current = true;
      requestJoin(roomId);
    }
  }, [user, room, requestStatus, requestJoin, roomId, roomNotFound]);

  useEffect(() => {
    if (!room) return;
    if (room.members.length > prevMemberCount.current) {
      if (isHost && videoRef.current) {
        const currentRef = videoRef.current;
        const sendSync = () => {
          if (currentRef) {
            emitEvent({
              eventType: currentRef.paused ? 'pause' : 'play',
              videoTime: currentRef.currentTime,
              playbackRate: currentRef.playbackRate,
            });
          }
        };
        setTimeout(sendSync, 500);
        setTimeout(sendSync, 1000);
        setTimeout(sendSync, 2000);
      }
    }
    prevMemberCount.current = room.members.length;
  }, [room?.members, isHost, room, emitEvent]);

  useEffect(() => {
    if (
      user &&
      isNewParty &&
      roomId &&
      !room &&
      !isLoading &&
      requestStatus === 'idle' &&
      !hasAttemptedAutoJoin.current
    ) {
      hasAttemptedAutoJoin.current = true;
      requestJoin(roomId);
      toast.success('Party created! Invite friends via the sidebar.', {
        duration: 5000,
      });
    }
  }, [isNewParty, roomId, room, isLoading, requestStatus, requestJoin, user]);

  useEffect(() => {
    if (isNewParty && requestStatus === 'joined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNewParty, requestStatus]);

  const handleJoin = async () => {
    if (!user && !guestName.trim()) {
      toast.error('Please enter your name to join');
      return;
    }
    await requestJoin(
      roomId,
      user ? undefined : guestName,
      user ? undefined : captchaToken || undefined,
    );
  };

  const handleCancelRequest = () => {
    cancelRequest(() => {
      if (!user) {
        router.push('/login');
      } else {
        router.push('/home');
      }
    });
  };

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    leaveRoom();
    router.push('/home');
  };

  const copyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

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

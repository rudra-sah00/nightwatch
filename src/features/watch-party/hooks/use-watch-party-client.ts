import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePredictiveSync } from '@/features/watch-party/room/hooks/usePredictiveSync';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import type {
  PartyStateUpdate,
  RoomPreview,
} from '@/features/watch-party/room/types';
import { useAuth } from '@/providers/auth-provider';
import { useSocket } from '@/providers/socket-provider';

interface UseWatchPartyClientOptions {
  roomId: string;
  isNewParty: boolean;
  initialRoomPreview: RoomPreview | null;
  initialRoomNotFound: boolean;
}

export function useWatchPartyClient({
  roomId,
  isNewParty,
  initialRoomPreview,
  initialRoomNotFound,
}: UseWatchPartyClientOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    socket,
    isConnected: isSocketConnected,
    connectGuest,
    disconnect,
  } = useSocket();

  const [roomPreview] = useState<RoomPreview | null>(initialRoomPreview);
  const [roomNotFound] = useState(initialRoomNotFound);
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [movieEndWarningShown, setMovieEndWarningShown] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomCreationTimeRef = useRef<number>(0);
  const isHostRef = useRef(false);

  const hasConnectedGuest = useRef(false);
  useEffect(() => {
    if (!user && !hasConnectedGuest.current) {
      hasConnectedGuest.current = true;
      connectGuest();
    }
    return () => {
      if (!user && hasConnectedGuest.current) {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectGuest, disconnect, user]);

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
    onStateUpdate: (state: PartyStateUpdate) => {
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
          {
            duration: 8000,
          },
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

  const handleLeave = () => setShowLeaveDialog(true);

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

  return {
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
  };
}

'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { checkRoomExists } from '@/features/watch-party/api';
import { usePredictiveSync } from '@/features/watch-party/hooks/usePredictiveSync'; // New
import type { RoomPreview } from '@/features/watch-party/types';
import { useWatchParty } from '@/features/watch-party/useWatchParty';
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

export default function WatchPartyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WatchPartyContent />
    </Suspense>
  );
}

function WatchPartyContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected: isSocketConnected, connectGuest } = useSocket();
  const searchParams = useSearchParams();

  const roomId = (params.id as string)?.toUpperCase();
  const isNewParty = searchParams.get('new') === 'true';

  const [roomPreview, setRoomPreview] = useState<RoomPreview | null>(null);
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [movieEndWarningShown, setMovieEndWarningShown] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomCreationTimeRef = useRef<number>(0);
  // Track host status in a ref so onStateUpdate closure always has the latest value
  const isHostRef = useRef(false);

  // Ensure guest socket is connected for unauthenticated users
  // Only run once on mount — do NOT depend on `socket` (it changes after connectGuest,
  // which would re-trigger this effect and cause an infinite loop).
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
      // Host is source of truth — never adjust host playback from server echoes.
      // Without this guard the host's own state_update echoes back, applyState
      // tweaks playbackRate, which fires a native 'ratechange' event, which emits
      // another party:event, creating an infinite loop.
      if (isHostRef.current) return;
      applyState(state);
    },
    userId: user?.id,
  });

  // predictive sync hook
  const { applyState } = usePredictiveSync(videoRef, clockOffset, isCalibrated);

  const isHost = user?.id === room?.hostId;
  isHostRef.current = isHost;
  const prevMemberCount = useRef(0);

  // Stable userId for guests — parse JWT once, not on every render
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

  // Store room creation time
  useEffect(() => {
    if (room && !roomCreationTimeRef.current) {
      roomCreationTimeRef.current = room.createdAt;
    }
  }, [room]);

  // Auto-end watch party after 3 hours
  useEffect(() => {
    if (!room || !isHost) return;

    const checkDuration = () => {
      const now = Date.now();
      const duration = now - roomCreationTimeRef.current;
      const threeHours = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

      if (duration >= threeHours) {
        toast.info('Watch party has reached 3-hour limit and will now end.');
        setTimeout(() => {
          leaveRoom();
          router.push('/home');
        }, 3000);
      }
    };

    // Check every minute
    const interval = setInterval(checkDuration, 60 * 1000);
    return () => clearInterval(interval);
  }, [room, isHost, leaveRoom, router]);

  // Auto-end for movies when playback finishes + show warning 15 min before end
  useEffect(() => {
    if (!room || !isHost || room.type !== 'movie' || !videoRef.current) return;

    const video = videoRef.current;

    const checkMovieProgress = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;

      const timeRemaining = video.duration - video.currentTime;

      // Show warning at 15 minutes before end (once)
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

  // Check if room exists (and auto-rejoin for authenticated users) (and auto-rejoin for authenticated users)
  useEffect(() => {
    if (!roomId) return;

    // Already in the room — skip room existence checks.
    // Without this guard, every `room` state update (play/pause/seek sync)
    // re-runs this effect, sets isCheckingRoom=true, unmounts ActiveWatchParty,
    // destroys HLS.js / Agora, and causes seekbar to reset to 0.
    if (requestStatus === 'joined') return;

    const checkRoom = async () => {
      setIsCheckingRoom(true);
      try {
        const result = await checkRoomExists(roomId);
        if (result.exists && result.preview) {
          setRoomPreview(result.preview);

          // Auto-rejoin: if authenticated user and not already in a room, silently rejoin.
          // This covers page reload — the backend returns the room directly for existing members.
          if (
            user &&
            !room &&
            requestStatus === 'idle' &&
            !hasAttemptedAutoJoin.current
          ) {
            hasAttemptedAutoJoin.current = true;
            requestJoin(roomId);
          }
        } else {
          setRoomNotFound(true);
        }
      } catch (_err) {
        // Silently fail or handle error if needed
      } finally {
        setIsCheckingRoom(false);
      }
    };

    checkRoom();
  }, [roomId, user, room, requestStatus, requestJoin]);

  // Host Auto-Sync for New Members
  useEffect(() => {
    if (!room) return;

    if (room.members.length > prevMemberCount.current) {
      if (isHost && videoRef.current) {
        const currentRef = videoRef.current;
        // Send sync multiple times to ensure new member receives it
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

  // Auto-join for Host (Only if authenticated — creating a new party)
  const hasAttemptedAutoJoin = useRef(false);
  useEffect(() => {
    if (
      user && // Only auto-join if authenticated
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

  // Strip ?new=true from URL once joined so page reloads go through the
  // normal rejoin path instead of re-triggering the "party created" flow.
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
    // Pass captcha token for guest users
    await requestJoin(
      roomId,
      user ? undefined : guestName,
      user ? undefined : captchaToken || undefined,
    );
  };

  const handleCancelRequest = () => {
    cancelRequest(() => {
      // Navigate to login for guests, home for users
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

  // Render Logic
  if (isCheckingRoom || !isGuestSocketReady) {
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
    );
  }

  // Default Lobby View (Request Join / Pending / Rejected)
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

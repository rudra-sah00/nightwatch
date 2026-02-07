'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkRoomExists } from '@/features/watch-party/api';
import { usePredictiveSync } from '@/features/watch-party/hooks/usePredictiveSync'; // New
import type { RoomPreview } from '@/features/watch-party/types';
import { useWatchParty } from '@/features/watch-party/useWatchParty';
import { getSocket, initSocket } from '@/lib/ws';
import { useAuth } from '@/providers/auth-provider';

import type { User } from '@/types';

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

// Hook to handle guest socket initialization
function useGuestSocket(user: User | null) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user) {
      setIsReady(true);
      return;
    }

    const existingSocket = getSocket();
    // Force re-init if guest token exists but socket has no query param for it (optional optimization)
    // But initSocket handles it. We just need to ensure initSocket is called.

    if (!existingSocket?.connected) {
      initSocket(undefined, undefined, true); // Initialize as guest
    }
    setIsReady(true);

    return () => {
      // Don't disconnect on unmount to prevent flickering on navigation
      // But page refresh disconnects anyway.
    };
  }, [user]);

  return isReady;
}

export default function WatchPartyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
  const isGuestSocketReady = useGuestSocket(user);
  const roomCreationTimeRef = useRef<number>(0);

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
      // Defer to predictive sync hook
      applyState(state);
    },
    userId: user?.id,
  });

  // predictive sync hook
  const { applyState } = usePredictiveSync(videoRef, clockOffset, isCalibrated);

  const isHost = user?.id === room?.hostId;
  const prevMemberCount = useRef(0);

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

  // Warn host before leaving/reloading page
  useEffect(() => {
    if (!isHost || !room) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message =
        'Are you sure you want to leave? The watch party room will be closed for all members.';
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isHost, room]);

  // Check if room exists
  useEffect(() => {
    if (!roomId) return;

    // If it's a brand new party being created by an authenticated user,
    // we don't need to check existence yet as the room is still being established.
    if (isNewParty && user) {
      setIsCheckingRoom(false);
      return;
    }

    const checkRoom = async () => {
      setIsCheckingRoom(true);
      try {
        const result = await checkRoomExists(roomId);
        if (result.exists && result.preview) {
          setRoomPreview(result.preview);
          // If room is full, show a toast but still allow to view lobby
          if (result.preview.isFull) {
            toast.warning('This watch party is currently full.');
          }
        } else {
          setRoomNotFound(true);
          // Don't show toast here - the WatchPartyLobby component already displays
          // the error message in the UI, and WebSocket events have their own toasts
        }
      } catch (_err) {
        // Silently fail or handle error if needed
      } finally {
        setIsCheckingRoom(false);
      }
    };

    checkRoom();
  }, [roomId, isNewParty, user]);

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

  // Auto-join for Host (Only if authenticated)
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
      <>
        <ActiveWatchParty
          room={room}
          currentUserId={
            user?.id ||
            (() => {
              const token =
                typeof window !== 'undefined'
                  ? sessionStorage.getItem('guest_token')
                  : null;
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  return payload.sub;
                } catch (_e) {}
              }
              return getSocket()?.id ? `guest:${getSocket()?.id}` : undefined;
            })()
          }
          isHost={isHost}
          copied={copied}
          onKick={kickUser}
          onApprove={approveMember}
          onReject={rejectMember}
          onCopyLink={copyInviteLink}
          onLeave={handleLeave}
          onPartyEvent={emitEvent}
          videoRef={videoRef}
          messages={messages}
          onSendMessage={sendMessage}
          onUpdateContent={updateContent}
          typingUsers={typingUsers}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />

        {/* Leave Confirmation Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isHost ? 'End Watch Party?' : 'Leave Watch Party?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isHost
                  ? 'As the host, ending the watch party will close the room for all members. This action cannot be undone.'
                  : 'Are you sure you want to leave this watch party? You can rejoin if the host approves.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmLeave}>
                {isHost ? 'End Party' : 'Leave'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
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

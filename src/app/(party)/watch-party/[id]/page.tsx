'use client';

import { Loader2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { checkRoomExists } from '@/features/watch-party/api';
import { ActiveWatchParty } from '@/features/watch-party/components/ActiveWatchParty';
import { WatchPartyLobby } from '@/features/watch-party/components/WatchPartyLobby';
import type {
  PartyStateUpdate,
  RoomPreview,
} from '@/features/watch-party/types';
import { useWatchParty } from '@/features/watch-party/useWatchParty';
import { disconnectSocket, getSocket, initSocket } from '@/lib/ws';
import { useAuth } from '@/providers/auth-provider';

import type { User } from '@/types';

// Hook to handle guest socket initialization
function useGuestSocket(user: User | null) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user) {
      setIsReady(true);
      return;
    }

    const existingSocket = getSocket();
    if (!existingSocket?.connected) {
      initSocket(undefined, undefined, true); // Initialize as guest
    }
    setIsReady(true);

    return () => {
      if (!user) {
        disconnectSocket();
      }
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isGuestSocketReady = useGuestSocket(user);

  // Handle state updates from host (for guests)
  const handleStateUpdate = useCallback((state: PartyStateUpdate) => {
    if (videoRef.current) {
      // Sync time if more than 0.5 seconds off
      const timeDiff = Math.abs(
        videoRef.current.currentTime - state.currentTime,
      );
      if (timeDiff > 0.5) {
        videoRef.current.currentTime = state.currentTime;
      }

      // Sync play/pause
      if (state.isPlaying && videoRef.current.paused) {
        videoRef.current.play();
      } else if (!state.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, []);

  const {
    room,
    isLoading,
    error: partyError,
    requestJoin,
    leaveRoom,
    sync,
    isConnected,
    requestStatus,
    approveMember,
    rejectMember,
    kickUser,

    messages,
    sendMessage,
    updateContent,
  } = useWatchParty({
    onStateUpdate: handleStateUpdate,
  });

  const isHost = user?.id === room?.hostId;
  const prevMemberCount = useRef(0);

  // Check if room exists
  useEffect(() => {
    if (!roomId) return;
    if (isNewParty) {
      setIsCheckingRoom(false);
      return;
    }

    const checkRoom = async () => {
      setIsCheckingRoom(true);
      const result = await checkRoomExists(roomId);
      if (result.exists && result.preview) {
        setRoomPreview(result.preview);
        // If room is full, show a toast but still allow to view lobby
        if (result.preview.isFull) {
          toast.warning('This watch party is currently full.');
        }
      } else {
        setRoomNotFound(true);
        // Show specific error message from backend
        if (result.message) {
          toast.error(result.message);
        }
      }
      setIsCheckingRoom(false);
    };

    checkRoom();
  }, [roomId, isNewParty]);

  // Host Auto-Sync for New Members
  useEffect(() => {
    if (!room) return;

    if (room.members.length > prevMemberCount.current) {
      if (isHost && videoRef.current) {
        const currentRef = videoRef.current;
        // Send sync multiple times to ensure new member receives it
        const sendSync = () => {
          if (currentRef) {
            sync(currentRef.currentTime, !currentRef.paused);
          }
        };
        setTimeout(sendSync, 500);
        setTimeout(sendSync, 1000);
        setTimeout(sendSync, 2000);
      }
    }
    prevMemberCount.current = room.members.length;
  }, [room?.members, isHost, sync, room]);

  // Auto-join for Host
  const hasAttemptedAutoJoin = useRef(false);
  useEffect(() => {
    if (
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
  }, [isNewParty, roomId, room, isLoading, requestStatus, requestJoin]);

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

  const handleLeave = () => {
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
        currentUserId={
          user?.id || (getSocket()?.id ? `guest:${getSocket()?.id}` : undefined)
        }
        isHost={isHost}
        copied={copied}
        onKick={kickUser}
        onApprove={approveMember}
        onReject={rejectMember}
        onCopyLink={copyInviteLink}
        onLeave={handleLeave}
        onSync={sync}
        videoRef={videoRef}
        messages={messages}
        onSendMessage={sendMessage}
        onUpdateContent={updateContent}
      />
    );
  }

  // Default Lobby View (Request Join / Pending / Rejected)
  return (
    <WatchPartyLobby
      roomPreview={roomPreview}
      isLoading={isLoading}
      error={partyError}
      requestStatus={requestStatus}
      roomNotFound={false}
      user={user}
      guestName={guestName}
      onGuestNameChange={setGuestName}
      onJoin={handleJoin}
      onLeave={handleLeave}
      captchaToken={captchaToken}
      onCaptchaVerify={setCaptchaToken}
    />
  );
}

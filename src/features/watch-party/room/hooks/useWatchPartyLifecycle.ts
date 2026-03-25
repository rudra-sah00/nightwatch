'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  createPartyRoom,
  getPartyStreamToken,
  getRoomDetails,
  leavePartyRoom,
  requestJoinPartyRoom,
} from '../services/watch-party.api';
import type { ChatMessage, PartyCreatePayload, WatchPartyRoom } from '../types';

interface UseWatchPartyLifecycleProps {
  setRoom: React.Dispatch<React.SetStateAction<WatchPartyRoom | null>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setRequestStatus: React.Dispatch<
    React.SetStateAction<'idle' | 'pending' | 'rejected' | 'joined'>
  >;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setErrorCode: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  requestStatus: 'idle' | 'pending' | 'rejected' | 'joined';
  normalizeRoomUrls: (
    room: WatchPartyRoom,
    token: string,
    options?: { injectStream?: boolean },
  ) => WatchPartyRoom;
  room?: WatchPartyRoom | null;
  userId?: string;
  roomId?: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
}
export function useWatchPartyLifecycle({
  setRoom,
  setIsConnected,
  setRequestStatus,
  setMessages,
  setError,
  setErrorCode,
  setIsLoading,
  requestStatus,
  normalizeRoomUrls,
  room,
  userId,
  roomId,
  rtmSendMessage,
}: UseWatchPartyLifecycleProps) {
  // --- REAL-TIME APPROVAL LISTENER (SSE for Guests) ---
  useEffect(() => {
    if (requestStatus !== 'pending' || !userId) return;

    let eventSource: EventSource | null = null;
    const streamUrl = `${
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    }/api/rooms/${roomId || room?.id || 'PENDING'}/stream`;

    const connectSse = () => {
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const payload = data.payload;

          if (data.type === 'JOIN_RESULT' && payload?.userId === userId) {
            if (payload.status === 'approved') {
              // Now that we are approved, we can fetch the full room details (gated API)
              const roomRes = await getRoomDetails(
                roomId || room?.id || 'PENDING',
              );

              if (roomRes) {
                const streamRes = await getPartyStreamToken(roomRes.id);
                const token = streamRes.token || '';
                const normalizedRoom = normalizeRoomUrls(roomRes, token, {
                  injectStream: true,
                });

                setRoom(normalizedRoom);
                setIsConnected(true);
                setRequestStatus('joined');
                toast.success('Your request was approved!');
              } else {
                setError('Failed to fetch room details after approval.');
              }
            } else if (payload.status === 'rejected') {
              setRequestStatus('rejected');
              setError('The host declined your request to join.');
            }

            eventSource?.close();
          }
        } catch (_e) {
          // ignore parsing error for heartbeats/padding
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Retry logic for unstable development connections
        setTimeout(connectSse, 3000);
      };
    };

    connectSse();

    return () => {
      eventSource?.close();
    };
  }, [
    requestStatus,
    userId,
    roomId,
    room?.id,
    normalizeRoomUrls,
    setRoom,
    setIsConnected,
    setRequestStatus,
    setError,
  ]);

  const createRoom = useCallback(
    async (roomId: string, payload: PartyCreatePayload) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      const response = await createPartyRoom(roomId, payload);
      setIsLoading(false);

      if (response.room) {
        const token = response.streamToken || '';
        const normalizedRoom = normalizeRoomUrls(response.room, token);
        setRoom(normalizedRoom);
        setIsConnected(true);
        setRequestStatus('joined');
        return normalizedRoom;
      } else {
        setError(response.error || 'Failed to create room');
        return null;
      }
    },
    [
      setIsLoading,
      setError,
      setErrorCode,
      setRoom,
      setIsConnected,
      setRequestStatus,
      normalizeRoomUrls,
    ],
  );

  const requestJoin = useCallback(
    async (roomId: string, name?: string, captchaToken?: string) => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }

      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setRequestStatus('pending');

      const response = await requestJoinPartyRoom(roomId, {
        roomId,
        name,
        captchaToken,
      });
      setIsLoading(false);

      if (response.error) {
        setError(response.error);
        setRequestStatus('idle');
        return null;
      }

      if (response.status === 'pending') {
        if (response.guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', response.guestToken);
        }
        setRequestStatus('pending');
        return { success: true, status: 'pending' };
      }

      if (response.room) {
        if (response.guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', response.guestToken);
        }

        const streamRes = await getPartyStreamToken(roomId);
        const token = streamRes.token || '';
        const normalizedRoom = normalizeRoomUrls(response.room, token, {
          injectStream: true,
        });

        setRoom(normalizedRoom);
        setIsConnected(true);
        setRequestStatus('joined');
        return { success: true, room: normalizedRoom };
      }

      return null;
    },
    [
      setIsLoading,
      setError,
      setErrorCode,
      setRequestStatus,
      setRoom,
      setIsConnected,
      normalizeRoomUrls,
    ],
  );

  const leaveRoom = useCallback(async () => {
    if (!room?.id) return;

    // If host is leaving, broadcast closure so members can exit immediately
    const isHost = userId === room.hostId;
    if (isHost && rtmSendMessage) {
      // Broadcast to RTM channel before calling backend
      rtmSendMessage({
        type: 'PARTY_CLOSED',
        reason: 'The host has ended the party.',
      });
      // Small buffer to ensure message delivery before backend destroys room
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const response = await leavePartyRoom(room.id);
    if (response.success) {
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      setMessages([]);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
    }
  }, [
    room,
    userId,
    rtmSendMessage,
    setRoom,
    setIsConnected,
    setRequestStatus,
    setMessages,
  ]);

  const cancelRequest = useCallback(
    async (roomId: string, onComplete?: () => void) => {
      if (requestStatus !== 'pending') return;

      const response = await leavePartyRoom(roomId);
      if (response.success) {
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle');
        setMessages([]);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('guest_token');
        }
        toast.info('Join request cancelled');
        onComplete?.();
      }
    },
    [requestStatus, setRoom, setIsConnected, setRequestStatus, setMessages],
  );

  return {
    createRoom,
    requestJoin,
    leaveRoom,
    cancelRequest,
  };
}

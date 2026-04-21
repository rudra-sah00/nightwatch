'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { env } from '@/lib/env';
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
  setAgoraRtmToken: React.Dispatch<
    React.SetStateAction<{ token: string; appId: string; uid: string } | null>
  >;
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
  setAgoraRtmToken,
}: UseWatchPartyLifecycleProps) {
  const t = useTranslations('common.toasts');
  const tp = useTranslations('party.toasts');
  useEffect(() => {
    const guestToken =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('guest_token')
        : null;

    // Derive userId from token if prop is missing (important for Guests in pending state)
    let activeUserId = userId;
    if (!activeUserId && guestToken) {
      try {
        const payloadJSON = JSON.parse(atob(guestToken.split('.')[1]));
        activeUserId = payloadJSON.sub;
      } catch (_e) {
        // invalid token
      }
    }

    if (requestStatus !== 'pending' || !activeUserId) return;

    let tempSocket: ReturnType<typeof io> | null = null;

    const connectSocket = () => {
      const socketUrl =
        env.WS_URL ||
        (env as Record<string, string | undefined>).BACKEND_URL ||
        'ws://localhost:4000';
      tempSocket = io(socketUrl, {
        withCredentials: true,
        query: {
          isGuest: 'true',
          guestToken: guestToken || '',
        },
      });

      tempSocket.on('connect', () => {
        tempSocket?.emit(
          'watch-party:join_room',
          roomId || room?.id || 'PENDING',
        );
      });

      const handleJoinResult = async (payload: {
        userId?: string;
        status?: string;
        room?: WatchPartyRoom;
        streamToken?: string;
        agoraRtmToken?: { token: string; appId: string; uid: string };
      }) => {
        if (payload?.userId === activeUserId) {
          if (payload.status === 'approved') {
            const targetRoomId = roomId || room?.id || 'PENDING';

            // Instant join: Use room data from Socket.IO if available
            let roomRes = payload.room;
            let token = payload.streamToken || payload.room?.streamToken || '';

            if (!roomRes) {
              // FALLBACK: Fetch manually
              const [r, s] = await Promise.all([
                getRoomDetails(targetRoomId),
                getPartyStreamToken(targetRoomId),
              ]).catch(() => [null, { token: '' }]);
              roomRes = r as WatchPartyRoom;
              token = (s as { token?: string })?.token || '';
            }

            if (roomRes) {
              const normalizedRoom = normalizeRoomUrls(roomRes, token, {
                injectStream: true,
              });

              setRoom(normalizedRoom);
              if (payload.agoraRtmToken) {
                setAgoraRtmToken(payload.agoraRtmToken);
              }
              setIsConnected(true);
              setRequestStatus('joined');
              toast.success(t('requestApproved'));
            } else {
              setError(tp('failedFetchRoom'));
            }
          } else if (payload.status === 'rejected') {
            setRequestStatus('rejected');
            setError(tp('hostDeclined'));
          }

          tempSocket?.off('JOIN_RESULT', handleJoinResult);
          tempSocket?.disconnect();
        }
      };

      tempSocket.on('JOIN_RESULT', handleJoinResult);

      tempSocket.on('connect_error', () => {
        // Simple retry logic if unstable
        setTimeout(() => {
          if (!tempSocket?.active) {
            tempSocket?.connect();
          }
        }, 3000);
      });
    };

    connectSocket();

    return () => {
      tempSocket?.disconnect();
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
    setAgoraRtmToken,
    t,
    tp,
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
        setError(response.error || tp('failedCreateRoom'));
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
      tp,
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
        reason: tp('hostEndedParty'),
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
    tp,
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
        toast.info(t('requestCancelled'));
        onComplete?.();
      }
    },
    [requestStatus, setRoom, setIsConnected, setRequestStatus, setMessages, t],
  );

  return {
    createRoom,
    requestJoin,
    leaveRoom,
    cancelRequest,
  };
}

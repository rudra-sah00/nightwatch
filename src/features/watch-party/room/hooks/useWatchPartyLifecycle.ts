'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  createPartyRoom,
  getPartyStreamToken,
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
}: UseWatchPartyLifecycleProps) {
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
        setRequestStatus('pending');
        return { success: true, status: 'pending' };
      }

      if (response.room) {
        if (response.guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', response.guestToken);
        }

        const streamRes = await getPartyStreamToken(roomId);
        const token = streamRes.token || '';
        const normalizedRoom = normalizeRoomUrls(response.room, token);

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
  }, [room?.id, setRoom, setIsConnected, setRequestStatus, setMessages]);

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

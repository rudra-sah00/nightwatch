'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  createPartyRoom,
  getPartyStreamToken,
  leavePartyRoom,
  requestJoinPartyRoom,
} from '../services/watch-party.api';
import type { ChatMessage, WatchPartyRoom } from '../types';

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
}: UseWatchPartyLifecycleProps) {
  const createRoom = useCallback(
    async (payload: Parameters<typeof createPartyRoom>[0]) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      return new Promise<WatchPartyRoom | null>((resolve) => {
        createPartyRoom(payload, (response) => {
          setIsLoading(false);

          if (response.success && response.room) {
            const token = response.streamToken || '';
            const normalizedRoom = normalizeRoomUrls(response.room, token);
            setRoom(normalizedRoom);
            setIsConnected(true);
            setRequestStatus('joined');
            resolve(normalizedRoom);
          } else {
            setError(response.error || 'Failed to create room');
            setErrorCode(response.code || null);
            resolve(null);
          }
        });
      });
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

      return new Promise<{
        success: boolean;
        status?: 'pending';
        room?: WatchPartyRoom;
      } | null>((resolve) => {
        requestJoinPartyRoom({ roomId, name, captchaToken }, (response) => {
          setIsLoading(false);
          if (response.success) {
            if (response.room) {
              if (response.guestToken && typeof window !== 'undefined') {
                sessionStorage.setItem('guest_token', response.guestToken);
              }

              getPartyStreamToken((tokenResponse) => {
                const token =
                  tokenResponse.success && tokenResponse.token
                    ? tokenResponse.token
                    : '';

                const normalizedRoom = normalizeRoomUrls(response.room!, token);

                setRoom(normalizedRoom);
                setIsConnected(true);
                setRequestStatus('joined');
                resolve({ success: true, room: normalizedRoom });
              });
            } else {
              setRequestStatus('pending');
              resolve({ success: true, status: 'pending' });
            }
          } else {
            setError(response.error || 'Failed to join room');
            setErrorCode(response.code || null);
            setRequestStatus('idle');
            resolve(null);
          }
        });
      });
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

  const leaveRoom = useCallback(() => {
    leavePartyRoom(() => {
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      setMessages([]);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
    });
  }, [setRoom, setIsConnected, setRequestStatus, setMessages]);

  const cancelRequest = useCallback(
    (onComplete?: () => void) => {
      if (requestStatus !== 'pending') return;

      leavePartyRoom(() => {
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle');
        setMessages([]);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('guest_token');
        }
        toast.info('Join request cancelled');
        onComplete?.();
      });
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

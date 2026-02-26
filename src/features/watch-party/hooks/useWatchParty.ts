'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import { injectTokenIntoUrl, wrapInProxy } from '../../watch/utils';

import {
  getPartyMessages,
  getPartyStreamToken,
  onPartyClosed,
  onPartyJoinApproved,
  onPartyJoinRejected,
  onPartyKicked,
  requestPartyState,
} from '../services/watch-party.api';
import type { PartyStateUpdate, RoomMember, WatchPartyRoom } from '../types';
import { useClockSync } from './useClockSync';
// Modular Hooks
import { useWatchPartyChat } from './useWatchPartyChat';
import { useWatchPartyLifecycle } from './useWatchPartyLifecycle';
import { useWatchPartyMembers } from './useWatchPartyMembers';
import { useWatchPartySync } from './useWatchPartySync';

/**
 * Normalize room URLs by wrapping captions, sprites, and subtitle tracks through proxy.
 */
function normalizeRoomUrls(
  room: WatchPartyRoom,
  token: string,
  { injectStream = false }: { injectStream?: boolean } = {},
): WatchPartyRoom {
  return {
    ...room,
    ...(injectStream && {
      streamUrl: injectTokenIntoUrl(room.streamUrl, token) || room.streamUrl,
    }),
    captionUrl: room.captionUrl
      ? wrapInProxy(room.captionUrl, token)
      : room.captionUrl,
    spriteVtt: room.spriteVtt
      ? wrapInProxy(room.spriteVtt, token)
      : room.spriteVtt,
    subtitleTracks: (room.subtitleTracks || []).map((track) => ({
      ...track,
      src: wrapInProxy(track.src, token),
    })),
  };
}

interface UseWatchPartyOptions {
  onStateUpdate?: (state: PartyStateUpdate) => void;
  onMemberJoined?: (member: RoomMember) => void;
  userId?: string;
}

export function useWatchParty(options: UseWatchPartyOptions = {}) {
  const router = useRouter();
  const { socket: contextSocket } = useSocket();

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [requestStatus, setRequestStatus] = useState<
    'idle' | 'pending' | 'rejected' | 'joined'
  >('idle');

  const requestStatusRef = useRef(requestStatus);
  requestStatusRef.current = requestStatus;

  // 1. Chat Hook
  const chat = useWatchPartyChat();

  // 2. Lifecycle Hook
  const lifecycle = useWatchPartyLifecycle({
    setRoom,
    setIsConnected,
    setRequestStatus,
    setMessages: chat.setMessages,
    setError,
    setErrorCode,
    setIsLoading,
    requestStatus,
    normalizeRoomUrls,
  });

  // 3. Members Hook
  const members = useWatchPartyMembers({
    room,
    setRoom,
    userId: options.userId,
    socketId: contextSocket?.id,
    onMemberJoined: options.onMemberJoined,
  });

  // 4. Sync Hook
  const sync = useWatchPartySync({
    room,
    setRoom,
    onStateUpdate: options.onStateUpdate,
    normalizeRoomUrls,
  });

  // Clock Synchronization
  const { clockOffset, isCalibrated, calibrate } = useClockSync();

  useEffect(() => {
    if (isConnected && requestStatus === 'joined' && !isCalibrated) {
      calibrate();
    }
  }, [isConnected, requestStatus, isCalibrated, calibrate]);

  // General Lifecycle Listeners (Approved, Rejected, Kicked, Closed)
  useEffect(() => {
    const cleanupJoinApproved = onPartyJoinApproved(
      ({ room: approvedRoom, streamToken, guestToken, initialState }) => {
        if (guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', guestToken);
        }

        // Fetch fresh token for the guest if possible (Phase 8 requirement)
        getPartyStreamToken(
          (response: { success: boolean; token?: string }) => {
            const token =
              response.success && response.token
                ? response.token
                : streamToken || '';

            const normalizedRoom = normalizeRoomUrls(approvedRoom, token, {
              injectStream: true,
            });

            setRoom(normalizedRoom);
            setIsConnected(true);
            setRequestStatus('joined');

            if (initialState && initialState.currentTime != null) {
              optionsRef.current.onStateUpdate?.({
                currentTime: initialState.currentTime,
                videoTime: initialState.videoTime ?? initialState.currentTime,
                isPlaying: initialState.isPlaying,
                playbackRate: initialState.playbackRate ?? 1,
                timestamp: initialState.timestamp ?? Date.now(),
                serverTime: initialState.serverTime ?? Date.now(),
                eventType: 'init',
                fromHost: true,
              });
            }
          },
        );
      },
    );

    const cleanupJoinRejected = onPartyJoinRejected(() => {
      if (requestStatusRef.current === 'pending') {
        setRequestStatus('rejected');
        setError('Host rejected your request');
        setRoom(null);
        setIsConnected(false);
      }
    });

    const cleanupKicked = onPartyKicked(({ reason }) => {
      toast.error(`You were kicked: ${reason}`);
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
    });

    const cleanupClosed = onPartyClosed(() => {
      toast.info('Party finished');
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
      const isGuest =
        typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token') === null &&
        !document.cookie.includes('accessToken');
      router.push(isGuest ? '/login' : '/home');
    });

    return () => {
      cleanupJoinApproved();
      cleanupJoinRejected();
      cleanupKicked();
      cleanupClosed();
    };
  }, [router]);

  // Handle session cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
    };
  }, []);

  // Reconnection and Initial State Sync
  useEffect(() => {
    if (!contextSocket || !isConnected || !room) return;

    const isHost = optionsRef.current.userId === room.hostId;
    if (isHost) return;

    const handleReconnect = () => {
      requestPartyState((response) => {
        if (response.success && response.state) {
          optionsRef.current.onStateUpdate?.(response.state);
        }
      });
    };

    contextSocket.on('connect', handleReconnect);

    const timer1 = setTimeout(() => {
      requestPartyState((response) => {
        if (response.success && response.state) {
          optionsRef.current.onStateUpdate?.(response.state);
        }
      });
      getPartyMessages((response) => {
        if (response.success && response.messages) {
          chat.setMessages(response.messages);
        }
      });
    }, 500);

    const timer2 = setTimeout(() => {
      requestPartyState((response) => {
        if (response.success && response.state) {
          optionsRef.current.onStateUpdate?.(response.state);
        }
      });
    }, 1500);

    return () => {
      contextSocket.off('connect', handleReconnect);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isConnected, room?.id, contextSocket, room, chat.setMessages]);

  return {
    room,
    isLoading,
    error,
    errorCode,
    isConnected,
    requestStatus,
    clockOffset,
    isCalibrated,
    messages: chat.messages,
    typingUsers: chat.typingUsers,
    sendMessage: chat.sendMessage,
    handleTypingStart: chat.handleTypingStart,
    handleTypingStop: chat.handleTypingStop,
    createRoom: lifecycle.createRoom,
    requestJoin: lifecycle.requestJoin,
    cancelRequest: lifecycle.cancelRequest,
    leaveRoom: lifecycle.leaveRoom,
    approveMember: members.approveMember,
    rejectMember: members.rejectMember,
    kickUser: members.kickUser,
    hostDisconnected: sync.hostDisconnected,
    emitEvent: sync.emitEvent,
    updateContent: sync.updateContent,
    sync: (currentTime: number, isPlaying: boolean, playbackRate?: number) => {
      sync.emitEvent({
        eventType: isPlaying ? 'play' : 'pause',
        videoTime: currentTime,
        playbackRate,
      });
    },
  };
}

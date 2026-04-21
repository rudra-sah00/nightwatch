'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { injectTokenIntoUrl, wrapInProxy } from '../../../watch/utils';
// Modular Hooks
import { useWatchPartyChat } from '../../chat/hooks/useWatchPartyChat';
import { useAgoraRtm } from '../../media/hooks/useAgoraRtm';
import { useAgoraRtmToken } from '../../media/hooks/useAgoraRtmToken';
import {
  dispatchRtmMessage,
  getPartyMessages,
  getPartyStreamToken,
} from '../services/watch-party.api';
import type { PartyStateUpdate, RoomMember, WatchPartyRoom } from '../types';
import { useClockSync } from './useClockSync';
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
    // Quality URLs are CDN proxy URLs stored with the host token — pass through
    // unchanged so each member can use the shared stream token to access them.
    qualities: room.qualities,
  };
}

interface UseWatchPartyOptions {
  onStateUpdate?: (state: PartyStateUpdate) => void;
  onMemberJoined?: (member: RoomMember) => void;
  userId?: string;
  roomId?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function useWatchParty(options: UseWatchPartyOptions = {}) {
  const t = useTranslations('common.toasts');
  const tp = useTranslations('party.toasts');
  const tf = useTranslations('party.fallback');
  const router = useRouter();
  const { userId, roomId } = options;

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
  const [agoraRtmToken, setAgoraRtmToken] = useState<{
    token: string;
    appId: string;
    uid: string;
  } | null>(null);

  const requestStatusRef = useRef(requestStatus);
  requestStatusRef.current = requestStatus;

  const { user } = useAuth();
  // 0. Agora RTM Signaling
  const currentUserName =
    room?.members.find((m) => m.id === userId)?.name ||
    user?.name ||
    (userId?.startsWith('guest') ? tf('guest') : tf('member'));

  const rtmToken = useAgoraRtmToken({
    roomId: room?.id,
    userId: userId,
    userName: currentUserName,
    initialTokenData: agoraRtmToken || undefined,
  });

  const {
    isConnected: isRtmConnected,
    sendMessage: rtmSendMessage,
    sendMessageToPeer: rtmSendMessageToPeer,
  } = useAgoraRtm({
    appId: rtmToken.appId,
    token: rtmToken.token || '',
    channel: rtmToken.channel,
    userId: rtmToken.uid,
    onMessage: (msg) => {
      // Route messages to sub-hooks
      chat.handleIncomingRtmMessage(msg);
      members.handleIncomingRtmMessage(msg);
      sync.handleIncomingRtmMessage(msg);

      // Calibrate clock if message contains serverTime
      if ('serverTime' in msg && msg.serverTime) {
        calibrate(msg.serverTime);
      }

      dispatchRtmMessage(msg);

      // Handle main lifecycle messages
      switch (msg.type) {
        case 'JOIN_APPROVED': {
          const { room: approvedRoom, initialState } = msg;

          getPartyStreamToken(approvedRoom.id).then((response) => {
            const token = response.token || msg.streamToken || '';
            const normalizedRoom = normalizeRoomUrls(approvedRoom, token, {
              injectStream: true,
            });

            setRoom(normalizedRoom);
            setIsConnected(true);
            setRequestStatus('joined');

            if (initialState) {
              // Perform initial clock calibration
              if (initialState.serverTime) {
                calibrate(initialState.serverTime);
              }

              optionsRef.current.onStateUpdate?.({
                currentTime: initialState.currentTime ?? 0,
                videoTime:
                  initialState.videoTime ?? initialState.currentTime ?? 0,
                isPlaying: initialState.isPlaying,
                playbackRate: initialState.playbackRate ?? 1,
                timestamp: initialState.timestamp ?? Date.now(),
                serverTime: initialState.serverTime || Date.now(),
                eventType: 'init',
              });
            }
          });
          break;
        }

        case 'JOIN_REJECTED': {
          if (requestStatusRef.current === 'pending') {
            setRequestStatus('rejected');
            setError(msg.reason || tp('hostRejected'));
            setRoom(null);
            setIsConnected(false);
          }
          break;
        }

        case 'KICK': {
          if (msg.targetUserId === userId) {
            toast.error(tp('kicked', { reason: msg.reason }));
            setRoom(null);
            setIsConnected(false);
            setRequestStatus('idle');
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('guest_token');
            }
          }
          break;
        }

        case 'PARTY_CLOSED': {
          toast.info(t('partyFinished'));
          setRoom(null);
          setIsConnected(false);
          setRequestStatus('idle');
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('guest_token');
          }
          router.push(userId ? '/home' : '/login');
          break;
        }
      }
    },
    onPresence: (event) => {
      sync.handlePresenceEvent(event);
      members.handlePresenceEvent(event);
    },
  });

  // 1. Chat Hook
  const chat = useWatchPartyChat({
    room,
    userId,
    rtmSendMessage,
    currentUserName,
  });

  // 2. Lifecycle Hook
  const lifecycle = useWatchPartyLifecycle({
    setRoom,
    setIsConnected,
    setRequestStatus,
    setMessages: chat.setMessages,
    setError: setError,
    setErrorCode: setErrorCode,
    setIsLoading: setIsLoading,
    requestStatus,
    normalizeRoomUrls,
    room,
    userId,
    roomId,
    rtmSendMessage,
    setAgoraRtmToken,
  });

  // 3. Members Hook
  const members = useWatchPartyMembers({
    room,
    setRoom,
    userId: options.userId,
    isHost: userId === room?.hostId,
    rtmSendMessage,
    rtmSendMessageToPeer,
    onMemberJoined: options.onMemberJoined,
    streamToken: room?.streamToken,
    videoRef: options.videoRef,
  });

  // 4. Sync Hook
  const sync = useWatchPartySync({
    room,
    setRoom,
    userId: options.userId,
    rtmSendMessage,
    onStateUpdate: options.onStateUpdate,
    normalizeRoomUrls,
    rtmSendMessageToPeer,
    isHost: userId === room?.hostId,
    videoRef: options.videoRef,
  });

  // Clock Synchronization
  const { clockOffset, isCalibrated, calibrate } = useClockSync();

  // Note: Calibration now happens dynamically via initial state and RTM messages
  useEffect(() => {
    if (isConnected && requestStatus === 'joined' && !isCalibrated) {
      // Initial calibration if needed - though JOIN_APPROVED should have handled it
    }
  }, [isConnected, requestStatus, isCalibrated]);

  // Handle Guest Initial Sync Request
  useEffect(() => {
    const isHost = userId === room?.hostId;
    if (isRtmConnected && !isHost && room?.id && userId) {
      // Small delay to ensure host is ready to process RTM messages
      const timer = setTimeout(() => {
        rtmSendMessage?.({
          type: 'SYNC_REQUEST',
          userId,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRtmConnected, room?.id, userId, rtmSendMessage, room?.hostId]);

  // On connect/reconnect: fetch initial messages
  useEffect(() => {
    if (isRtmConnected && requestStatus === 'joined' && room?.id) {
      getPartyMessages(room.id).then((response) => {
        if (response.messages) {
          chat.setMessages(response.messages);
        }
      });
    }
  }, [isRtmConnected, requestStatus, room?.id, chat.setMessages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }
    };
  }, []);

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
    leaveRoom: async () => {
      if (room?.hostId === userId) {
        // Broadcast to all members that the party is closed
        await rtmSendMessage?.({
          type: 'PARTY_CLOSED',
          reason: tp('hostLeftRoom'),
        });
        // Give RTM a small window to ensure the broadcast is sent before we disconnect
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      return lifecycle.leaveRoom();
    },
    approveMember: members.approveMember,
    rejectMember: members.rejectMember,
    kickUser: members.kickUser,
    hostDisconnected: sync.hostDisconnected,
    emitEvent: sync.emitEvent,
    updateContent: sync.updateContent,
    rtmSendMessage,
    rtmSendMessageToPeer,
    sync: (currentTime: number, isPlaying: boolean, playbackRate?: number) => {
      sync.emitEvent({
        eventType: isPlaying ? 'play' : 'pause',
        videoTime: currentTime,
        playbackRate,
      });
    },
  };
}

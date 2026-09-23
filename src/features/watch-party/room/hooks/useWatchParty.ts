'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
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
import { isPartyHost, normalizeRoomUrls } from '../utils';
import { useClockSync } from './useClockSync';
import { useWatchPartyLifecycle } from './useWatchPartyLifecycle';
import { useWatchPartyMembers } from './useWatchPartyMembers';
import { useWatchPartySync } from './useWatchPartySync';

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

  /**
   * Whether any authoritative party state has reached this client yet.
   *
   * Drives the `SYNC_REQUEST` retry below, so it is written on EVERY state
   * update — including the one carried by `JOIN_APPROVED` — before the update is
   * handed on.
   */
  const hasPartyStateRef = useRef(false);

  /**
   * Records that party state arrived, then forwards it unchanged.
   *
   * Stable identity: `useWatchPartySync` lists `onStateUpdate` in the deps of its
   * RTM handler, and a new function every render would rebuild that handler on
   * every render of the party.
   */
  const handlePartyStateUpdate = useCallback((state: PartyStateUpdate) => {
    hasPartyStateRef.current = true;
    optionsRef.current.onStateUpdate?.(state);
  }, []);

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

          getPartyStreamToken(approvedRoom.id)
            .then((response) => {
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

                handlePartyStateUpdate({
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
            })
            .catch(() => {
              // Fallback: use stream token from the approval message
              const token = msg.streamToken || '';
              const normalizedRoom = normalizeRoomUrls(approvedRoom, token, {
                injectStream: true,
              });
              setRoom(normalizedRoom);
              setIsConnected(true);
              setRequestStatus('joined');
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
          router.push(userId ? '/home' : '/continue');
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
    isHost: isPartyHost(room, userId),
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
    onStateUpdate: handlePartyStateUpdate,
    normalizeRoomUrls,
    rtmSendMessageToPeer,
    isHost: isPartyHost(room, userId),
    videoRef: options.videoRef,
  });

  // Clock Synchronization
  const { clockOffset, isCalibrated, calibrate } = useClockSync();

  /*
    Read as primitives, not off `room`, so the sync-request effect below is keyed
    on the two fields it actually cares about. `room` itself changes identity on
    every state tick and every membership change, which would restart the retry
    cycle several times a minute.
  */
  const syncRoomId = room?.id;
  const syncHostId = room?.hostId;

  // Stream token auto-renewal: refresh at 3.5h to prevent 4h expiry
  useEffect(() => {
    // Narrow fields, not the room object: this effect must not restart every
    // time a member joins or the playback state ticks. Safe against the
    // `undefined === undefined` trap that `isPartyHost` exists for, because it
    // also requires `room?.id`.
    const isHost = userId === room?.hostId;
    if (!isHost || !room?.id || room.type === 'livestream') return;

    const RENEWAL_MS = 3.5 * 60 * 60 * 1000; // 3.5 hours
    const timer = setTimeout(async () => {
      const response = await getPartyStreamToken(room.id);
      if (response.token) {
        rtmSendMessage?.({
          type: 'STREAM_TOKEN',
          token: response.token,
        } as unknown as import('../types/rtm-messages').RTMMessage);
      }
    }, RENEWAL_MS);

    return () => clearTimeout(timer);
  }, [room?.id, room?.hostId, room?.type, userId, rtmSendMessage]);

  /*
    Guest initial sync request — retried until real state arrives.
    A guest's playback state comes from exactly one place: the host's `SYNC`
    reply to this request. `JOIN_APPROVED` also carries `initialState`, but that
    is a PEER message and a pending guest is not on the RTM channel yet (its RTM
    token is derived from `room.id`, which it does not have until it is approved),
    so the guest is normally admitted over Socket.IO `JOIN_RESULT` and never sees
    it.

    This used to be a single `setTimeout`. RTM channel messages are fire and
    forget, and one sent a second after connect can be dropped — as can the
    host's reply — so a lost packet left the guest with no state at all. On VOD
    that self-heals the moment the host touches the scrubber. On live TV nobody
    ever touches anything, so the guest sat on the locked overlay for the rest of
    the party with a healthy stream loaded underneath.

    Bounded, not indefinite: `hasPartyStateRef` is set by
    {@link handlePartyStateUpdate} on the first update from any source, which
    stops the retries. If none of the attempts land, the party has a problem that
    resending cannot fix, and a permanent 3 s poll would be RTM traffic per guest
    for the whole session.
  */
  useEffect(() => {
    if (
      !(isRtmConnected && syncRoomId && userId) ||
      isPartyHost({ hostId: syncHostId ?? '' }, userId)
    ) {
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    const RETRY_MS = 3000;

    const request = () => {
      if (hasPartyStateRef.current) return true;
      rtmSendMessage?.({ type: 'SYNC_REQUEST', userId });
      attempts += 1;
      return false;
    };

    // First attempt keeps the original 1 s grace so the host has settled its own
    // RTM subscription before we ask it anything.
    const initial = setTimeout(request, 1000);
    const interval = setInterval(() => {
      if (hasPartyStateRef.current || attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      request();
    }, RETRY_MS);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [isRtmConnected, syncRoomId, syncHostId, userId, rtmSendMessage]);

  // On connect/reconnect: fetch initial messages
  useEffect(() => {
    if (isRtmConnected && requestStatus === 'joined' && room?.id) {
      getPartyMessages(room.id)
        .then((response) => {
          if (response.messages) {
            const serverMessages = response.messages;
            chat.setMessages((prev) => {
              const serverIds = new Set(serverMessages.map((m) => m.id));
              const newFromRtm = prev.filter((m) => !serverIds.has(m.id));
              return [...serverMessages, ...newFromRtm];
            });
          }
        })
        .catch(() => {});
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
    loadMoreMessages: chat.loadMoreMessages,
    hasMoreMessages: chat.hasMoreMessages,
    isLoadingMoreMessages: chat.isLoadingMore,
    createRoom: lifecycle.createRoom,
    requestJoin: lifecycle.requestJoin,
    cancelRequest: lifecycle.cancelRequest,
    leaveRoom: async () => {
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

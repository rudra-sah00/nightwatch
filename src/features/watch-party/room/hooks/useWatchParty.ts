'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useSocket } from '@/providers/socket-provider';
// Modular Hooks
import { useWatchPartyChat } from '../../chat/hooks/useWatchPartyChat';
import { useAgoraRtm } from '../../media/hooks/useAgoraRtm';
import { useAgoraRtmToken } from '../../media/hooks/useAgoraRtmToken';
import { isRtmMessageAllowed } from '../permissions';
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
   * Tear down this client's party session and leave the page.
   *
   * Shared by the RTM `PARTY_CLOSED` broadcast and the Socket.IO
   * `watch-party:closed` event below, because either can arrive first and
   * whichever does must produce the same result. Idempotent: a second call with
   * the room already cleared is a no-op apart from a duplicate toast, which
   * `sonner` collapses by id.
   */
  const closeParty = useCallback(() => {
    toast.info(t('partyFinished'), { id: 'party-closed' });
    setRoom(null);
    setIsConnected(false);
    setRequestStatus('idle');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('guest_token');
    }
    router.push(userId ? '/home' : '/continue');
  }, [router, userId, t]);

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
  const { socket } = useSocket();
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
    onMessage: (msg, senderId) => {
      /*
        Receiver-side permission enforcement.

        Sketch and soundboard traffic never touches our backend — it is RTM
        channel data, peer to peer, which is what makes the overlay feel
        immediate. That left both permissions enforced only by whether the
        sender's own UI offered the control: a guest with drawing switched off
        could still publish `SKETCH_CLEAR mode:'all'` and wipe the host's canvas
        for the whole party, and a guest barred from the soundboard could still
        publish an `INTERACTION` that every client dutifully played.

        For data that is never persisted the receiver is the right authority and
        is as strong as a server check would be: every client already holds the
        room's authoritative permissions, and a message all receivers drop has
        left nothing behind. `senderId` is the Agora publisher id, so it is the
        authenticated channel identity rather than a payload field a sender could
        edit.

        Chat is gated here too, on top of the server check in
        `ChatService.addMessage`. The two stop different things: the server keeps a
        muted guest out of the durable Redis backlog that late joiners read, and
        this keeps the same line out of the live panel, which RTM would otherwise
        deliver without the server ever seeing it.
      */
      if (!isRtmMessageAllowed(room, senderId, msg)) return;

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
          closeParty();
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

  /*
    Authoritative party closure, over Socket.IO.

    RTM `PARTY_CLOSED` is how a host tells its guests it is ending the party, and
    it is the fast path — but it is one fire-and-forget channel message sent
    moments before the host's own client navigates away. A guest whose RTM
    subscription was mid-reconnect simply never saw it, and sat in a party whose
    Redis room the backend had meanwhile deleted: no state updates, no chat
    history, every REST call 404ing, and no explanation on screen.

    `watch-party:closed` is the server's own statement that the room is gone,
    emitted from `MembershipService.leaveRoom` when the host leaves or the last
    member goes. Socket.IO redelivers on reconnect, so it closes the gap the RTM
    broadcast leaves.

    Joining `room:<id>` is what makes this reachable at all: the only place that
    ever emitted `watch-party:join_room` for an active party was the host-only
    effect in `useWatchPartyMembers`, so no other member was in the server's
    broadcast room and *none* of the server's party events — `MEMBERS_UPDATED`,
    `MEMBER_LEFT`, `CONTENT_UPDATED`, `PERMISSIONS_UPDATED`, this one — could
    reach them.

    Authenticated members only. A guest's socket is opened by
    `use-watch-party-client` before `requestJoin` has run, so it carries no
    `guest_token` and the backend cannot verify it is a member of this room —
    `watch-party:join_room` rejects it with `NOT_A_MEMBER`. Guests therefore still
    depend on the RTM broadcast. Closing that gap means re-initialising the shared
    socket with the guest token after approval, which is a change to the socket
    provider used by friends and presence, not to watch party.
  */
  useEffect(() => {
    if (!(socket && syncRoomId && userId) || userId.startsWith('guest')) return;

    const join = () => socket.emit('watch-party:join_room', syncRoomId);
    const onClosed = () => closeParty();

    join();
    socket.on('connect', join);
    socket.on('watch-party:closed', onClosed);

    return () => {
      socket.off('connect', join);
      socket.off('watch-party:closed', onClosed);
      socket.emit('watch-party:leave_room', syncRoomId);
    };
  }, [socket, syncRoomId, userId, closeParty]);

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

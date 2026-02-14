'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import { injectTokenIntoUrl, wrapInProxy } from '../watch/utils';

import {
  approveJoinRequest,
  createPartyRoom,
  emitPartyEvent,
  emitTypingStart,
  emitTypingStop,
  getPartyMessages,
  getPartyStreamToken,
  kickMember,
  leavePartyRoom,
  onPartyAdminRequest,
  onPartyClosed,
  onPartyContentUpdated,
  onPartyHostDisconnected,
  onPartyHostReconnected,
  onPartyJoinApproved,
  onPartyJoinRejected,
  onPartyKicked,
  onPartyMemberJoined,
  onPartyMemberLeft,
  onPartyMemberRejected,
  onPartyMessage,
  onPartyStateUpdate,
  onUserTyping,
  rejectJoinRequest,
  requestJoinPartyRoom,
  requestPartyState,
  sendPartyMessage,
  updatePartyContent,
} from './api';
import { useClockSync } from './hooks/useClockSync';
import type {
  ChatMessage,
  PartyStateUpdate,
  RoomMember,
  WatchPartyRoom,
} from './types';

/**
 * Normalize room URLs by wrapping captions, sprites, and subtitle tracks through proxy.
 * Extracted to avoid duplicating this logic in every socket handler.
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
  userId?: string; // Current user ID to determine if host
}

export function useWatchParty(options: UseWatchPartyOptions = {}) {
  const router = useRouter();
  const { socket: contextSocket } = useSocket();

  // Store options in a ref so callbacks always read fresh values
  // without causing effect teardown/re-subscribe on every render
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
  const [hostDisconnected, setHostDisconnected] = useState(false);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestStatusRef = useRef(requestStatus);
  requestStatusRef.current = requestStatus;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);

  // NOTE: Guest token cleanup is handled in requestJoin() before each new join attempt.
  // Do NOT clear guest_token on mount — a page reload while in-room would wipe a valid token.

  // Create a new party room
  const createRoom = useCallback(
    async (payload: Parameters<typeof createPartyRoom>[0]) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      return new Promise<WatchPartyRoom | null>((resolve) => {
        createPartyRoom(payload, (response) => {
          setIsLoading(false);

          if (response.success && response.room) {
            // Normalize URLs using streamToken to enable CORS-safe subtitle loading
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
    [],
  );

  // Request to join a room
  const requestJoin = useCallback(
    async (roomId: string, name?: string, captchaToken?: string) => {
      const existingToken =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('guest_token')
          : null;

      // Clear any existing guest token before new join attempt
      // This prevents stale token conflicts
      if (existingToken && typeof window !== 'undefined') {
        sessionStorage.removeItem('guest_token');
      }

      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setRequestStatus('pending'); // Assume pending initially

      return new Promise<{
        success: boolean;
        status?: 'pending';
        room?: WatchPartyRoom;
      } | null>((resolve) => {
        requestJoinPartyRoom({ roomId, name, captchaToken }, (response) => {
          setIsLoading(false);
          if (response.success) {
            if (response.room) {
              // Already approved - store new token
              if (response.guestToken && typeof window !== 'undefined') {
                sessionStorage.setItem('guest_token', response.guestToken);
              }

              // For hosts rejoining, fetch stream token to normalize URLs
              // This enables CORS-safe subtitle loading
              getPartyStreamToken((tokenResponse) => {
                const token =
                  tokenResponse.success && tokenResponse.token
                    ? tokenResponse.token
                    : '';

                // Normalize URLs using the token
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
            setRequestStatus('idle'); // Reset on failure
            resolve(null);
          }
        });
      });
    },
    [],
  );

  // Send Message
  const sendMessage = useCallback((content: string) => {
    sendPartyMessage(content, (response) => {
      if (!response.success) {
        toast.error('Failed to send message');
      }
      // Optimistic update not needed as we get broadcast
    });
  }, []);

  // Approve a member (Host only)
  const approveMember = useCallback((memberId: string) => {
    approveJoinRequest(memberId, (response) => {
      if (response.success) {
        toast.success('Member approved');
        // Optimistic update
        setRoom((prev) => {
          if (!prev) return null;
          // Guard: If member already in list (via broadcast), just clean up pending
          const isAlreadyMember = prev.members.some((m) => m?.id === memberId);
          const member = prev.pendingMembers?.find((m) => m?.id === memberId);

          if (isAlreadyMember) {
            return {
              ...prev,
              pendingMembers: prev.pendingMembers.filter(
                (m) => m?.id !== memberId,
              ),
            };
          }

          if (!member) return prev;
          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m?.id !== memberId,
            ),
            members: [...prev.members, member],
          };
        });
      } else {
        toast.error('Failed to approve member');
      }
    });
  }, []);

  // Reject a member (Host only)
  const rejectMember = useCallback((memberId: string) => {
    rejectJoinRequest(memberId, (response) => {
      if (response.success) {
        toast.success('Request rejected');
        // Optimistic update
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m?.id !== memberId,
            ),
          };
        });
      } else {
        toast.error('Failed to reject request');
      }
    });
  }, []);

  // Kick a member (Host only)
  const kickUser = useCallback((memberId: string) => {
    kickMember(memberId, (response) => {
      if (response.success) {
        toast.success('Member removed');
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.filter((m) => m?.id !== memberId),
          };
        });
      } else {
        toast.error('Failed to remove member');
      }
    });
  }, []);

  // Cancel a pending join request (Guest only)
  const cancelRequest = useCallback(
    (onComplete?: () => void) => {
      if (requestStatus !== 'pending') return;

      leavePartyRoom(() => {
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle');
        setMessages([]);
        // Clear guest token if exists
        if (
          typeof window !== 'undefined' &&
          sessionStorage.getItem('guest_token')
        ) {
          sessionStorage.removeItem('guest_token');
        }
        toast.info('Join request cancelled');
        onComplete?.();
      });
    },
    [requestStatus],
  );

  // Leave the room
  const leaveRoom = useCallback(() => {
    leavePartyRoom(() => {
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      setMessages([]);

      // CRITICAL: Clear guest token if exists
      if (
        typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token')
      ) {
        sessionStorage.removeItem('guest_token');
      }
    });
  }, []);

  // Clock Synchronization
  const { clockOffset, isCalibrated, calibrate } = useClockSync();

  // Calibrate clock when connected and joined
  useEffect(() => {
    if (isConnected && requestStatus === 'joined' && !isCalibrated) {
      calibrate();
    }
  }, [isConnected, requestStatus, isCalibrated, calibrate]);

  // ... (rest of the file until sync function)

  // Emit Event (for host) - Replaces sync function
  const emitEvent = useCallback(
    (event: Parameters<typeof emitPartyEvent>[0]) => {
      // Throttle rapid seeks if needed, but for now we trust the component to debouce
      // Ideally we don't throttle 'play'/'pause', only 'seek'/'rate'
      emitPartyEvent(event);
    },
    [],
  );

  // Sync state (legacy wrapper for backward compatibility or direct usage)
  const sync = useCallback(
    (currentTime: number, isPlaying: boolean, playbackRate?: number) => {
      // Forward to event system if possible, or keep as legacy
      // We'll deprecate this in favor of emitEvent
      emitPartyEvent({
        eventType: isPlaying ? 'play' : 'pause', // Approximate
        videoTime: currentTime,
        playbackRate,
      });
    },
    [],
  );

  // Update content (Host only)
  const updateContent = useCallback(
    (contentPayload: Parameters<typeof updatePartyContent>[0]) => {
      updatePartyContent(contentPayload, (response) => {
        if (response.success && response.room) {
          setRoom(response.room);
        } else {
          toast.error(response.error || 'Failed to update content');
        }
      });
    },
    [],
  );

  // Register event listeners
  useEffect(() => {
    const cleanupStateUpdate = onPartyStateUpdate((state) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: {
            ...prev.state,
            ...state,
          },
        };
      });
      optionsRef.current.onStateUpdate?.(state);
    });

    const cleanupMemberJoined = onPartyMemberJoined(({ member }) => {
      if (!member || !member.id) return;

      // Skip toast/sound for our own join — we already know we joined.
      const myId = optionsRef.current.userId;
      const myGuestId = contextSocket?.id
        ? `guest:${contextSocket.id}`
        : undefined;
      const isSelf =
        (myId && member.id === myId) || (myGuestId && member.id === myGuestId);

      if (!isSelf) {
        new Audio('/room-join.mp3').play().catch(() => {});
        toast.success(`${member.name || 'Someone'} joined!`, {
          id: `member-joined-${member.id}`,
        });
      }

      setRoom((prev) => {
        if (!prev) return null;
        const isAlreadyMember = prev.members.some((m) => m.id === member.id);

        return {
          ...prev,
          // Always ensure they are removed from pending if they join correctly
          pendingMembers: prev.pendingMembers.filter((m) => m.id !== member.id),
          members: isAlreadyMember ? prev.members : [...prev.members, member],
        };
      });
      optionsRef.current.onMemberJoined?.(member);
    });

    const cleanupMemberLeft = onPartyMemberLeft(({ userId }) => {
      // Look up the member name before mutating state, then show toast outside updater.
      setRoom((prev) => {
        if (!prev) return null;
        const member = prev.members.find((m) => m?.id === userId);
        if (member?.name) {
          // Toast ID deduplicates in case React StrictMode runs updater twice
          toast.info(`${member.name} left`, { id: `member-left-${userId}` });
        }
        return {
          ...prev,
          members: prev.members.filter((m) => m?.id !== userId),
        };
      });
    });

    const cleanupMemberRejected = onPartyMemberRejected(({ memberId }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pendingMembers: prev.pendingMembers.filter((m) => m?.id !== memberId),
        };
      });
    });

    const cleanupAdminRequest = onPartyAdminRequest(({ member }) => {
      new Audio('/room-req.mp3').play().catch(() => {});
      if (!member || !member.name) {
        toast.info('Someone requested to join');
      } else {
        toast.info(`${member.name} requested to join`);
      }
      setRoom((prev) => {
        if (!prev) return null;
        if (prev.pendingMembers?.some((m) => m.id === member.id)) return prev;
        return {
          ...prev,
          pendingMembers: [...(prev.pendingMembers || []), member],
        };
      });
    });

    const cleanupJoinApproved = onPartyJoinApproved(
      ({ room: approvedRoom, streamToken, guestToken, initialState }) => {
        // Store guest token BEFORE any other async work —
        // useAgoraToken and getPartyStreamToken both need it.
        if (guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', guestToken);
        }

        // Fetch fresh token to ensure valid playback URLs
        getPartyStreamToken((response) => {
          const token =
            response.success && response.token ? response.token : streamToken;

          const normalizedRoom = normalizeRoomUrls(approvedRoom, token, {
            injectStream: true,
          });

          setRoom(normalizedRoom);
          setIsConnected(true);
          setRequestStatus('joined');

          // Pass initial state to predictive sync. The video element doesn't exist
          // yet (ActiveWatchParty hasn't rendered), but usePredictiveSync will save
          // it as a pending update and apply once the video mounts.
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
        });
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
      // Guests are not authenticated — /home redirects to /login, so send them there directly
      const isGuest =
        typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token') === null &&
        !document.cookie.includes('accessToken');
      router.push(isGuest ? '/login' : '/home');
    });

    const cleanupMessage = onPartyMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const cleanupContentUpdated = onPartyContentUpdated(({ room: newRoom }) => {
      toast.info(`Content changed to: ${newRoom.title}`);

      // Update with new content, ensuring we have a fresh token for URLs
      getPartyStreamToken((response) => {
        const token = response.success && response.token ? response.token : '';

        const normalizedRoom = normalizeRoomUrls(newRoom, token, {
          injectStream: true,
        });

        setRoom(normalizedRoom);
      });
    });

    const cleanupTyping = onUserTyping(({ userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.some((u) => u.userId === userId)) return prev;
          return [...prev, { userId, userName }];
        }
        return prev.filter((u) => u.userId !== userId);
      });
    });

    const cleanupHostDisconnected = onPartyHostDisconnected(
      ({ graceSeconds }) => {
        setHostDisconnected(true);
        toast.warning(
          `Host disconnected. Party will close in ${graceSeconds}s if they don't return.`,
          { id: 'host-disconnected', duration: graceSeconds * 1000 },
        );
      },
    );

    const cleanupHostReconnected = onPartyHostReconnected(() => {
      // Only show the toast if we previously showed a disconnect warning.
      // Without this guard, a brief socket reconnection (e.g. during page
      // navigation) triggers host_reconnected even though the user never
      // saw a disconnect message.
      setHostDisconnected((prev) => {
        if (prev) {
          toast.success('Host reconnected!', { id: 'host-disconnected' });
        }
        return false;
      });
    });

    return () => {
      cleanupStateUpdate();
      cleanupMemberJoined();
      cleanupMemberLeft();
      cleanupMemberRejected();
      cleanupAdminRequest();
      cleanupJoinApproved();
      cleanupJoinRejected();
      cleanupKicked();
      cleanupClosed();
      cleanupMessage();
      cleanupContentUpdated();
      cleanupTyping();
      cleanupHostDisconnected();
      cleanupHostReconnected();
    };
  }, [router, contextSocket?.id]);

  // Reconnection sync for guests - request state when socket reconnects
  useEffect(() => {
    if (!contextSocket || !isConnected || !room) return;

    const isHost = optionsRef.current.userId === room.hostId;
    if (isHost) return; // Host doesn't need to sync from server

    const handleReconnect = () => {
      // Request current state from server after reconnection
      requestPartyState((response) => {
        if (response.success && response.state) {
          optionsRef.current.onStateUpdate?.(response.state);
        }
      });
    };

    // Listen for reconnection events
    contextSocket.on('connect', handleReconnect);

    // Request state at staggered intervals after joining:
    // - 500ms: video element should exist but clock may not be calibrated yet (fallback sync)
    // - 1500ms: clock should be calibrated, predictive sync works accurately
    // This covers the gap between join_approved (video not yet rendered) and
    // the host Auto-Sync (which only fires when member count changes).
    const syncTimers: NodeJS.Timeout[] = [];

    const requestSync = () => {
      requestPartyState((response) => {
        if (response.success && response.state) {
          optionsRef.current.onStateUpdate?.(response.state);
        }
      });
    };

    syncTimers.push(
      setTimeout(() => {
        requestSync();
        getPartyMessages((response) => {
          if (response.success && response.messages) {
            setMessages(response.messages);
          }
        });
      }, 500),
    );

    // Second sync after clock calibration (~600ms) should be complete
    syncTimers.push(setTimeout(requestSync, 1500));

    return () => {
      contextSocket.off('connect', handleReconnect);
      for (const t of syncTimers) clearTimeout(t);
    };
  }, [isConnected, room?.id, contextSocket, room]);

  // NOTE: Periodic polling removed in favor of WebSocket events

  // Cleanup on unmount (handles browser close, navigation, etc.)
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      // Only clear guest token if NOT currently connected.
      // If the user is refreshing while in a room, keep the token intact
      // so they can reconnect with it.
      // NOTE: requestStatusRef.current is 'joined' while actively in a room.
      if (
        requestStatusRef.current !== 'joined' &&
        typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token')
      ) {
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
    messages,
    typingUsers,
    sendMessage,
    handleTypingStart: emitTypingStart,
    handleTypingStop: emitTypingStop,
    createRoom,
    requestJoin,
    cancelRequest,
    leaveRoom,
    approveMember,
    rejectMember,
    kickUser,
    hostDisconnected,
    sync,
    emitEvent,
    updateContent,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/lib/ws';
import { injectTokenIntoUrl, wrapInProxy } from '../watch';
import {
  approveJoinRequest,
  createPartyRoom,
  emitPartyEvent, // New
  emitTypingStart,
  emitTypingStop,
  getPartyMessages,
  getPartyStreamToken,
  kickMember,
  leavePartyRoom,
  onPartyAdminRequest,
  onPartyClosed,
  onPartyContentUpdated,
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
  syncPartyState,
  updatePartyContent,
} from './api';
import { useClockSync } from './hooks/useClockSync';
import type {
  ChatMessage,
  PartyStateUpdate,
  RoomMember,
  WatchPartyRoom,
} from './types';

interface UseWatchPartyOptions {
  onStateUpdate?: (state: PartyStateUpdate) => void;
  onMemberJoined?: (member: RoomMember) => void;
  userId?: string; // Current user ID to determine if host
}

export function useWatchParty(options: UseWatchPartyOptions = {}) {
  const router = useRouter();
  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [requestStatus, setRequestStatus] = useState<
    'idle' | 'pending' | 'rejected' | 'joined'
  >('idle');

  const lastSyncRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);

  // Check for stale guest token on mount and clear if found
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = sessionStorage.getItem('guest_token');
      if (existingToken) {
        sessionStorage.removeItem('guest_token');
      }
    }
  }, []); // Run once on mount

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
            const normalizedRoom: WatchPartyRoom = {
              ...response.room,
              captionUrl: response.room.captionUrl
                ? wrapInProxy(response.room.captionUrl, token)
                : response.room.captionUrl,
              spriteVtt: response.room.spriteVtt
                ? wrapInProxy(response.room.spriteVtt, token)
                : response.room.spriteVtt,
              subtitleTracks: (response.room.subtitleTracks || []).map(
                (track) => ({
                  ...track,
                  src: wrapInProxy(track.src, token),
                }),
              ),
            };
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
                const normalizedRoom: WatchPartyRoom = {
                  ...response.room!,
                  captionUrl: response.room!.captionUrl
                    ? wrapInProxy(response.room!.captionUrl, token)
                    : response.room!.captionUrl,
                  spriteVtt: response.room!.spriteVtt
                    ? wrapInProxy(response.room!.spriteVtt, token)
                    : response.room!.spriteVtt,
                  subtitleTracks: (response.room!.subtitleTracks || []).map(
                    (track) => ({
                      ...track,
                      src: wrapInProxy(track.src, token),
                    }),
                  ),
                };

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
          const member = prev.pendingMembers?.find((m) => m?.id === memberId);
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
      options.onStateUpdate?.(state);
    });

    const cleanupMemberJoined = onPartyMemberJoined(({ member }) => {
      if (!member || !member.id) {
        toast.info('Someone joined the party');
        return;
      }
      toast.success(`${member.name || 'Someone'} joined!`);
      setRoom((prev) => {
        if (!prev) return null;
        if (prev.members.some((m) => m.id === member.id)) return prev;
        return {
          ...prev,
          members: [...prev.members, member],
        };
      });
      options.onMemberJoined?.(member);
    });

    const cleanupMemberLeft = onPartyMemberLeft(({ userId }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const member = prev.members.find((m) => m?.id === userId);
        if (member?.name) {
          toast.info(`${member.name} left`);
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
      ({ room: approvedRoom, streamToken, initialState }) => {
        // Fetch fresh token to ensure valid playback URLs
        getPartyStreamToken((response) => {
          const token =
            response.success && response.token ? response.token : streamToken;

          const normalizedRoom: WatchPartyRoom = {
            ...approvedRoom,
            streamUrl:
              injectTokenIntoUrl(approvedRoom.streamUrl, token) ||
              approvedRoom.streamUrl,
            captionUrl: approvedRoom.captionUrl
              ? wrapInProxy(approvedRoom.captionUrl, token)
              : approvedRoom.captionUrl,
            spriteVtt: approvedRoom.spriteVtt
              ? wrapInProxy(approvedRoom.spriteVtt, token)
              : approvedRoom.spriteVtt,
            subtitleTracks: (approvedRoom.subtitleTracks || []).map(
              (track) => ({
                ...track,
                src: wrapInProxy(track.src, token),
              }),
            ),
          };

          setRoom(normalizedRoom);
          setIsConnected(true);
          setRequestStatus('joined');

          if (initialState) {
            options.onStateUpdate?.({
              ...initialState,
              timestamp: Date.now(),
            });
          }
        });
      },
    );

    const cleanupJoinRejected = onPartyJoinRejected(() => {
      if (requestStatus === 'pending') {
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
      router.push('/home');
    });

    const cleanupMessage = onPartyMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const cleanupContentUpdated = onPartyContentUpdated(({ room: newRoom }) => {
      toast.info(`Content changed to: ${newRoom.title}`);

      // Update with new content, ensuring we have a fresh token for URLs
      getPartyStreamToken((response) => {
        const token = response.success && response.token ? response.token : '';

        const normalizedRoom: WatchPartyRoom = {
          ...newRoom,
          streamUrl:
            injectTokenIntoUrl(newRoom.streamUrl, token) || newRoom.streamUrl,
          captionUrl: newRoom.captionUrl
            ? wrapInProxy(newRoom.captionUrl, token)
            : newRoom.captionUrl,
          spriteVtt: newRoom.spriteVtt
            ? wrapInProxy(newRoom.spriteVtt, token)
            : newRoom.spriteVtt,
          subtitleTracks: (newRoom.subtitleTracks || []).map((track) => ({
            ...track,
            src: wrapInProxy(track.src, token),
          })),
        };

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
    };
  }, [requestStatus, router, options]);

  // Reconnection sync for guests - request state when socket reconnects
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected || !room) return;

    const isHost = options.userId === room.hostId;
    if (isHost) return; // Host doesn't need to sync from server

    const handleReconnect = () => {
      // Request current state from server after reconnection
      requestPartyState((response) => {
        if (response.success && response.state) {
          options.onStateUpdate?.(response.state);
        }
      });
    };

    // Listen for reconnection events
    socket.on('connect', handleReconnect);

    // Also request state immediately when this effect runs (covers initial connection)
    // Small delay to ensure socket room join is complete
    const initialSyncTimer = setTimeout(() => {
      requestPartyState((response) => {
        if (response.success && response.state) {
          options.onStateUpdate?.(response.state);
        }
      });
      getPartyMessages((response) => {
        if (response.success && response.messages) {
          setMessages(response.messages);
        }
      });
    }, 500);

    return () => {
      socket.off('connect', handleReconnect);
      clearTimeout(initialSyncTimer);
    };
  }, [isConnected, room, options]);

  // NOTE: Periodic polling removed in favor of WebSocket events

  // Cleanup on unmount (handles browser close, navigation, etc.)
  useEffect(() => {
    // Cleanup function runs when component unmounts
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      // CRITICAL: Clear guest token on unmount to prevent stale token issues
      if (
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
    clockOffset, // New
    isCalibrated, // New
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
    sync, // Legacy support
    emitEvent, // New: Use this for event-based sync
    updateContent,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { injectTokenIntoUrl, wrapInProxy } from '../watch';
import {
  approveJoinRequest,
  createPartyRoom,
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
  sendPartyMessage,
  syncPartyState,
  updatePartyContent,
} from './api';
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
            setRoom(response.room);
            setIsConnected(true);
            setRequestStatus('joined');
            resolve(response.room);
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
              setRoom(response.room);
              setIsConnected(true);
              setRequestStatus('joined');
              resolve({ success: true, room: response.room });
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

  // Sync state (for host)
  const sync = useCallback(
    (currentTime: number, isPlaying: boolean, playbackRate?: number) => {
      // Throttle sync to max every 50ms (basically debounce rapid fire)
      const now = Date.now();
      if (now - lastSyncRef.current < 50) return;
      lastSyncRef.current = now;

      syncPartyState({ currentTime, isPlaying, playbackRate });
    },
    [],
  );

  // Update content (Host only)
  const updateContent = useCallback(
    (contentPayload: Parameters<typeof updatePartyContent>[0]) => {
      updatePartyContent(contentPayload, (response) => {
        if (response.success && response.room) {
          // We will receive the update via socket broadcast as well,
          // but we can update optimistically/immediately here if we want.
          // However, we need a valid token. The callback room has host token.
          // If we are host (which we are if we called this), it works.
          setRoom(response.room);
        } else {
          toast.error(response.error || 'Failed to update content');
        }
      });
    },
    [],
  );

  // Set up event listeners
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // State updates
    cleanups.push(
      onPartyStateUpdate((data) => {
        options.onStateUpdate?.(data);
      }),
    );

    // Member joined
    cleanups.push(
      onPartyMemberJoined((data) => {
        setRoom((prev) => {
          if (!prev) return null;
          // Prevent duplicates
          if (prev.members.some((m) => m?.id === data.member?.id)) {
            return prev;
          }
          return {
            ...prev,
            members: [...prev.members, data.member],
            pendingMembers:
              prev.pendingMembers?.filter((m) => m?.id !== data.member?.id) ||
              [],
          };
        });
        toast.info(`${data.member?.name || 'Someone'} joined the party`);
        options.onMemberJoined?.(data.member);
      }),
    );

    // Member left
    cleanups.push(
      onPartyMemberLeft((data) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.filter((m) => m?.id !== data.userId),
          };
        });
      }),
    );

    // Admin Request (Host receives this)
    cleanups.push(
      onPartyAdminRequest((data) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            pendingMembers: [...(prev.pendingMembers || []), data.member],
          };
        });
        toast.info(`${data.member?.name || 'Someone'} requested to join`);
      }),
    );

    // Member Rejected (Host receives this - syncs rejection across all host tabs)
    cleanups.push(
      onPartyMemberRejected((data) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m?.id !== data.memberId,
            ),
          };
        });
      }),
    );

    // Join Approved (Guest receives this)
    cleanups.push(
      onPartyJoinApproved((data) => {
        setIsConnected(true);
        setRequestStatus('joined');
        toast.success('Join request accepted!');

        // Store Guest Token
        if (data.guestToken && typeof window !== 'undefined') {
          sessionStorage.setItem('guest_token', data.guestToken);
        }

        // Fetch fresh stream token for this guest to ensure proper quality access
        getPartyStreamToken((tokenResponse) => {
          const streamToken =
            tokenResponse.success && tokenResponse.token
              ? tokenResponse.token
              : data.streamToken;

          // Build proper stream URL for guest using their token
          const guestStreamUrl =
            injectTokenIntoUrl(data.room.streamUrl, streamToken || '') ||
            data.room.streamUrl;
          // Use wrapInProxy for sprite VTT (external CDN URL)
          const guestSpriteVtt = data.room.spriteVtt
            ? wrapInProxy(data.room.spriteVtt, streamToken || '')
            : data.room.spriteVtt;
          // Use wrapInProxy for captions (external CDN URLs)
          const guestCaptionUrl = data.room.captionUrl
            ? wrapInProxy(data.room.captionUrl, streamToken || '')
            : data.room.captionUrl;

          // Use wrapInProxy for subtitle tracks (external CDN URLs)
          const guestSubtitleTracks = (data.room.subtitleTracks || []).map(
            (track) => ({
              ...track,
              src: wrapInProxy(track.src, streamToken || ''),
            }),
          );

          const tokenizedRoom = {
            ...data.room,
            streamUrl: guestStreamUrl,
            spriteVtt: guestSpriteVtt,
            captionUrl: guestCaptionUrl,
            subtitleTracks: guestSubtitleTracks,
          };
          setRoom(tokenizedRoom);

          // Apply initial state for immediate sync (if provided)
          // Retry multiple times to ensure video element is ready
          const initState = data.initialState;
          if (initState) {
            const applyInitialState = () => {
              options.onStateUpdate?.({
                currentTime: initState.currentTime,
                isPlaying: initState.isPlaying,
                timestamp: Date.now(),
              });
            };
            // Try multiple times with increasing delays
            setTimeout(applyInitialState, 300);
            setTimeout(applyInitialState, 800);
            setTimeout(applyInitialState, 1500);
          }
        });
      }),
    );

    // Rejected
    cleanups.push(
      onPartyJoinRejected((data) => {
        toast.error(data.reason || 'Your request to join was rejected.');
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('rejected');

        // CRITICAL: Clear guest token on rejection to allow re-requesting
        if (
          typeof window !== 'undefined' &&
          sessionStorage.getItem('guest_token')
        ) {
          sessionStorage.removeItem('guest_token');
        }
      }),
    );

    // Kicked
    cleanups.push(
      onPartyKicked((data) => {
        toast.error(data.reason || 'You have been removed from the party.');
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle'); // Changed to 'idle' so guest can re-request

        // CRITICAL: Clear guest token if exists
        if (
          typeof window !== 'undefined' &&
          sessionStorage.getItem('guest_token')
        ) {
          sessionStorage.removeItem('guest_token');
        }

        setTimeout(() => router.push('/home'), 2000);
      }),
    );

    // Party closed
    cleanups.push(
      onPartyClosed((data) => {
        toast.error(data.reason);
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle');

        // CRITICAL: Clear guest token to allow re-joining
        if (
          typeof window !== 'undefined' &&
          sessionStorage.getItem('guest_token')
        ) {
          sessionStorage.removeItem('guest_token');
        }

        router.push('/home');
      }),
    );

    // Messages
    cleanups.push(
      onPartyMessage((msg) => {
        setMessages((prev) => [...prev, msg]);
      }),
    );

    // Typing Indicator
    cleanups.push(
      onUserTyping((data) => {
        if (data.isTyping) {
          // Add user to typing list
          setTypingUsers((prev) => {
            const exists = prev.find((u) => u.userId === data.userId);
            if (exists) return prev;
            return [...prev, { userId: data.userId, userName: data.userName }];
          });
        } else {
          // Remove user from typing list
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
        }
      }),
    );

    // Content Updated
    cleanups.push(
      onPartyContentUpdated((data) => {
        // Fetch new stream token for this user
        getPartyStreamToken((response) => {
          if (response.success && response.token) {
            const finalUrl =
              injectTokenIntoUrl(data.room.streamUrl, response.token) ||
              data.room.streamUrl;
            // Use wrapInProxy for sprite VTT (external CDN URL)
            const finalSpriteVtt = data.room.spriteVtt
              ? wrapInProxy(data.room.spriteVtt, response.token || '')
              : data.room.spriteVtt;
            // Use wrapInProxy for captions (external CDN URLs)
            const finalCaptionUrl = data.room.captionUrl
              ? wrapInProxy(data.room.captionUrl, response.token || '')
              : data.room.captionUrl;

            // Use wrapInProxy for subtitle tracks (external CDN URLs)
            const finalSubtitleTracks = (data.room.subtitleTracks || []).map(
              (track) => ({
                ...track,
                src: wrapInProxy(track.src, response.token || ''),
              }),
            );

            setRoom({
              ...data.room,
              streamUrl: finalUrl,
              spriteVtt: finalSpriteVtt,
              captionUrl: finalCaptionUrl,
              subtitleTracks: finalSubtitleTracks,
            });
            toast.success(`Now watching: ${data.room.title}`);
          } else {
            // Fallback: update room anyway, might fail to play if token invalid
            setRoom(data.room);
          }
        });
      }),
    );

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [router, options]); // Removed 'room' from dependency array

  // Fetch messages when connected
  // Fetch messages when connected
  const hasFetchedMessages = useRef(false);
  useEffect(() => {
    if (isConnected && room && !hasFetchedMessages.current) {
      hasFetchedMessages.current = true;
      getPartyMessages((response) => {
        if (response.success && response.messages) {
          setMessages(response.messages);
        }
      });
    }
  }, [isConnected, room]);

  useEffect(() => {
    if (!isConnected) {
      hasFetchedMessages.current = false;
    }
  }, [isConnected]);

  // Cleanup on unmount (handles browser close, navigation, etc.)
  useEffect(() => {
    // Cleanup function runs when component unmounts
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      // CRITICAL: Clear guest token on unmount to prevent stale token issues
      // This handles:
      // - Browser close
      // - Tab close
      // - Navigation away
      // - Component unmount for any reason
      if (
        typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token')
      ) {
        sessionStorage.removeItem('guest_token');
      }
    };
  }, []);

  // Note: Polling removed - relying on WebSocket events only for better performance

  return {
    room,
    isLoading,
    error,
    errorCode,
    isConnected,
    requestStatus,
    messages, // New
    typingUsers, // New
    sendMessage, // New
    handleTypingStart: emitTypingStart, // New
    handleTypingStop: emitTypingStop, // New
    createRoom,
    requestJoin,
    cancelRequest, // New
    leaveRoom,
    approveMember,
    rejectMember,
    kickUser,
    sync,
    updateContent,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { injectTokenIntoUrl } from '../watch';
import {
  approveJoinRequest,
  createPartyRoom,
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
  onPartyMessage,
  onPartyStateUpdate,
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
              // Already approved
              if (response.guestToken) {
                sessionStorage.setItem('guest_token', response.guestToken);
              }
              setRoom(response.room);
              setIsConnected(true);
              setRequestStatus('joined');
              resolve({ success: true, room: response.room });
            } else {
              // Waiting for approval
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
          const member = prev.pendingMembers.find((m) => m.id === memberId);
          if (!member) return prev;
          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m.id !== memberId,
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
              (m) => m.id !== memberId,
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
            members: prev.members.filter((m) => m.id !== memberId),
          };
        });
      } else {
        toast.error('Failed to remove member');
      }
    });
  }, []);

  // Leave the room
  const leaveRoom = useCallback(() => {
    leavePartyRoom(() => {
      setRoom(null);
      setIsConnected(false);
      setRequestStatus('idle');
      setMessages([]);
    });
  }, []);

  // Sync state (for host)
  const sync = useCallback((currentTime: number, isPlaying: boolean) => {
    // Throttle sync to max every 50ms (basically debounce rapid fire)
    const now = Date.now();
    if (now - lastSyncRef.current < 50) return;
    lastSyncRef.current = now;

    syncPartyState({ currentTime, isPlaying });
  }, []);

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
          if (prev.members.some((m) => m.id === data.member.id)) {
            return prev;
          }
          return {
            ...prev,
            members: [...prev.members, data.member],
            pendingMembers:
              prev.pendingMembers?.filter((m) => m.id !== data.member.id) || [],
          };
        });
        toast.info(`${data.member.name} joined the party`);
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
            members: prev.members.filter((m) => m.id !== data.userId),
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
        toast.info(`${data.member.name} requested to join`);
      }),
    );

    // Join Approved (Guest receives this)
    cleanups.push(
      onPartyJoinApproved((data) => {
        setIsConnected(true);
        setRequestStatus('joined');
        toast.success('Join request accepted!');

        // Store Guest Token
        if (data.guestToken) {
          sessionStorage.setItem('guest_token', data.guestToken);
        }

        // Build proper stream URL for guest using their token
        // Helper to replace token in path
        const guestStreamUrl =
          injectTokenIntoUrl(data.room.streamUrl, data.streamToken || '') ||
          data.room.streamUrl;
        const guestSpriteVtt =
          injectTokenIntoUrl(data.room.spriteVtt, data.streamToken || '') ||
          data.room.spriteVtt;
        const guestCaptionUrl =
          injectTokenIntoUrl(data.room.captionUrl, data.streamToken || '') ||
          data.room.captionUrl;

        const guestSubtitleTracks = (data.room.subtitleTracks || []).map(
          (track) => ({
            ...track,
            src:
              injectTokenIntoUrl(track.src, data.streamToken || '') ||
              track.src,
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
      }),
    );

    // Rejected
    cleanups.push(
      onPartyJoinRejected((data) => {
        toast.error(data.reason || 'Your request to join was rejected.');
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('rejected');
      }),
    );

    // Kicked
    cleanups.push(
      onPartyKicked((data) => {
        toast.error(data.reason || 'You have been removed from the party.');
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('rejected');
        setTimeout(() => router.push('/home'), 2000); // Changed to /home to match other redirects
      }),
    );

    // Party closed
    cleanups.push(
      onPartyClosed((data) => {
        toast.error(data.reason);
        setRoom(null);
        setIsConnected(false);
        setRequestStatus('idle');
        router.push('/home');
      }),
    );

    // Messages
    cleanups.push(
      onPartyMessage((msg) => {
        setMessages((prev) => [...prev, msg]);
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
            const finalSpriteVtt =
              injectTokenIntoUrl(data.room.spriteVtt, response.token) ||
              data.room.spriteVtt;
            const finalCaptionUrl =
              injectTokenIntoUrl(data.room.captionUrl, response.token) ||
              data.room.captionUrl;

            const finalSubtitleTracks = (data.room.subtitleTracks || []).map(
              (track) => ({
                ...track,
                src:
                  injectTokenIntoUrl(track.src, response.token || '') ||
                  track.src,
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
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
    messages, // New
    sendMessage, // New
    createRoom,
    requestJoin,
    leaveRoom,
    approveMember,
    rejectMember,
    kickUser,
    sync,
    updateContent,
  };
}

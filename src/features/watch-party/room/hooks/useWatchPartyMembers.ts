'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  approveJoinRequest,
  fetchPendingRequests,
  kickMember,
  rejectJoinRequest,
} from '../services/watch-party.api';
import type { RoomMember, WatchPartyRoom } from '../types';

interface UseWatchPartyMembersProps {
  room: WatchPartyRoom | null;
  setRoom: React.Dispatch<React.SetStateAction<WatchPartyRoom | null>>;
  userId?: string;
  isHost?: boolean;
  onMemberJoined?: (member: RoomMember) => void;
  rtmSendMessageToPeer?: (targetUserId: string, msg: RTMMessage) => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
  streamToken?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function useWatchPartyMembers({
  room,
  setRoom,
  userId,
  isHost,
  onMemberJoined,
  rtmSendMessageToPeer,
  rtmSendMessage,
  streamToken,
  videoRef,
}: UseWatchPartyMembersProps) {
  const { socket } = useSocket();
  const disconnectTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Track latest room state for async callbacks without triggering stale closures or side-effects in setState
  const roomRef = useRef<WatchPartyRoom | null>(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const approveMember = useCallback(
    async (memberId: string) => {
      if (!room?.id) return;

      // Capture member details BEFORE the async API call.
      // Socket.IO may update pendingMembers and remove the user while the API call is still pending
      const memberToApprove = room.pendingMembers?.find(
        (m) => m?.id === memberId,
      );
      if (!memberToApprove) return;

      const response = await approveJoinRequest(room.id, memberId);
      if (response.success) {
        toast.success('Member approved');
        setRoom((prev) => {
          if (!prev) return null;
          const isAlreadyMember = prev.members.some((m) => m?.id === memberId);
          const member = memberToApprove;

          if (isAlreadyMember) {
            return {
              ...prev,
              pendingMembers: prev.pendingMembers.filter(
                (m) => m?.id !== memberId,
              ),
            };
          }

          // Notify the approved member directly so they can connect to streams/RTM
          rtmSendMessageToPeer?.(memberId, {
            type: 'JOIN_APPROVED',
            room: prev,
            streamToken: streamToken || '',
            initialState: {
              currentTime:
                videoRef?.current?.currentTime ?? prev.state.currentTime,
              isPlaying: videoRef?.current
                ? !videoRef.current.paused
                : prev.state.isPlaying,
              playbackRate:
                videoRef?.current?.playbackRate ?? prev.state.playbackRate,
              timestamp: videoRef?.current
                ? Date.now()
                : prev.state.lastUpdated,
              serverTime: Date.now(),
            },
          });
          // Announce to the channel that a new member joined
          rtmSendMessage?.({
            type: 'MEMBER_JOINED',
            member: {
              ...member,
              joinedAt: Date.now(),
            },
          });

          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m?.id !== memberId,
            ),
            members: [...prev.members, member],
          };
        });
      } else {
        toast.error(response.error || 'Failed to approve member');
      }
    },
    [
      room?.id,
      streamToken,
      rtmSendMessageToPeer,
      rtmSendMessage,
      setRoom,
      videoRef?.current?.paused,
      videoRef?.current,
      room?.pendingMembers,
    ],
  );

  const rejectMember = useCallback(
    async (memberId: string) => {
      if (!room?.id) return;
      const response = await rejectJoinRequest(room.id, memberId);
      if (response.success) {
        toast.success('Request rejected');
        setRoom((prev) => {
          if (!prev) return null;
          rtmSendMessageToPeer?.(memberId, {
            type: 'JOIN_REJECTED',
            reason: 'Your request to join was declined.',
          });
          return {
            ...prev,
            pendingMembers: prev.pendingMembers.filter(
              (m) => m?.id !== memberId,
            ),
          };
        });
      } else {
        toast.error(response.error || 'Failed to reject request');
      }
    },
    [room?.id, rtmSendMessageToPeer, setRoom],
  );

  const kickUser = useCallback(
    async (memberId: string) => {
      if (!room?.id) return;
      const response = await kickMember(room.id, memberId);
      if (response.success) {
        toast.success('Member removed');
        setRoom((prev) => {
          if (!prev) return null;
          rtmSendMessage?.({
            type: 'KICK',
            targetUserId: memberId,
            reason: 'You were removed from the party by the host.',
          });
          return {
            ...prev,
            members: prev.members.filter((m) => m?.id !== memberId),
          };
        });
      } else {
        toast.error(response.error || 'Failed to remove member');
      }
    },
    [room?.id, rtmSendMessage, setRoom],
  );

  const handlePresenceEvent = useCallback(
    (event: { action: 'JOIN' | 'LEAVE'; userId: string }) => {
      // Auto-kick logic is ONLY performed by the Host to prevent race conditions
      if (!isHost || !room?.id) return;

      // Ignore host drops (handled by useWatchPartySync for Guests)
      if (event.userId === room.hostId) return;

      if (event.action === 'LEAVE') {
        // Start a 2-minute grace period before auto-kicking the dropped guest
        if (disconnectTimersRef.current[event.userId]) {
          clearTimeout(disconnectTimersRef.current[event.userId]);
        }
        disconnectTimersRef.current[event.userId] = setTimeout(() => {
          // Verify they are still in the room using ref to avoid React strict-mode double-firing side effects
          const currentRoom = roomRef.current;
          if (!currentRoom) return;

          const isStillMember = currentRoom.members.some(
            (m) => m?.id === event.userId,
          );
          if (isStillMember) {
            toast.info(`Auto-removing dropped guest...`);
            kickUser(event.userId).catch(() => {});
          }
          delete disconnectTimersRef.current[event.userId];
        }, 120000); // 2 minutes
      } else if (event.action === 'JOIN') {
        // Guest reconnected, cancel the auto-kick
        if (disconnectTimersRef.current[event.userId]) {
          clearTimeout(disconnectTimersRef.current[event.userId]);
          delete disconnectTimersRef.current[event.userId];
        }
      }
    },
    [isHost, room?.id, room?.hostId, kickUser],
  );

  // Listen for optimistic local updates from WatchPartySettings via CustomEvent
  useEffect(() => {
    const handleGlobal = (e: CustomEvent) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          permissions: {
            ...prev.permissions,
            ...e.detail.permissions,
          },
        };
      });
    };

    const handleMember = (e: CustomEvent) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m?.id === e.detail.memberId
              ? {
                  ...m,
                  permissions: {
                    ...(m.permissions || {}),
                    ...e.detail.permissions,
                  },
                }
              : m,
          ),
        };
      });
    };

    window.addEventListener(
      'LOCAL_PERMISSIONS_UPDATED',
      handleGlobal as EventListener,
    );
    window.addEventListener(
      'LOCAL_MEMBER_PERMISSIONS_UPDATED',
      handleMember as EventListener,
    );

    return () => {
      window.removeEventListener(
        'LOCAL_PERMISSIONS_UPDATED',
        handleGlobal as EventListener,
      );
      window.removeEventListener(
        'LOCAL_MEMBER_PERMISSIONS_UPDATED',
        handleMember as EventListener,
      );
    };
  }, [setRoom]);

  // Handle Watch Party Socket.IO connection for real-time join request updates
  useEffect(() => {
    let active = true;

    if (!room?.id || room.hostId !== userId || !socket) {
      return;
    }

    const setupSocketListeners = () => {
      if (!active) return;
      socket.emit('watch-party:join_room', room.id);

      socket.on(
        'PENDING_MEMBERS_UPDATED',
        (payload: { pendingMembers?: RoomMember[] }) => {
          if (payload?.pendingMembers) {
            setRoom((prev) => {
              if (!prev) return null;

              const existingIds = new Set(
                prev.pendingMembers?.map((m) => m.id) || [],
              );
              const incomingPending = payload.pendingMembers as RoomMember[];
              const newPendingCount = incomingPending.filter(
                (m) => !existingIds.has(m.id),
              ).length;

              if (newPendingCount > 0) {
                new Audio('/room-join.mp3').play().catch(() => {});
                toast.success(`${newPendingCount} new request(s) to join`, {
                  id: 'new-join-request',
                });
              }

              return {
                ...prev,
                pendingMembers: incomingPending.map((m) => ({
                  ...m,
                  profilePhoto: m.profilePhoto ?? undefined,
                })),
              };
            });
          }
        },
      );
    };

    // Initial fetch to make sure nothing was missed before Socket.IO connects
    fetchPendingRequests(room.id).then((response) => {
      if (!active) return;
      const members = response.pendingMembers;
      if (!members) return;

      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pendingMembers: members.map((m) => ({
            ...m,
            profilePhoto: m.profilePhoto ?? undefined,
          })),
        };
      });
    });

    setupSocketListeners();

    return () => {
      active = false;
      socket.off('PENDING_MEMBERS_UPDATED');
      socket.emit('watch-party:leave_room', room.id);
    };
  }, [room?.id, room?.hostId, userId, setRoom, socket]);

  // Handle incoming member-related RTM messages
  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'MEMBER_JOINED': {
          const { member } = msg;
          if (!member?.id) return;

          const isSelf = userId && member.id === userId;
          if (!isSelf) {
            new Audio('/room-join.mp3').play().catch(() => {});
            toast.success(`${member.name || 'Someone'} joined!`, {
              id: `member-joined-${member.id}`,
            });
          }

          setRoom((prev) => {
            if (!prev) return null;
            const isAlreadyMember = prev.members.some(
              (m) => m?.id === member.id,
            );
            return {
              ...prev,
              pendingMembers: prev.pendingMembers.filter(
                (m) => m?.id !== member.id,
              ),
              members: isAlreadyMember
                ? prev.members
                : [...prev.members, member],
            };
          });
          onMemberJoined?.(member);
          break;
        }

        case 'MEMBER_LEFT': {
          setRoom((prev) => {
            if (!prev) return null;
            const member = prev.members.find(
              (m: RoomMember) => m?.id === msg.userId,
            );
            if (member?.name) {
              toast.info(`${member.name} left`, {
                id: `member-left-${msg.userId}`,
              });
            }
            return {
              ...prev,
              members: prev.members.filter((m) => m?.id !== msg.userId),
            };
          });
          break;
        }

        case 'PERMISSIONS_UPDATED': {
          setRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              permissions: {
                ...prev.permissions,
                ...msg.permissions,
              },
            };
          });
          break;
        }

        case 'MEMBER_PERMISSIONS_UPDATED': {
          setRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              members: prev.members.map((m) =>
                m?.id === msg.memberId
                  ? {
                      ...m,
                      permissions: {
                        ...(m.permissions || {}),
                        ...msg.permissions,
                      },
                    }
                  : m,
              ),
            };
          });
          break;
        }
      }
    },
    [userId, onMemberJoined, setRoom],
  );

  return {
    approveMember,
    rejectMember,
    kickUser,
    handleIncomingRtmMessage,
    handlePresenceEvent,
  };
}

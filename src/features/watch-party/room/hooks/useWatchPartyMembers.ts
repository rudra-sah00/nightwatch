'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { env } from '@/lib/env';
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
  const disconnectTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const approveMember = useCallback(
    async (memberId: string) => {
      if (!room?.id) return;
      const response = await approveJoinRequest(room.id, memberId);
      if (response.success) {
        toast.success('Member approved');
        setRoom((prev) => {
          if (!prev) return null;
          const isAlreadyMember = prev.members.some((m) => m?.id === memberId);
          const member = prev.pendingMembers?.find((m) => m?.id === memberId);
          if (!member) {
            return prev;
          }

          if (isAlreadyMember) {
            return {
              ...prev,
              pendingMembers: prev.pendingMembers.filter(
                (m) => m?.id !== memberId,
              ),
            };
          }

          if (!member) return prev;
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
          // Verify they are still in the room before kicking
          setRoom((prev) => {
            if (!prev) return null;
            const isStillMember = prev.members.some(
              (m) => m?.id === event.userId,
            );
            if (isStillMember) {
              toast.info(`Auto-removing dropped guest...`);
              kickUser(event.userId).catch(() => {});
            }
            return prev;
          });
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
    [isHost, room?.id, room?.hostId, kickUser, setRoom],
  );

  // Handle Watch Party SSE connection for real-time join request updates
  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout;

    if (!room?.id || room.hostId !== userId) {
      return;
    }

    const connectSSE = () => {
      if (!active) return;

      const streamUrl = `${env.BACKEND_URL}/api/rooms/${room.id}/stream`;

      eventSource = new EventSource(streamUrl, {
        withCredentials: true,
      });

      eventSource.onopen = () => {};

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (
            data.type === 'PENDING_MEMBERS_UPDATED' &&
            data.payload?.pendingMembers
          ) {
            setRoom((prev) => {
              if (!prev) return null;

              const existingIds = new Set(
                prev.pendingMembers?.map((m) => m.id) || [],
              );
              const incomingPending = data.payload
                .pendingMembers as RoomMember[];
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
          } else if (
            data.type === 'PERMISSIONS_UPDATED' &&
            data.payload?.permissions
          ) {
            setRoom((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                permissions: {
                  ...prev.permissions,
                  ...data.payload.permissions,
                },
              };
            });
          } else if (
            data.type === 'MEMBER_PERMISSIONS_UPDATED' &&
            data.payload?.memberId
          ) {
            setRoom((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                members: prev.members.map((m) =>
                  m?.id === data.payload.memberId
                    ? {
                        ...m,
                        permissions: {
                          ...(m.permissions || {}),
                          ...data.payload.permissions,
                        },
                      }
                    : m,
                ),
              };
            });
          } else if (data.type === 'MEMBERS_UPDATED' && data.payload?.members) {
            setRoom((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                members: data.payload.members.map((m: RoomMember) => ({
                  ...m,
                  profilePhoto: m.profilePhoto ?? undefined,
                })),
              };
            });
          } else if (data.type === 'MEMBER_LEFT' && data.payload?.userId) {
            setRoom((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                members: prev.members.filter(
                  (m) => m?.id !== data.payload.userId,
                ),
              };
            });
          }
        } catch (_e) {
          // SSE Message Error
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (active) {
          // Retry connection after 5 seconds to reduce server load on failure
          reconnectTimer = setTimeout(connectSSE, 5000);
        }
      };
    };

    // Initial fetch to make sure nothing was missed before SSE connects
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

    connectSSE();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, [room?.id, room?.hostId, userId, setRoom]);

  // Handle incoming member-related RTM messages
  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'MEMBER_JOINED': {
          const { member } = msg;
          if (!member || !member.id) return;

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

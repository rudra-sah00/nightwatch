'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
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
  onMemberJoined?: (member: RoomMember) => void;
  rtmSendMessageToPeer?: (targetUserId: string, msg: RTMMessage) => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
  streamToken?: string;
}

export function useWatchPartyMembers({
  room,
  setRoom,
  userId,
  onMemberJoined,
  rtmSendMessageToPeer,
  rtmSendMessage,
  streamToken,
}: UseWatchPartyMembersProps) {
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
              currentTime: prev.state.currentTime,
              isPlaying: prev.state.isPlaying,
              playbackRate: prev.state.playbackRate,
              timestamp: prev.state.lastUpdated,
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
    [room?.id, streamToken, rtmSendMessageToPeer, rtmSendMessage, setRoom],
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

  // Handle Watch Party SSE connection for real-time join request updates
  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout;

    if (!room?.id || room.hostId !== userId) return;

    const connectSSE = () => {
      if (!active) return;
      eventSource = new EventSource(`/api/rooms/${room.id}/stream`, {
        withCredentials: true,
      });

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
          }
        } catch (_e) {
          // Ignore parse errors
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
  };
}

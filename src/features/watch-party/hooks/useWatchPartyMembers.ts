'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  approveJoinRequest,
  kickMember,
  onPartyAdminRequest,
  onPartyMemberJoined,
  onPartyMemberLeft,
  onPartyMemberRejected,
  rejectJoinRequest,
} from '../api';
import type { RoomMember, WatchPartyRoom } from '../types';

interface UseWatchPartyMembersProps {
  room: WatchPartyRoom | null;
  setRoom: React.Dispatch<React.SetStateAction<WatchPartyRoom | null>>;
  userId?: string;
  socketId?: string;
  onMemberJoined?: (member: RoomMember) => void;
}

export function useWatchPartyMembers({
  room: _room,
  setRoom,
  userId,
  socketId,
  onMemberJoined,
}: UseWatchPartyMembersProps) {
  const approveMember = useCallback(
    (memberId: string) => {
      approveJoinRequest(memberId, (response) => {
        if (response.success) {
          toast.success('Member approved');
          setRoom((prev) => {
            if (!prev) return null;
            const isAlreadyMember = prev.members.some(
              (m) => m?.id === memberId,
            );
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
    },
    [setRoom],
  );

  const rejectMember = useCallback(
    (memberId: string) => {
      rejectJoinRequest(memberId, (response) => {
        if (response.success) {
          toast.success('Request rejected');
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
    },
    [setRoom],
  );

  const kickUser = useCallback(
    (memberId: string) => {
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
    },
    [setRoom],
  );

  useEffect(() => {
    const cleanupMemberJoined = onPartyMemberJoined(({ member }) => {
      if (!member || !member.id) return;

      const myId = userId;
      const myGuestId = socketId ? `guest:${socketId}` : undefined;
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
          pendingMembers: prev.pendingMembers.filter((m) => m.id !== member.id),
          members: isAlreadyMember ? prev.members : [...prev.members, member],
        };
      });
      onMemberJoined?.(member);
    });

    const cleanupMemberLeft = onPartyMemberLeft(({ userId: leftId }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const member = prev.members.find((m) => m?.id === leftId);
        if (member?.name) {
          toast.info(`${member.name} left`, { id: `member-left-${leftId}` });
        }
        return {
          ...prev,
          members: prev.members.filter((m) => m?.id !== leftId),
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
      toast.info(
        member?.name
          ? `${member.name} requested to join`
          : 'Someone requested to join',
      );
      setRoom((prev) => {
        if (!prev) return null;
        if (prev.pendingMembers?.some((m) => m.id === member.id)) return prev;
        return {
          ...prev,
          pendingMembers: [...(prev.pendingMembers || []), member],
        };
      });
    });

    return () => {
      cleanupMemberJoined();
      cleanupMemberLeft();
      cleanupMemberRejected();
      cleanupAdminRequest();
    };
  }, [userId, socketId, onMemberJoined, setRoom]);

  return {
    approveMember,
    rejectMember,
    kickUser,
  };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  type BlockedUser,
  cancelFriendRequest,
  getBlockedUsers,
  getFriends,
  getPendingRequests,
  getSentRequests,
  invalidateFriendsCache,
  rejectFriendRequest,
  unblockUser,
} from '@/features/friends/api';
import type {
  FriendProfile,
  FriendRequest,
  SentRequest,
} from '@/features/friends/types';
import { useSocket } from '@/providers/socket-provider';

export function useFriends() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const fetchAll = useCallback(async () => {
    try {
      const [f, p, s, b] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getSentRequests(),
        getBlockedUsers(),
      ]);
      setFriends(f);
      setPendingRequests(p);
      setSentRequests(s);
      setBlockedUsers(b);
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (data: { userId: string; isOnline: boolean }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.id === data.userId ? { ...f, isOnline: data.isOnline } : f,
        ),
      );
    };

    const onRefresh = () => {
      invalidateFriendsCache();
      fetchAll();
    };

    socket.on('friend:status', onStatus);
    socket.on('friend:request_received', onRefresh);
    socket.on('friend:request_accepted', onRefresh);

    return () => {
      socket.off('friend:status', onStatus);
      socket.off('friend:request_received', onRefresh);
      socket.off('friend:request_accepted', onRefresh);
    };
  }, [socket, fetchAll]);

  const accept = useCallback(
    async (friendshipId: string) => {
      await acceptFriendRequest(friendshipId);
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  const reject = useCallback(
    async (friendshipId: string) => {
      await rejectFriendRequest(friendshipId);
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  const cancel = useCallback(
    async (friendshipId: string) => {
      await cancelFriendRequest(friendshipId);
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  const unblock = useCallback(
    async (userId: string) => {
      await unblockUser(userId);
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  return {
    friends,
    onlineFriends: friends.filter((f) => f.isOnline),
    offlineFriends: friends.filter((f) => !f.isOnline),
    pendingRequests,
    sentRequests,
    blockedUsers,
    isLoading,
    accept,
    reject,
    cancel,
    unblock,
    refetch: fetchAll,
  };
}

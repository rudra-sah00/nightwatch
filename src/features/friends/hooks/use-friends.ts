'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  FriendActivity,
  FriendProfile,
  FriendRequest,
  SentRequest,
} from '@/features/friends/types';
import { useSocket } from '@/providers/socket-provider';

/**
 * Central hook for the friends feature — fetches friends, pending/sent requests,
 * and blocked users on mount, then keeps the list live via Socket.IO events
 * (`friend:status`, `friend:activity`, `friend:request_received`, `friend:request_accepted`).
 *
 * Exposes action callbacks (`accept`, `reject`, `cancel`, `unblock`) that
 * optimistically invalidate the cache and re-fetch after each mutation.
 *
 * @returns Friends lists (online/offline), request arrays, blocked users,
 *          loading state, mutation callbacks, and a manual `refetch` function.
 */
export function useFriends() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();
  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [f, p, s, b] = await Promise.all([
        getFriends({ signal: controller.signal }),
        getPendingRequests({ signal: controller.signal }),
        getSentRequests({ signal: controller.signal }),
        getBlockedUsers({ signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setFriends(f);
      setPendingRequests(p);
      setSentRequests(s);
      setBlockedUsers(b);
    } catch {
      // Non-fatal
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchAll]);

  const onlineFriends = useMemo(
    () => friends.filter((f) => f.isOnline),
    [friends],
  );
  const offlineFriends = useMemo(
    () => friends.filter((f) => !f.isOnline),
    [friends],
  );

  useEffect(() => {
    if (!socket) return;

    const onStatus = (data: {
      userId: string;
      isOnline: boolean;
      activity?: FriendActivity | null;
    }) => {
      // Invalidate cache so a navigation remount fetches fresh data instead of
      // serving the pre-socket-update snapshot.
      invalidateFriendsCache();
      setFriends((prev) =>
        prev.map((f) => {
          if (f.id !== data.userId) return f;
          // When going online, apply any piggybacked activity so the sidebar
          // doesn't show "Online" with no activity until the next heartbeat.
          // When going offline, always clear activity.
          const activity = data.isOnline
            ? data.activity !== undefined
              ? data.activity
              : f.activity
            : null;
          return { ...f, isOnline: data.isOnline, activity };
        }),
      );
    };

    const onActivity = (data: {
      userId: string;
      activity: FriendActivity | null;
    }) => {
      invalidateFriendsCache();
      setFriends((prev) =>
        prev.map((f) =>
          f.id === data.userId ? { ...f, activity: data.activity } : f,
        ),
      );
    };

    const onRefresh = () => {
      invalidateFriendsCache();
      fetchAll();
    };

    socket.on('friend:status', onStatus);
    socket.on('friend:activity', onActivity);
    socket.on('friend:request_received', onRefresh);
    socket.on('friend:request_accepted', onRefresh);

    // Re-fetch on (re)connect to get fresh activity state
    const onConnect = () => {
      invalidateFriendsCache();
      fetchAll();
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('friend:status', onStatus);
      socket.off('friend:activity', onActivity);
      socket.off('friend:request_received', onRefresh);
      socket.off('friend:request_accepted', onRefresh);
      socket.off('connect', onConnect);
    };
  }, [socket, fetchAll]);

  const accept = useCallback(
    async (friendshipId: string) => {
      try {
        await acceptFriendRequest(friendshipId);
      } catch {
        // Request already processed or expired — just refresh the list
      }
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  const reject = useCallback(
    async (friendshipId: string) => {
      try {
        await rejectFriendRequest(friendshipId);
      } catch {
        // Request already processed or expired
      }
      invalidateFriendsCache();
      fetchAll();
    },
    [fetchAll],
  );

  const cancel = useCallback(
    async (friendshipId: string) => {
      try {
        await cancelFriendRequest(friendshipId);
      } catch {
        // Already cancelled or expired
      }
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
    onlineFriends,
    offlineFriends,
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

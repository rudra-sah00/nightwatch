'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getConversations,
  getFriends,
  getMessages,
  markAsRead,
  sendMessage,
} from '@/features/friends/api';
import type {
  ConversationPreview,
  FriendActivity,
  Message,
} from '@/features/friends/types';
import { useSocket } from '@/providers/socket-provider';

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const [convos, friends] = await Promise.all([
        getConversations(),
        getFriends(),
      ]);

      // Merge: start with conversations (have messages), then add friends without messages
      const seen = new Set(convos.map((c) => c.friendId));
      const friendsWithoutMessages: ConversationPreview[] = friends
        .filter((f) => !seen.has(f.id))
        .map((f) => ({
          friendId: f.id,
          name: f.name,
          username: f.username,
          profilePhoto: f.profilePhoto,
          lastMessage: '',
          lastMessageAt: '',
          unreadCount: 0,
          isOnline: f.isOnline,
          activity: f.activity,
        }));

      setConversations([...convos, ...friendsWithoutMessages]);
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: { senderId: string; content: string }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.friendId === data.senderId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          lastMessage: data.content,
          unreadCount: prev[idx].unreadCount + 1,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    };

    const onStatusChange = (data: { userId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === data.userId ? { ...c, isOnline: data.isOnline } : c,
        ),
      );
    };

    const onActivityChange = (data: {
      userId: string;
      activity: FriendActivity | null;
    }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === data.userId ? { ...c, activity: data.activity } : c,
        ),
      );
    };

    const onRead = (data: { friendId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === data.friendId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);
    socket.on('friend:status', onStatusChange);
    socket.on('friend:activity', onActivityChange);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
      socket.off('friend:status', onStatusChange);
      socket.off('friend:activity', onActivityChange);
    };
  }, [socket]);

  const clearUnread = useCallback((friendId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.friendId === friendId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  return { conversations, isLoading, refetch: fetchConversations, clearUnread };
}

export function useMessageThread(friendId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { socket } = useSocket();
  const friendIdRef = useRef(friendId);

  friendIdRef.current = friendId;

  // Initial load
  useEffect(() => {
    if (!friendId) {
      setMessages([]);
      setNextCursor(null);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    getMessages(friendId, undefined, 50, { signal: controller.signal })
      .then((data) => {
        if (friendIdRef.current === friendId) {
          setMessages(data.messages);
          setNextCursor(data.nextCursor);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // Mark as read
    markAsRead(friendId).catch(() => {});

    return () => controller.abort();
  }, [friendId]);

  // Load older messages (cursor pagination)
  const loadMore = useCallback(async () => {
    if (!friendId || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const data = await getMessages(friendId, nextCursor, 50);
      setMessages((prev) => [...prev, ...data.messages]);
      setNextCursor(data.nextCursor);
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingMore(false);
    }
  }, [friendId, nextCursor, isLoadingMore]);

  // Send message — optimistic append
  const send = useCallback(
    async (content: string, replyToId?: string) => {
      if (!friendId || !content.trim() || isSending) return;

      const trimmed = content.trim();
      const optimisticId = `tmp-${Date.now()}`;

      setMessages((prev) => [
        {
          id: optimisticId,
          senderId: '',
          receiverId: friendId,
          content: trimmed,
          replyToId: replyToId ?? null,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setIsSending(true);
      try {
        await sendMessage(friendId, trimmed, replyToId);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        setIsSending(false);
      }
    },
    [friendId, isSending],
  );

  // Real-time incoming messages
  useEffect(() => {
    if (!socket || !friendId) return;

    const onNewMessage = (data: {
      id: string;
      senderId: string;
      content: string;
      replyToId?: string;
      createdAt: string;
    }) => {
      if (data.senderId !== friendId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [
          {
            id: data.id,
            senderId: data.senderId,
            receiverId: '',
            content: data.content,
            replyToId: data.replyToId ?? null,
            readAt: null,
            createdAt: data.createdAt,
          },
          ...prev,
        ];
      });

      markAsRead(friendId).catch(() => {});
    };

    socket.on('message:new', onNewMessage);
    return () => {
      socket.off('message:new', onNewMessage);
    };
  }, [socket, friendId]);

  // Typing indicators
  const emitTypingStart = useCallback(() => {
    if (socket && friendId) {
      socket.emit('message:typing_start', { receiverId: friendId });
    }
  }, [socket, friendId]);

  const emitTypingStop = useCallback(() => {
    if (socket && friendId) {
      socket.emit('message:typing_stop', { receiverId: friendId });
    }
  }, [socket, friendId]);

  return {
    messages,
    isLoading,
    isSending,
    nextCursor,
    isLoadingMore,
    loadMore,
    send,
    emitTypingStart,
    emitTypingStop,
  };
}

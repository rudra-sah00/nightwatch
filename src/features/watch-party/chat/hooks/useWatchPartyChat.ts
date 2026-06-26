'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  getPartyMessages,
  sendPartyMessage,
} from '../../room/services/watch-party.api';
import type { ChatMessage, WatchPartyRoom } from '../../room/types';

/**
 * Configuration options for the {@link useWatchPartyChat} hook.
 */
interface UseWatchPartyChatOptions {
  /** The current watch party room, if available. */
  room?: WatchPartyRoom | null;
  /** Function to broadcast an RTM message to all room participants. */
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** The current user's unique identifier. */
  userId?: string;
  /** The current user's display name. */
  currentUserName?: string;
}

/**
 * Hook managing the full chat lifecycle for a watch party room.
 *
 * Provides optimistic message sending with backend persistence and RTM broadcast,
 * typing indicator signalling, and incoming RTM message handling (chat messages,
 * typing start/stop events) with duplicate detection and notification sounds.
 *
 * @param options - Chat configuration including room, user info, and RTM sender.
 * @returns Chat state (messages, typing users) and handlers for sending, typing, and incoming RTM messages.
 */
export function useWatchPartyChat({
  room,
  rtmSendMessage,
  userId,
  currentUserName,
}: UseWatchPartyChatOptions = {}) {
  const t = useTranslations('common.toasts');
  const MAX_CHAT_MESSAGES = 200;
  const [messages, _setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const setMessages = useCallback(
    (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      _setMessages((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        return next.length > MAX_CHAT_MESSAGES
          ? next.slice(next.length - MAX_CHAT_MESSAGES)
          : next;
      });
    },
    [],
  );
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const lastSendTimeRef = useRef<number>(0);
  const SEND_RATE_LIMIT_MS = 300;

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of typingTimeoutsRef.current.values()) clearTimeout(t);
    };
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!room?.id || isLoadingMoreRef.current || !hasMoreMessages) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      let count = 0;
      _setMessages((prev) => {
        count = prev.length;
        return prev;
      });
      const response = await getPartyMessages(room.id, {
        limit: 40,
        before: count,
      });
      if (response.messages) {
        if (response.messages.length === 0) {
          setHasMoreMessages(false);
        } else {
          _setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = response.messages!.filter(
              (m) => !existingIds.has(m.id),
            );
            return [...newMsgs, ...prev];
          });
        }
      }
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [room?.id, hasMoreMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!room?.id || !userId || !currentUserName) return;

      const now = Date.now();
      if (now - lastSendTimeRef.current < SEND_RATE_LIMIT_MS) return;
      lastSendTimeRef.current = now;

      // Optimistically add to UI
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        clientId: `temp-${Date.now()}`,
        roomId: room.id,
        userId: userId,
        userName: currentUserName,
        content,
        isSystem: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Broadcast via RTM
      rtmSendMessage?.({
        type: 'CHAT',
        messageId: optimisticMsg.id,
        userId: userId,
        userName: currentUserName,
        content,
        isSystem: false,
        timestamp: optimisticMsg.timestamp,
      });
      trackEvent('party_chat_send', { roomId: room.id });

      // Persist to backend
      const response = await sendPartyMessage(room.id, content);
      if (response.error) {
        toast.error(t('messageFailed'));
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      } else if (response.message) {
        // Swap temp ID with real DB ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...response.message!, clientId: optimisticMsg.id }
              : m,
          ),
        );
      }
    },
    [room?.id, userId, currentUserName, rtmSendMessage, t, setMessages],
  );

  const handleTypingStart = useCallback(() => {
    if (!userId || !currentUserName) return;
    rtmSendMessage?.({
      type: 'TYPING_START',
      userId: userId,
      userName: currentUserName,
    });
  }, [userId, currentUserName, rtmSendMessage]);

  const handleTypingStop = useCallback(() => {
    if (!userId) return;
    rtmSendMessage?.({
      type: 'TYPING_STOP',
      userId: userId,
    });
  }, [userId, rtmSendMessage]);

  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'CHAT': {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.messageId)) return prev;
            if (msg.userId !== userId) {
              // Check if user is actively watching the chat (floating chat or sidebar chat tab)
              const isFloatingChatVisible =
                !!document.getElementById('wp-floating-chat');
              const sidebarChat = document.getElementById(
                'wp-sidebar-chat-container',
              );
              const isSidebarChatVisible =
                sidebarChat?.getAttribute('data-active') === 'true';

              // Only play sound if chat is hidden completely
              if (!isFloatingChatVisible && !isSidebarChatVisible) {
                new Audio('/msg-received.mp3').play().catch(() => {});
              }
            }

            return [
              ...prev,
              {
                id: msg.messageId,
                roomId: room?.id || '',
                userId: msg.userId,
                userName: msg.userName,
                content: msg.content,
                isSystem: msg.isSystem,
                timestamp: msg.timestamp,
              },
            ];
          });
          break;
        }

        case 'TYPING_START': {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === msg.userId)) return prev;
            return [...prev, { userId: msg.userId, userName: msg.userName }];
          });
          // Clear existing timeout for this user and set a new one
          const existing = typingTimeoutsRef.current.get(msg.userId);
          if (existing) clearTimeout(existing);
          typingTimeoutsRef.current.set(
            msg.userId,
            setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.userId !== msg.userId),
              );
              typingTimeoutsRef.current.delete(msg.userId);
            }, 5000),
          );
          break;
        }

        case 'TYPING_STOP': {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== msg.userId));
          break;
        }
      }
    },
    [room?.id, userId, setMessages],
  );

  return {
    messages,
    setMessages,
    typingUsers,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    handleIncomingRtmMessage,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  };
}

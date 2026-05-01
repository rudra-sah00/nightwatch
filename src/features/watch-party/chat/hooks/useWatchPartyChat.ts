'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { sendPartyMessage } from '../../room/services/watch-party.api';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!room?.id || !userId || !currentUserName) return;

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
    [room?.id, userId, currentUserName, rtmSendMessage, t],
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
          // Auto-expire after 5s in case TYPING_STOP is never received
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== msg.userId),
            );
          }, 5000);
          break;
        }

        case 'TYPING_STOP': {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== msg.userId));
          break;
        }
      }
    },
    [room?.id, userId],
  );

  return {
    messages,
    setMessages,
    typingUsers,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    handleIncomingRtmMessage,
  };
}

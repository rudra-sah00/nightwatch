'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { sendPartyMessage } from '../../room/services/watch-party.api';
import type { ChatMessage, WatchPartyRoom } from '../../room/types';

interface UseWatchPartyChatOptions {
  room?: WatchPartyRoom | null;
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  currentUserName?: string;
}

export function useWatchPartyChat({
  room,
  rtmSendMessage,
  userId,
  currentUserName,
}: UseWatchPartyChatOptions = {}) {
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
      new Audio('/msg-sent.mp3').play().catch(() => {});

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
        toast.error('Failed to send message');
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
    [room?.id, userId, currentUserName, rtmSendMessage],
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
              new Audio('/msg-received.mp3').play().catch(() => {});
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

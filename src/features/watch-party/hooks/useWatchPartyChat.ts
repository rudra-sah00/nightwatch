'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  emitTypingStart,
  emitTypingStop,
  onPartyMessage,
  onUserTyping,
  sendPartyMessage,
} from '../services/watch-party.api';
import type { ChatMessage } from '../types';

export function useWatchPartyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);

  const sendMessage = useCallback((content: string) => {
    sendPartyMessage(content, (response) => {
      if (!response.success) {
        toast.error('Failed to send message');
      }
    });
  }, []);

  useEffect(() => {
    const cleanupMessage = onPartyMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const cleanupTyping = onUserTyping(({ userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.some((u) => u.userId === userId)) return prev;
          return [...prev, { userId, userName }];
        }
        return prev.filter((u) => u.userId !== userId);
      });
    });

    return () => {
      cleanupMessage();
      cleanupTyping();
    };
  }, []);

  return {
    messages,
    setMessages,
    typingUsers,
    sendMessage,
    handleTypingStart: emitTypingStart,
    handleTypingStop: emitTypingStop,
  };
}

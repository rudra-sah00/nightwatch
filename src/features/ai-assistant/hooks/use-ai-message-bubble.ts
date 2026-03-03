'use client';

import React from 'react';
import type { Message } from '../types';

interface UseAiMessageBubbleProps {
  message: Message;
  isUser: boolean;
  isStreaming?: boolean;
}

export function useAiMessageBubble({
  message,
  isUser,
  isStreaming,
}: UseAiMessageBubbleProps) {
  const [displayedContent, setDisplayedContent] = React.useState(
    isUser || !isStreaming ? message.content : '',
  );
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    if (isUser) {
      if (displayedContent !== message.content) {
        setDisplayedContent(message.content);
      }
      return;
    }

    if (displayedContent.length < message.content.length) {
      setIsTyping(true);
      const gap = message.content.length - displayedContent.length;

      const increment = gap > 100 ? 10 : gap > 20 ? 4 : 1;
      const speed = gap > 100 ? 0 : gap > 50 ? 5 : 15;

      const timeoutId = setTimeout(() => {
        setDisplayedContent((prev) => {
          const next = message.content.substring(0, prev.length + increment);
          return next;
        });
      }, speed);

      return () => clearTimeout(timeoutId);
    } else {
      if (isTyping) setIsTyping(false);
      if (!isStreaming && displayedContent !== message.content) {
        setDisplayedContent(message.content);
      }
    }
  }, [message.content, isUser, isStreaming, displayedContent, isTyping]);

  return { displayedContent, isTyping };
}

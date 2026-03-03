import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWatchPartyChatOptions {
  messageCount: number;
  onSendMessage: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function useWatchPartyChat({
  messageCount,
  onSendMessage,
  onTypingStart,
  onTypingStop,
}: UseWatchPartyChatOptions) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messageCount > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageCount]);

  // Handle click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target as Node)
      ) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmoji]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTypingStop) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    if (onTypingStop) {
      onTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    onSendMessage(input);
    setInput('');
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);

      if (!onTypingStart || !onTypingStop) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (value.trim()) {
        onTypingStart();
        typingTimeoutRef.current = setTimeout(() => {
          onTypingStop();
        }, 3000);
      } else {
        onTypingStop();
      }
    },
    [onTypingStart, onTypingStop],
  );

  const onEmojiClick = (emojiObject: { emoji: string }) => {
    setInput((prev) => prev + emojiObject.emoji);
  };

  return {
    input,
    showEmoji,
    setShowEmoji,
    messagesEndRef,
    emojiRef,
    handleSend,
    handleKeyDown,
    handleInputChange,
    onEmojiClick,
  };
}

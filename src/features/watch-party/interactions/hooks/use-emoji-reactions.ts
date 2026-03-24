'use client';

import { useEffect, useRef, useState } from 'react';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';

interface UseEmojiReactionsOptions {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

export function useEmojiReactions({
  rtmSendMessage,
  userId,
  userName,
}: UseEmojiReactionsOptions = {}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleTriggerEmoji = (emoji: string) => {
    if (!userId) return;

    rtmSendMessage?.({
      type: 'INTERACTION',
      kind: 'emoji',
      emoji: emoji,
      userId: userId,
      userName: userName,
    });

    if (showPicker) setShowPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return { showPicker, setShowPicker, pickerRef, handleTriggerEmoji };
}

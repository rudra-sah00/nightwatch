'use client';

import { useEffect, useRef, useState } from 'react';
import { emitPartyInteraction } from '../../room/services/watch-party.api';

export function useEmojiReactions() {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleTriggerEmoji = (emoji: string) => {
    emitPartyInteraction({ type: 'emoji', value: emoji });
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

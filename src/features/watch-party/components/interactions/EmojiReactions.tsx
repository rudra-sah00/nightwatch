'use client';

import { Theme } from 'emoji-picker-react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { emitPartyInteraction } from '../../services/watch-party.api';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-[300px] bg-zinc-900 rounded-xl animate-pulse" />
  ),
});

const QUICK_EMOJIS = ['❤️', '😂', '😠', '🔥', '👏', '😮'];

export function EmojiReactions() {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleTriggerEmoji = (emoji: string) => {
    emitPartyInteraction({ type: 'emoji', value: emoji });
    if (showPicker) setShowPicker(false);
  };

  // Close picker on click outside
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

  return (
    <div className="relative flex items-center gap-0.5 md:gap-1 px-1 md:px-2 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/5 shadow-lg pointer-events-auto shrink-0">
      {QUICK_EMOJIS.map((emoji, index) => (
        <button
          type="button"
          key={emoji}
          onClick={() => handleTriggerEmoji(emoji)}
          className={cn(
            'text-base md:text-lg lg:text-xl hover:scale-125 transition-transform active:scale-95 duration-200 p-1 md:p-1.5',
            index > 2 && 'hidden md:block', // Show only 3 emojis on small screens
            index > 4 && 'hidden lg:block',
          )}
          aria-label={`Send ${emoji} reaction`}
        >
          {emoji}
        </button>
      ))}

      <div className="w-px h-3 bg-white/20 mx-0.5 md:mx-1" />

      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          'p-1 md:p-1.5 rounded-full transition-all duration-200',
          showPicker
            ? 'bg-white/20 text-white'
            : 'text-white/40 hover:text-white hover:bg-white/10',
        )}
        title="Full Emoji Library"
        aria-label="Open emoji picker"
        aria-expanded={showPicker}
        aria-haspopup="dialog"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 h-4 lg:w-5 h-5" />
      </button>

      {/* Popover */}
      {showPicker ? (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[100] shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={(emojiData) => handleTriggerEmoji(emojiData.emoji)}
            lazyLoadEmojis={true}
            height={320}
            width={280}
            previewConfig={{ showPreview: false }}
          />
        </div>
      ) : null}
    </div>
  );
}

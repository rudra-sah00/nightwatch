'use client';
import type { Theme } from 'emoji-picker-react';

import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { useEmojiReactions } from '../hooks/use-emoji-reactions';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-[300px] bg-zinc-900 rounded-xl animate-pulse" />
  ),
});

const QUICK_EMOJIS = ['❤️', '😂', '😠', '🔥', '👏', '😮'];

/** Props for the {@link EmojiReactions} component. */
interface EmojiReactionsProps {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

/**
 * Quick-access emoji reaction bar displayed in the player controls.
 *
 * Shows a row of frequently-used emojis and a "+" button that opens a
 * full emoji picker popover. Sends reactions via RTM to all party members.
 */
export function EmojiReactions({
  rtmSendMessage,
  userId,
  userName,
}: EmojiReactionsProps) {
  const { showPicker, setShowPicker, pickerRef, handleTriggerEmoji } =
    useEmojiReactions({ rtmSendMessage, userId, userName });
  const { theme: appTheme } = useTheme();
  const t = useTranslations('party');
  const tAria = useTranslations('party.aria');

  const resolvedDark =
    appTheme === 'dark' ||
    (appTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="relative flex items-center gap-0.5 md:gap-1 px-1 md:px-2 py-1 pointer-events-auto shrink-0">
      {QUICK_EMOJIS.map((emoji, index) => (
        <button
          type="button"
          key={emoji}
          onClick={() => handleTriggerEmoji(emoji)}
          className={cn(
            'text-base md:text-lg lg:text-xl hover:scale-110 transition-transform active:scale-90 duration-150 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center',
            index > 2 && 'hidden md:block',
            index > 4 && 'hidden lg:block',
          )}
          aria-label={tAria('sendReaction', { emoji })}
        >
          {emoji}
        </button>
      ))}

      <div className="w-px h-3 bg-white/20 mx-0.5 md:mx-1" />

      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        onMouseEnter={() => void import('emoji-picker-react')}
        onFocus={() => void import('emoji-picker-react')}
        className={cn(
          'p-1 md:p-1.5 rounded-full transition-colors duration-200',
          showPicker ? 'text-white' : 'text-white/40 hover:text-white',
        )}
        title={t('emoji.fullLibrary')}
        aria-label={t('emoji.openPicker')}
        aria-expanded={showPicker}
        aria-haspopup="dialog"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
      </button>

      {/* Popover */}
      {showPicker ? (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[100] shadow-2xl rounded-xl overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none"
        >
          <EmojiPicker
            theme={(resolvedDark ? 'dark' : 'light') as Theme}
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

'use client';

import { Theme } from 'emoji-picker-react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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

interface EmojiReactionsProps {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

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
    <div className="relative flex items-center gap-0.5 md:gap-1 px-1 md:px-2 py-1 rounded-full bg-background/5 backdrop-blur-md border border-white/5 shadow-lg pointer-events-auto shrink-0">
      {QUICK_EMOJIS.map((emoji, index) => (
        <Button
          type="button"
          key={emoji}
          onClick={() => handleTriggerEmoji(emoji)}
          className={cn(
            'text-base md:text-lg lg:text-xl hover:scale-125 transition-transform active:scale-95 duration-200 p-1 md:p-1.5',
            index > 2 && 'hidden md:block', // Show only 3 emojis on small screens
            index > 4 && 'hidden lg:block',
          )}
          aria-label={tAria('sendReaction', { emoji })}
        >
          {emoji}
        </Button>
      ))}

      <div className="w-px h-3 bg-background/20 mx-0.5 md:mx-1" />

      <Button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        onMouseEnter={() => void import('emoji-picker-react')}
        onFocus={() => void import('emoji-picker-react')}
        className={cn(
          'p-1 md:p-1.5 rounded-full transition-[colors,transform] duration-200',
          showPicker
            ? 'bg-background/20 text-primary-foreground'
            : 'text-primary-foreground/40 hover:text-primary-foreground/10',
        )}
        title={t('emoji.fullLibrary')}
        aria-label={t('emoji.openPicker')}
        aria-expanded={showPicker}
        aria-haspopup="dialog"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 h-4 lg:w-5 h-5" />
      </Button>

      {/* Popover */}
      {showPicker ? (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[100] shadow-2xl rounded-xl overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none"
        >
          <EmojiPicker
            theme={resolvedDark ? Theme.DARK : Theme.LIGHT}
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

import { EmojiStyle, Theme } from 'emoji-picker-react';
import { ExternalLink, Send, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { memo, useMemo } from 'react';
import { useTheme } from '@/providers/theme-provider';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-[300px] bg-zinc-900 rounded-xl animate-pulse" />
  ),
});

import { Button } from '@/components/ui/button';
import { parseLinks } from '@/lib/linkify';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../../room/types';
import { useChatScroll } from '../hooks/use-chat-scroll';
import { useWatchPartyChat } from '../hooks/use-watch-party-chat';

interface TypingUser {
  userId: string;
  userName: string;
}

interface WatchPartyChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId?: string;
  isMobile?: boolean;
  typingUsers?: TypingUser[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

// Read-only variant for when chat is disabled
export const WatchPartyChatDisabled = memo(function WatchPartyChatDisabled({
  messages,
  currentUserId,
}: Pick<WatchPartyChatProps, 'messages' | 'currentUserId'>) {
  const { messagesEndRef } = useChatScroll();
  const t = useTranslations('party.chat');

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUserId;
          const showHeader =
            index === 0 ||
            messages[index - 1].userId !== msg.userId ||
            msg.timestamp - messages[index - 1].timestamp > 60000;

          return (
            <ChatMessageItem
              key={msg.clientId || msg.id}
              message={msg}
              isMe={isMe}
              showHeader={showHeader}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t-[4px] border-border bg-background text-center shrink-0">
        <p className="text-xs font-black font-headline uppercase tracking-widest text-neo-red">
          {t('disabled')}
        </p>
      </div>
    </div>
  );
});

// Stable empty array — prevents new reference on every parent render (rule 5.4)
const EMPTY_TYPING_USERS: TypingUser[] = [];

export const WatchPartyChat = memo(function WatchPartyChat({
  messages,
  onSendMessage,
  currentUserId,
  typingUsers = EMPTY_TYPING_USERS,
  onTypingStart,
  onTypingStop,
}: WatchPartyChatProps) {
  const {
    input,
    showEmoji,
    setShowEmoji,
    messagesEndRef,
    emojiRef,
    handleSend,
    handleKeyDown,
    handleInputChange,
    onEmojiClick,
  } = useWatchPartyChat({
    messageCount: messages.length,
    onSendMessage,
    onTypingStart,
    onTypingStop,
  });

  const { theme: appTheme } = useTheme();
  const t = useTranslations('party.chat');

  const resolvedDark =
    appTheme === 'dark' ||
    (appTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 no-scrollbar bg-background"
        style={{ contentVisibility: 'auto' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground text-sm space-y-3">
            <div className="w-16 h-16 bg-background border-[4px] border-border flex items-center justify-center ">
              <Smile className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="text-center">
              <p className="font-black font-headline uppercase tracking-widest text-lg">
                {t('noMessages')}
              </p>
              <p className="text-xs font-headline uppercase tracking-widest font-bold text-foreground/70 mt-1">
                {t('beFirst')}
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUserId;
          const showHeader =
            index === 0 ||
            messages[index - 1].userId !== msg.userId ||
            msg.timestamp - messages[index - 1].timestamp > 60000;

          return (
            <ChatMessageItem
              key={msg.clientId || msg.id}
              message={msg}
              isMe={isMe}
              showHeader={showHeader}
            />
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 ? (
          <div className="flex items-center gap-2 px-2 py-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-[2px] border-border bg-[var(--wp-send-btn,var(--neo-yellow))] flex items-center justify-center">
                <span className="text-[10px] font-black font-headline uppercase text-foreground">
                  {typingUsers[0].userName.charAt(0)}
                </span>
              </div>
              <span className="text-xs font-black font-headline uppercase tracking-widest text-foreground">
                {typingUsers.length === 1
                  ? t('isTyping', { name: typingUsers[0].userName })
                  : typingUsers.length === 2
                    ? t('twoTyping', {
                        name1: typingUsers[0].userName,
                        name2: typingUsers[1].userName,
                      })
                    : typingUsers.length === 3
                      ? t('threeTyping', {
                          name1: typingUsers[0].userName,
                          name2: typingUsers[1].userName,
                          name3: typingUsers[2].userName,
                        })
                      : t('manyTyping', { count: typingUsers.length })}
              </span>
            </div>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce motion-reduce:animate-none" />
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmoji ? (
        <div
          ref={emojiRef}
          className="absolute bottom-20 left-4 z-50 border-[4px] border-border bg-background  rounded-none overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none"
        >
          <EmojiPicker
            theme={resolvedDark ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.APPLE}
            lazyLoadEmojis={true}
            height={350}
            width={300}
            onEmojiClick={onEmojiClick}
            previewConfig={{ showPreview: false }}
            style={
              {
                '--epr-bg-color': '#ffffff',
                '--epr-category-label-bg-color': '#ffffff',
                '--epr-picker-border-color': 'transparent',
                '--epr-search-input-bg-color': '#f5f0e8',
                '--epr-search-input-border-color': 'var(--neo-border)',
                '--epr-search-input-border-radius': '0px',
                '--epr-hover-bg-color': 'var(--neo-yellow)',
                '--epr-focus-bg-color': 'var(--neo-yellow)',
                '--epr-highlight-color': 'var(--neo-yellow)',
                borderRadius: '0px',
              } as React.CSSProperties
            }
          />
        </div>
      ) : null}

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t-[4px] border-border bg-background relative z-10 shrink-0"
      >
        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            onMouseEnter={() => void import('emoji-picker-react')}
            onFocus={() => void import('emoji-picker-react')}
            className={cn(
              'p-2.5 rounded-md transition-colors',
              showEmoji
                ? 'bg-primary text-[var(--wp-accent,var(--neo-yellow))]'
                : 'bg-background text-foreground hover:bg-neo-yellow/80',
            )}
            title={t('addEmoji')}
          >
            <Smile className="w-5 h-5 stroke-[3px]" />
          </Button>

          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="flex-1 text-foreground placeholder:text-foreground/50 px-4 py-2.5 rounded-md bg-background text-sm font-bold font-headline tracking-wide focus:outline-none focus:border-[var(--wp-send-btn,var(--neo-blue))] transition-colors"
          />
          <Button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'p-2.5 rounded-md transition-colors',
              input.trim()
                ? 'bg-[var(--wp-send-btn,var(--neo-blue))] text-primary-foreground '
                : 'bg-background text-foreground/30 cursor-not-allowed',
            )}
          >
            <Send className="w-5 h-5 stroke-[3px]" />
          </Button>
        </div>
      </form>
    </div>
  );
});

interface ChatMessageItemProps {
  message: ChatMessage;
  isMe: boolean;
  showHeader: boolean;
}

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isMe,
  showHeader,
}: ChatMessageItemProps) {
  // Detect if message is a single emoji
  const isSingleEmoji = useMemo(() => {
    const trimmed = message.content.trim();
    // Regex for a single emoji (including complex ones with joiners)
    // We check if it's one grapheme and that grapheme is an emoji
    try {
      const segments = Array.from(
        new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(trimmed),
      );
      return (
        segments.length === 1 &&
        /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/u.test(
          segments[0].segment,
        )
      );
    } catch {
      // Fallback for environments without Intl.Segmenter
      return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u.test(trimmed);
    }
  }, [message.content]);

  if (message.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-[10px] bg-background border-[2px] border-border text-foreground font-black font-headline uppercase tracking-widest px-3 py-1 ">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col w-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none',
        isMe ? 'items-end' : 'items-start',
      )}
    >
      {/* Avatar/Name Header */}
      {!isMe && showHeader ? (
        <div className="flex items-center gap-2 mb-1 pl-1">
          <div className="w-6 h-6 border-[2px] border-border bg-[var(--wp-send-btn,var(--neo-yellow))] flex items-center justify-center">
            <span className="text-[10px] font-black font-headline uppercase text-foreground">
              {message.userName.charAt(0)}
            </span>
          </div>
          <span className="text-xs text-foreground font-black font-headline uppercase tracking-widest">
            {message.userName}
          </span>
          <span className="text-[10px] text-foreground/70 font-bold font-headline uppercase tracking-widest">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ) : null}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[85%] relative group',
          isSingleEmoji
            ? 'p-0 border-0 bg-transparent text-6xl leading-none'
            : 'px-4 py-2 rounded-md text-sm break-words',
          isMe
            ? cn(
                'mr-1',
                !isSingleEmoji &&
                  'bg-[var(--wp-send-btn,var(--neo-blue))] text-primary-foreground ',
              )
            : cn('ml-1', !isSingleEmoji && 'bg-background text-foreground '),
        )}
      >
        {/* Render message with clickable links */}
        {parseLinks(message.content).map((segment) => {
          if (segment.type === 'link') {
            return (
              <a
                key={`${message.id}-${segment.id}`}
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 underline font-bold hover:bg-primary hover:text-primary-foreground px-1 transition-colors',
                  isMe
                    ? 'text-primary-foreground'
                    : 'text-[var(--wp-send-btn,var(--neo-blue))]',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {segment.url}
                <ExternalLink className="w-3 h-3 inline stroke-[3px]" />
              </a>
            );
          }
          return (
            <span
              key={`${message.id}-${segment.id}`}
              className={cn(
                'whitespace-pre-wrap',
                isSingleEmoji ? 'font-normal' : 'font-medium',
              )}
            >
              {segment.content}
            </span>
          );
        })}

        {/* Timestamp for Me */}
        {isMe ? (
          <span
            className={cn(
              'text-[9px] font-bold font-headline uppercase tracking-widest text-foreground block text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-2 bg-background border-[2px] border-border px-1  z-10 w-max',
              isSingleEmoji ? '-bottom-6' : '-mb-6',
            )}
          >
            {isSingleEmoji ? '' : ''}
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
});

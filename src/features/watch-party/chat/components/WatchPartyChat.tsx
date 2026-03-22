import { EmojiStyle, Theme } from 'emoji-picker-react';
import { ExternalLink, Send, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo } from 'react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-[300px] bg-zinc-900 rounded-xl animate-pulse" />
  ),
});

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
              key={msg.id}
              message={msg}
              isMe={isMe}
              showHeader={showHeader}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t-[4px] border-[#1a1a1a] bg-[#f5f0e8] text-center shrink-0">
        <p className="text-xs font-black font-headline uppercase tracking-widest text-[#e63b2e]">
          Chat has been disabled by the host
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

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#f5f0e8]"
        style={{ contentVisibility: 'auto' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#1a1a1a] text-sm space-y-3">
            <div className="w-16 h-16 bg-white border-[4px] border-[#1a1a1a] flex items-center justify-center neo-shadow">
              <Smile className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="text-center">
              <p className="font-black font-headline uppercase tracking-widest text-lg">
                No messages yet
              </p>
              <p className="text-xs font-headline uppercase tracking-widest font-bold text-[#4a4a4a] mt-1">
                Be the first to say hello! 👋
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
              key={msg.id}
              message={msg}
              isMe={isMe}
              showHeader={showHeader}
            />
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 ? (
          <div className="flex items-center gap-2 px-2 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-[2px] border-[#1a1a1a] bg-[var(--wp-send-btn,#ffcc00)] flex items-center justify-center">
                <span className="text-[10px] font-black font-headline uppercase text-[#1a1a1a]">
                  {typingUsers[0].userName.charAt(0)}
                </span>
              </div>
              <span className="text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing`
                  : typingUsers.length === 2
                    ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`
                    : typingUsers.length === 3
                      ? `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing`
                      : `${typingUsers.length} people are typing`}
              </span>
            </div>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full animate-bounce" />
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmoji ? (
        <div
          ref={emojiRef}
          className="absolute bottom-16 left-4 z-50 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.APPLE}
            lazyLoadEmojis={true}
            height={350}
            width={300}
            onEmojiClick={onEmojiClick}
            previewConfig={{ showPreview: false }}
          />
        </div>
      ) : null}

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t-[4px] border-[#1a1a1a] bg-[#f5f0e8] relative z-10"
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            onMouseEnter={() => void import('emoji-picker-react')}
            onFocus={() => void import('emoji-picker-react')}
            className={cn(
              'p-2.5 border-[3px] border-[#1a1a1a] transition-colors',
              showEmoji
                ? 'bg-[#1a1a1a] text-[var(--wp-accent,#ffcc00)]'
                : 'bg-white text-[#1a1a1a] hover:bg-[#ffe066]',
            )}
            title="Add emoji"
          >
            <Smile className="w-5 h-5 stroke-[3px]" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 text-[#1a1a1a] placeholder:text-[#1a1a1a]/50 px-4 py-2.5 border-[3px] border-[#1a1a1a] bg-white text-sm font-bold font-headline tracking-wide focus:outline-none focus:border-[var(--wp-send-btn,#0055ff)] transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'p-2.5 border-[3px] border-[#1a1a1a] transition-colors',
              input.trim()
                ? 'bg-[var(--wp-send-btn,#0055ff)] text-white neo-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                : 'bg-[#f5f0e8] text-[#1a1a1a]/30 cursor-not-allowed',
            )}
          >
            <Send className="w-5 h-5 stroke-[3px]" />
          </button>
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
  if (message.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-[10px] bg-white border-[2px] border-[#1a1a1a] text-[#1a1a1a] font-black font-headline uppercase tracking-widest px-3 py-1 neo-shadow-sm">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
        isMe ? 'items-end' : 'items-start',
      )}
    >
      {/* Avatar/Name Header */}
      {!isMe && showHeader ? (
        <div className="flex items-center gap-2 mb-1 pl-1">
          <div className="w-6 h-6 border-[2px] border-[#1a1a1a] bg-[var(--wp-send-btn,#ffcc00)] flex items-center justify-center">
            <span className="text-[10px] font-black font-headline uppercase text-[#1a1a1a]">
              {message.userName.charAt(0)}
            </span>
          </div>
          <span className="text-xs text-[#1a1a1a] font-black font-headline uppercase tracking-widest">
            {message.userName}
          </span>
          <span className="text-[10px] text-[#4a4a4a] font-bold font-headline uppercase tracking-widest">
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
          'px-4 py-2 border-[3px] border-[#1a1a1a] text-sm max-w-[85%] break-words relative group',
          isMe
            ? 'bg-[var(--wp-send-btn,#0055ff)] text-white neo-shadow-sm mr-1'
            : 'bg-white text-[#1a1a1a] neo-shadow-sm ml-1',
        )}
      >
        {/* Render message with clickable links */}
        {parseLinks(message.content).map((segment, idx) => {
          if (segment.type === 'link') {
            return (
              <a
                key={`${message.id}-link-${idx}`}
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 underline font-bold hover:bg-[#1a1a1a] hover:text-white px-1 transition-colors',
                  isMe ? 'text-white' : 'text-[var(--wp-send-btn,#0055ff)]',
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
              key={`${message.id}-text-${idx}`}
              className="font-medium whitespace-pre-wrap"
            >
              {segment.content}
            </span>
          );
        })}

        {/* Timestamp for Me */}
        {isMe ? (
          <span className="text-[9px] font-bold font-headline uppercase tracking-widest text-[#1a1a1a] block text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-2 -mb-6 bg-white border-[2px] border-[#1a1a1a] px-1 neo-shadow-sm z-10 w-max">
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

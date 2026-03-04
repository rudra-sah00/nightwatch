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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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

      <div
        className="p-4 border-t backdrop-blur-md text-center"
        style={{
          background: 'var(--wp-footer-bg)',
          borderColor: 'var(--wp-footer-border)',
        }}
      >
        <p className="text-xs text-white/30 italic">
          Chat has been disabled by the host.
        </p>
      </div>
    </div>
  );
});

export const WatchPartyChat = memo(function WatchPartyChat({
  messages,
  onSendMessage,
  currentUserId,
  typingUsers = [],
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
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        style={{ contentVisibility: 'auto' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Smile className="w-6 h-6 opacity-50" />
            </div>
            <p>No messages yet.</p>
            <p className="text-xs opacity-70">Be the first to say hello! 👋</p>
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
            <div className="flex items-center gap-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'var(--wp-typing-avatar)' }}
              >
                <span className="text-[9px] font-bold text-white uppercase">
                  {typingUsers[0].userName.charAt(0)}
                </span>
              </div>
              <span className="text-xs text-white/70">
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
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
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
        className="p-3 border-t backdrop-blur-md relative z-10"
        style={{
          background: 'var(--wp-footer-bg)',
          borderColor: 'var(--wp-footer-border)',
        }}
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            onMouseEnter={() => void import('emoji-picker-react')}
            onFocus={() => void import('emoji-picker-react')}
            className={cn(
              'p-2 rounded-full transition-colors',
              showEmoji ? 'text-white' : 'text-white/50 hover:text-white/80',
            )}
            style={{
              background: showEmoji ? 'var(--wp-accent-muted)' : undefined,
            }}
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 text-white placeholder:text-white/30 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
            style={{ background: 'var(--wp-input-bg)' }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--wp-input-focus)';
              e.currentTarget.style.boxShadow =
                '0 0 0 1px var(--wp-input-ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'var(--wp-input-bg)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'p-2.5 rounded-xl transition-[colors,transform] duration-200',
              input.trim()
                ? 'text-zinc-900'
                : 'text-white/20 cursor-not-allowed',
            )}
            style={{
              background: input.trim()
                ? 'var(--wp-send-btn)'
                : 'var(--wp-accent-soft)',
            }}
          >
            <Send className="w-4 h-4" />
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
      <div className="flex justify-center my-3">
        <span className="text-[10px] bg-white/5 text-white/50 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
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
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-[9px] font-bold text-white uppercase">
              {message.userName.charAt(0)}
            </span>
          </div>
          <span className="text-xs text-white/70 font-medium">
            {message.userName}
          </span>
          <span className="text-[10px] text-white/30">
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
          'px-3.5 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm relative group',
          isMe
            ? 'bg-purple-600 text-white rounded-br-sm shadow-purple-500/10'
            : 'bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-sm border border-white/5',
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
                  'inline-flex items-center gap-1 underline hover:opacity-80 transition-opacity',
                  isMe ? 'text-white' : 'text-blue-400',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {segment.url}
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            );
          }
          return (
            <span key={`${message.id}-text-${idx}`}>{segment.content}</span>
          );
        })}

        {/* Timestamp for Me */}
        {isMe ? (
          <span className="text-[9px] text-white/50 block text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-2 -mb-5 bg-black/50 px-1 rounded">
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

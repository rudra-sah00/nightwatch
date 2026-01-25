import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Send, Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../types';

interface WatchPartyChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId?: string;
  isMobile?: boolean;
}

export function WatchPartyChat({
  messages,
  onSendMessage,
  currentUserId,
}: WatchPartyChatProps) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll when message count changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
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

  const onEmojiClick = (emojiObject: { emoji: string }) => {
    setInput((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Smile className="w-6 h-6 opacity-50" />
            </div>
            <p>No messages yet.</p>
            <p className="text-xs opacity-70">Be the first to say hello! 👋</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUserId;
          const showHeader =
            index === 0 ||
            messages[index - 1].userId !== msg.userId ||
            msg.timestamp - messages[index - 1].timestamp > 60000;

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <span className="text-[10px] bg-white/5 text-white/50 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
                isMe ? 'items-end' : 'items-start',
              )}
            >
              {/* Avatar/Name Header */}
              {!isMe && showHeader && (
                <div className="flex items-center gap-2 mb-1 pl-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-[9px] font-bold text-white uppercase">
                      {msg.userName.charAt(0)}
                    </span>
                  </div>
                  <span className="text-xs text-white/70 font-medium">
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm relative group',
                  isMe
                    ? 'bg-purple-600 text-white rounded-br-sm shadow-purple-500/10'
                    : 'bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-sm border border-white/5',
                )}
              >
                {msg.content}

                {/* Timestamp for Me (standardized, overlaid on hover or distinct) */}
                {isMe && (
                  <span className="text-[9px] text-white/50 block text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-2 -mb-5 bg-black/50 px-1 rounded">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmoji && (
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
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-black/40 border-t border-white/10 backdrop-blur-md relative z-10"
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={cn(
              'p-2 rounded-full transition-colors',
              showEmoji
                ? 'bg-white/10 text-yellow-400'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5',
            )}
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 text-white placeholder:text-white/30 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/10 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'p-2.5 rounded-xl transition-all duration-200',
              input.trim()
                ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20'
                : 'bg-white/5 text-white/20 cursor-not-allowed',
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

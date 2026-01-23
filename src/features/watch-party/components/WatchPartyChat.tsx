import { Send } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm">
            <p>No messages yet.</p>
            <p>Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUserId;
          const showHeader =
            index === 0 ||
            messages[index - 1].userId !== msg.userId ||
            msg.timestamp - messages[index - 1].timestamp > 60000;

          // Date separator logic could go here (e.g., "Today")

          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col w-full',
                isMe ? 'items-end' : 'items-start',
              )}
            >
              {/* Avatar/Name Header */}
              {!isMe && showHeader && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white uppercase">
                      {msg.userName.charAt(0)}
                    </span>
                  </div>
                  <span className="text-xs text-white/60 font-medium">
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-white/40">
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
                  'px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-white/10 text-white rounded-bl-none',
                )}
              >
                {msg.content}
              </div>

              {/* Timestamp for Me (standardized) */}
              {isMe && (
                <span className="text-[10px] text-white/30 mt-1 mr-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-black/60 border-t border-white/10 backdrop-blur-md"
      >
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            className="w-full bg-white/10 text-white placeholder:text-white/40 px-4 py-3 pr-10 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:bg-transparent disabled:text-white/30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

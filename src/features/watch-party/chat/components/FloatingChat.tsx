'use client';

import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../room/types';

interface FloatingChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (content: string) => void;
  /** Whether the local user is allowed to send messages */
  canChat?: boolean;
}

/**
 * Invisible floating chat overlay — shown over the video when the sidebar
 * is collapsed and the "Floating chat" toggle is enabled.
 *
 * - No background on the message list — text only, readable via text-shadow.
 * - Max height 60 % of screen; older messages scroll up.
 * - A minimal glass-effect input at the bottom lets users send messages.
 * - Pointer-events are only active on the input row so the video is still
 *   clickable through the message list.
 */
export function FloatingChat({
  messages,
  currentUserId,
  onSendMessage,
  canChat = true,
}: FloatingChatProps) {
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to the newest message after each render where count grew.
  // No dep array — biome-safe pattern: refs are compared inside, so this
  // is effectively a no-op on renders that don't add new messages.
  useEffect(() => {
    const count = messages.length;
    if (count === prevCountRef.current) return;
    prevCountRef.current = count;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Only keep the last 60 messages for perf
  const visibleMessages = messages.slice(-60);

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 w-72 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-right-3 duration-300">
      {/* ── Message list — no background, text + shadow only ── */}
      <div
        ref={listRef}
        className="w-full max-h-[55vh] overflow-y-auto flex flex-col gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-none select-none"
      >
        {visibleMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <p
                key={msg.id}
                className="text-[11px] text-white/40 italic text-right leading-snug px-1"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
              >
                {msg.content}
              </p>
            );
          }

          const isMe = msg.userId === currentUserId;
          return (
            <p
              key={msg.id}
              className="text-sm leading-snug text-right px-1"
              style={{
                textShadow:
                  '0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7)',
              }}
            >
              <span
                className={`font-semibold mr-1 ${isMe ? 'text-indigo-300' : 'text-white/65'}`}
              >
                {isMe ? 'You' : msg.userName}:
              </span>
              <span className="text-white/90 font-normal">{msg.content}</span>
            </p>
          );
        })}
      </div>

      {/* ── Send input — glass pill ── */}
      {canChat ? (
        <div className="flex items-center gap-1.5 w-full pointer-events-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chat…"
            maxLength={200}
            aria-label="Send a chat message"
            className="flex-1 text-sm text-white placeholder-white/30 bg-black/55 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 outline-none focus:border-white/25 transition-colors min-w-0"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
            className="p-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white/55 hover:text-white hover:border-white/25 transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '../../room/types';

interface FloatingChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  currentUserName?: string;
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
 * - Pointer-events allow scrolling the message list without blocking the entire screen.
 */
export function FloatingChat({
  messages,
  currentUserId,
  currentUserName,
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
    <div className="fixed bottom-28 right-4 z-40 flex flex-col items-end gap-2 w-72 max-w-[calc(100vw-2rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300 motion-reduce:animate-none">
      {/* ── Message list — no background, text + shadow only ── */}
      <div
        ref={listRef}
        className="w-full max-h-[55vh] overflow-y-auto flex flex-col gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto select-none"
      >
        {visibleMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <p
                key={msg.id}
                className="text-[11px] text-white/60 italic text-right leading-snug px-1"
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
                className={`font-semibold mr-1 ${isMe ? 'text-indigo-300' : 'text-white/80'}`}
              >
                {isMe
                  ? currentUserName
                    ? `You (${currentUserName})`
                    : 'You'
                  : msg.userName}
                :
              </span>
              <span className="text-white font-normal">{msg.content}</span>
            </p>
          );
        })}
      </div>

      {/* ── Send input — Neo-brutalist ── */}
      {canChat ? (
        <div className="flex items-center gap-1.5 w-full pointer-events-auto mt-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TYPE SOMETHING..."
            maxLength={200}
            aria-label="Send a chat message"
            className="flex-1 text-xs font-black font-headline uppercase tracking-widest text-white placeholder:text-white/50 bg-black/80 backdrop-blur-sm border-[3px] border-white/20 px-3 py-2.5 outline-none focus:bg-black transition-colors min-w-0 rounded-md"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
            className="p-2.5 bg-neo-yellow border-[3px] border-black text-black font-black active:bg-neo-yellow/80 hover:bg-neo-yellow/90 hover:text-black transition-colors disabled:opacity-50 disabled:grayscale rounded-md"
          >
            <Send className="w-4 h-4 stroke-[3px]" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

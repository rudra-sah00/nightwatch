'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '../../room/types';
import { CHAT_SURFACE_ATTR } from '../../theatre/lib/keyboard';

/** Props for the {@link FloatingChat} component. */
interface FloatingChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  currentUserName?: string;
  onSendMessage: (content: string) => void;
  /** Whether the local user is allowed to send messages */
  canChat?: boolean;
}

/**
 * Transparent floating chat overlay rendered over the video area when the
 * sidebar is collapsed and the "Floating chat" toggle is enabled.
 *
 * @remarks
 * - No background on the message list — text is readable via `text-shadow`.
 * - Max height 60% of screen; older messages scroll up.
 * - A minimal glass-effect input at the bottom lets users send messages.
 * - `pointer-events` allow scrolling without blocking the video.
 */
export function FloatingChat({
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  canChat = true,
}: FloatingChatProps) {
  const [input, setInput] = useState('');
  const t = useTranslations('party');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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

  /**
   * Clicking anywhere on the panel puts the caret in the message field.
   *
   * Without this, clicking the transcript leaves focus on `<body>`, and in 3D
   * theatre mode the next letters typed are swallowed by the scene's `WASD`/`E`/
   * `R`/`V` shortcuts instead of appearing in the box. Bound imperatively rather
   * than as an `onMouseDown` prop because a focus convenience does not make a
   * static container an interactive control.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function focusInput() {
      inputRef.current?.focus();
    }
    root.addEventListener('mousedown', focusInput);
    return () => root.removeEventListener('mousedown', focusInput);
  }, []);

  // Only keep the last 60 messages for perf
  const visibleMessages = messages.slice(-60);

  return (
    // z-50, not z-40: in 3D theatre mode the scene canvas is an opaque
    // `absolute inset-0 z-40 bg-black` layer, so at the same z-index the canvas
    // painted straight over this panel and chat vanished the moment you entered
    // the room.
    //
    // `CHAT_SURFACE_ATTR` makes every theatre shortcut treat this region as text
    // entry. Clicking the message list also focuses the field, because otherwise
    // focus stays on <body> and the letters you type get read as WASD/E/R/V.
    <div
      id="wp-floating-chat"
      ref={rootRef}
      {...{ [CHAT_SURFACE_ATTR]: '' }}
      className="fixed bottom-28 right-4 z-50 flex flex-col items-end gap-2 w-72 max-w-[calc(100vw-2rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300 motion-reduce:animate-none"
    >
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
                    ? t('chat.youWithName', { name: currentUserName })
                    : t('chat.you')
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.typeSomething')}
            maxLength={200}
            aria-label={t('chat.sendMessage')}
            data-allow-clipboard
            className="flex-1 text-xs font-black font-headline uppercase tracking-widest text-white placeholder:text-white/50 bg-black/80 backdrop-blur-sm border-[3px] border-white/20 px-3 py-2.5 outline-none focus:bg-black transition-colors min-w-0 rounded-md"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label={t('chat.send')}
            className="p-2.5 bg-neo-yellow border-[3px] border-black text-black font-black active:bg-neo-yellow/80 hover:bg-neo-yellow/90 hover:text-black transition-colors disabled:opacity-50 disabled:grayscale rounded-md"
          >
            <Send className="w-4 h-4 stroke-[3px]" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

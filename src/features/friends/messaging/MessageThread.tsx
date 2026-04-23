'use client';

import { Theme } from 'emoji-picker-react';
import {
  ArrowUp,
  ChevronLeft,
  Loader2,
  Phone,
  Reply,
  ShieldBan,
  Smile,
  UserMinus,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  blockUser,
  invalidateFriendsCache,
  removeFriend,
} from '@/features/friends/api';
import { useAuth } from '@/providers/auth-provider';
import { useSocket } from '@/providers/socket-provider';
import { useTheme } from '@/providers/theme-provider';
import { useCall } from '../hooks/use-call';
import { useMessageThread } from '../hooks/use-messages';
import type { ConversationPreview } from '../types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function MessageThread({
  friend,
  onBack,
}: {
  friend: ConversationPreview;
  onBack: () => void;
}) {
  const {
    messages,
    isLoading,
    isSending,
    nextCursor,
    isLoadingMore,
    loadMore,
    send,
    emitTypingStart,
    emitTypingStop,
  } = useMessageThread(friend.friendId);
  const { user } = useAuth();
  const { socket } = useSocket();
  const callActions = useCall();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const t = useTranslations('common.friends');
  const tc = useTranslations('common.friends.call');

  // Close menu/emoji on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler, { passive: true });
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll to bottom on new messages
  const lastMessageId = messages[0]?.id;
  useEffect(() => {
    if (!lastMessageId) return;
    if (scrollRef.current && !isLoadingMore) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastMessageId, isLoadingMore]);

  // Typing indicator from friend
  useEffect(() => {
    if (!socket) return;

    const onTypingStart = (data: { userId: string }) => {
      if (data.userId === friend.friendId) setIsTyping(true);
    };
    const onTypingStop = (data: { userId: string }) => {
      if (data.userId === friend.friendId) setIsTyping(false);
    };

    socket.on('message:typing_start', onTypingStart);
    socket.on('message:typing_stop', onTypingStop);

    return () => {
      socket.off('message:typing_start', onTypingStart);
      socket.off('message:typing_stop', onTypingStop);
    };
  }, [socket, friend.friendId]);

  // Infinite scroll for older messages
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !nextCursor) return;
    if (scrollRef.current.scrollTop < 100) {
      loadMore();
    }
  }, [nextCursor, loadMore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    emitTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTypingStop(), 2000);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    const rid = replyTo?.id;
    setInput('');
    setReplyTo(null);
    emitTypingStop();
    await send(msg, rid);
  };

  return (
    <div className="flex-1 flex flex-col border-[3px] border-border rounded-xl overflow-hidden bg-background min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b-[3px] border-border">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1"
          aria-label={t('back')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              {friend.profilePhoto ? (
                <Image
                  src={friend.profilePhoto}
                  alt={friend.name}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-border object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-border bg-muted flex items-center justify-center font-headline font-black text-xs uppercase">
                  {friend.name[0]}
                </div>
              )}
              {friend.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full" />
              )}
            </div>
            <div className="text-left">
              <span className="font-headline font-bold text-sm">
                {friend.name}
              </span>
              <p className="text-xs text-foreground/50 font-headline uppercase tracking-widest">
                {isTyping
                  ? t('typing')
                  : friend.isOnline
                    ? t('online')
                    : t('offline')}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-card border-[3px] border-border rounded-xl shadow-lg z-50 overflow-hidden">
              {friend.username && (
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-foreground/50 font-headline uppercase tracking-widest">
                    @{friend.username}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={async () => {
                  setShowMenu(false);
                  try {
                    await removeFriend(friend.friendId);
                    invalidateFriendsCache();
                    toast.success(t('unfriended'));
                    onBack();
                  } catch {
                    toast.error(t('actionFailed'));
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-headline font-bold hover:bg-muted transition-colors text-left"
              >
                <UserMinus className="w-4 h-4 text-foreground/50" />
                {t('unfriend')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowMenu(false);
                  try {
                    await blockUser(friend.friendId);
                    invalidateFriendsCache();
                    toast.success(t('blocked'));
                    onBack();
                  } catch {
                    toast.error(t('actionFailed'));
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-headline font-bold hover:bg-destructive/10 text-destructive transition-colors text-left"
              >
                <ShieldBan className="w-4 h-4" />
                {t('block')}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            callActions.initiateCall({
              id: friend.friendId,
              name: friend.name,
              photo: friend.profilePhoto,
            })
          }
          disabled={callActions.callState !== 'idle'}
          className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          aria-label={tc('callButton')}
        >
          <Phone className="w-4 h-4 text-foreground/50" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-2"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-foreground/30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="font-headline font-bold uppercase tracking-widest text-foreground/30 text-xs">
              {t('noMessages')}
            </p>
          </div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-foreground/30" />
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              const repliedMsg = msg.replyToId
                ? messages.find((m) => m.id === msg.replyToId)
                : null;
              return (
                <div
                  key={msg.id}
                  className={`group flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {isMine && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo({ id: msg.id, content: msg.content })
                      }
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-foreground/25 hover:text-foreground/60 hover:bg-muted"
                      aria-label={tc('reply')}
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl text-sm ${
                      isMine
                        ? 'bg-foreground text-background rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {repliedMsg && (
                      <div
                        className={`mx-2 mt-2 flex items-stretch gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer ${
                          isMine ? 'bg-background/10' : 'bg-foreground/[0.04]'
                        }`}
                      >
                        <div className="w-[3px] shrink-0 rounded-full bg-neo-blue" />
                        <div className="min-w-0">
                          <p
                            className={`text-[11px] font-bold leading-tight ${isMine ? 'text-neo-blue/80' : 'text-neo-blue'}`}
                          >
                            {repliedMsg.senderId === user?.id
                              ? tc('you')
                              : friend.name}
                          </p>
                          <p
                            className={`text-xs leading-tight truncate ${isMine ? 'text-background/50' : 'text-foreground/40'}`}
                          >
                            {repliedMsg.content}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="px-3.5 py-2 break-words">{msg.content}</div>
                  </div>

                  {!isMine && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo({ id: msg.id, content: msg.content })
                      }
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-foreground/25 hover:text-foreground/60 hover:bg-muted"
                      aria-label={tc('reply')}
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t-[3px] border-border">
        {replyTo && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 animate-in slide-in-from-bottom-2 duration-150">
            <div className="w-0.5 h-8 bg-neo-blue rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-foreground/40 mb-0.5">
                {tc('replying')}
              </p>
              <p className="text-xs text-foreground/60 truncate">
                {replyTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 rounded-lg hover:bg-muted text-foreground/30 hover:text-foreground/60 transition-colors"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 relative p-3">
          <div ref={emojiRef} className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={tc('emoji')}
            >
              <Smile className="w-5 h-5 text-foreground/40" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker
                  theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                  onEmojiClick={(e) => setInput((prev) => prev + e.emoji)}
                  width={320}
                  height={350}
                  skinTonesDisabled
                  searchDisabled={false}
                  lazyLoadEmojis
                />
              </div>
            )}
          </div>
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('typeMessage')}
            className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neo-blue font-body placeholder:text-foreground/30"
            disabled={isSending}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
            aria-label={t('send')}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

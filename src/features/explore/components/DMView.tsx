'use client';

import { Lock, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import {
  useDmGif,
  useDmPinned,
  useDmSearch,
} from '@/features/explore/hooks/use-dm-extras';
import { useDmMedia } from '@/features/explore/hooks/use-dm-media';
import { useTagSearch } from '@/features/explore/hooks/use-tag-search';
import type { PostTag } from '@/features/explore/types';
import { SLASH_COMMANDS } from '@/features/explore/types';
import { useCall } from '@/features/friends/hooks/use-call';
import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import { hapticLight } from '@/lib/haptics';
import { useSocket } from '@/providers/socket-provider';
import { useAuthStore } from '@/store/use-auth-store';
import { DMChatHeader } from './DMChatHeader';
import { DMConversationList } from './DMConversationList';
import { DMInputBar } from './DMInputBar';
import { DMMessageBubble } from './DMMessageBubble';

export interface Conversation {
  id: string;
  content: string | null;
  created_at: string | null;
  read_at: string | null;
  sender_id: string | null;
  peer_id: string;
  peer_name: string;
  peer_username: string | null;
  peer_photo: string | null;
  archived: boolean;
  locked: boolean;
  muted: boolean;
  marked_unread: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  replyToId: string | null;
  forwardedFromId?: string | null;
  readAt: string | null;
  deliveredAt?: string | null;
  deletedForAll?: boolean;
  createdAt: string;
  tag?: PostTag;
}

export function DMView({
  onChatOpen,
  closeChatRef,
}: {
  onChatOpen?: (open: boolean) => void;
  closeChatRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [conversations, setConversations] = useState<Conversation[] | null>(
    null,
  );
  const [activePeer, setActivePeer] = useState<Conversation | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [slashCommand, setSlashCommand] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [attachedTag, setAttachedTag] = useState<PostTag | null>(null);
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    attachment,
    isRecording,
    isUploading,
    recordingDuration,
    imageInputRef,
    videoInputRef,
    analyserRef,
    handleMediaSelect,
    startRecording,
    stopRecording,
    clearAttachment,
  } = useDmMedia();

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [attachPanel, setAttachPanel] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lockPromptPeer, setLockPromptPeer] = useState<Conversation | null>(
    null,
  );
  const [clearConfirmPeer, setClearConfirmPeer] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const t = useTranslations('common.dm');

  const dmSearch = useDmSearch(activePeer?.peer_id || null);
  const { initiateCall } = useCall();
  const dmPinned = useDmPinned(activePeer?.peer_id || null);
  const dmGif = useDmGif();

  const { results: tagResults } = useTagSearch(
    slashCommand
      ? SLASH_COMMANDS.find((c) => c.command === slashCommand)?.tagType || null
      : null,
    slashQuery,
  );

  useEffect(() => {
    if (closeChatRef) closeChatRef.current = closeChat;
  });

  useEffect(() => {
    onChatOpen?.(!!activePeer);
  }, [activePeer, onChatOpen]);

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>(
      '/api/messages?includeArchived=true',
    )
      .then((r) => setConversations(r.conversations))
      .catch(() => setConversations([]));
  }, []);

  const searchParams = useSearchParams();
  useEffect(() => {
    const peerId = searchParams.get('peer');
    if (!peerId || !conversations?.length) return;
    const conv = conversations.find((c) => c.peer_id === peerId);
    if (conv && !activePeer) {
      setActivePeer(conv);
      requestAnimationFrame(() => setChatVisible(true));
    }
  }, [searchParams, conversations, activePeer]);

  useEffect(() => {
    if (!activePeer) return;
    setMsgsLoading(true);
    setHasMoreMsgs(true);
    apiFetch<{ messages: Message[] }>(`/api/messages/${activePeer.peer_id}`)
      .then((r) => {
        setMsgs(r.messages.reverse());
        setHasMoreMsgs(r.messages.length === 50);
        setMsgsLoading(false);
        apiFetch(`/api/messages/${activePeer.peer_id}/read`, {
          method: 'POST',
        }).catch(() => {});
      })
      .catch(() => setMsgsLoading(false));
  }, [activePeer]);

  const loadOlderMessages = useCallback(async () => {
    if (!activePeer || loadingMore || !hasMoreMsgs || !msgs.length) return;
    setLoadingMore(true);
    try {
      const oldestId = msgs[0]?.id;
      const r = await apiFetch<{ messages: Message[] }>(
        `/api/messages/${activePeer.peer_id}?before=${oldestId}`,
      );
      const older = r.messages.reverse();
      setHasMoreMsgs(older.length === 50);
      setMsgs((prev) => [...older, ...prev]);
    } catch {
      /* ignore */
    }
    setLoadingMore(false);
  }, [activePeer, loadingMore, hasMoreMsgs, msgs]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: Message) => {
      setMsgs((prev) => [...prev, msg]);
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      if (activePeer) {
        socket.emit('dm:delivered', { peerId: activePeer.peer_id });
      }
    };
    const deleteHandler = (data: { messageId: string }) => {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedForAll: true, content: '' }
            : m,
        ),
      );
    };
    socket.on('dm:message', handler);
    socket.on('dm:message-deleted', deleteHandler);
    return () => {
      socket.off('dm:message', handler);
      socket.off('dm:message-deleted', deleteHandler);
    };
  }, [socket, activePeer]);

  useEffect(() => {
    if (!socket) return;
    const onTyping = (data: { senderId: string }) => {
      if (data.senderId === activePeer?.peer_id) {
        setPeerTyping(true);
        setTimeout(() => setPeerTyping(false), 3000);
      }
    };
    socket.on('dm:typing', onTyping);
    return () => {
      socket.off('dm:typing', onTyping);
    };
  }, [socket, activePeer?.peer_id]);

  useEffect(() => {
    if (msgs.length)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length]);

  const handleArchive = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/archive`, { method: 'POST' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) =>
          c.peer_id === peerId ? { ...c, archived: true } : c,
        ) ?? null,
    );
  }, []);

  const handleUnarchive = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/archive`, { method: 'DELETE' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) =>
          c.peer_id === peerId ? { ...c, archived: false } : c,
        ) ?? null,
    );
  }, []);

  const handleClear = useCallback((peerId: string) => {
    setClearConfirmPeer(peerId);
  }, []);

  const confirmClear = useCallback(() => {
    if (!clearConfirmPeer) return;
    apiFetch(`/api/messages/${clearConfirmPeer}/clear`, {
      method: 'POST',
    }).catch(() => {});
    setConversations(
      (prev) =>
        prev?.map((c) =>
          c.peer_id === clearConfirmPeer ? { ...c, content: null } : c,
        ) ?? null,
    );
    setClearConfirmPeer(null);
  }, [clearConfirmPeer]);

  const handleMute = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/mute`, { method: 'POST' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) => (c.peer_id === peerId ? { ...c, muted: true } : c)) ??
        null,
    );
  }, []);

  const handleUnmute = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/mute`, { method: 'DELETE' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) => (c.peer_id === peerId ? { ...c, muted: false } : c)) ??
        null,
    );
  }, []);

  const handleMarkUnread = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/mark-unread`, {
      method: 'POST',
    }).catch(() => {});
    setConversations(
      (prev) =>
        prev?.map((c) =>
          c.peer_id === peerId ? { ...c, marked_unread: true } : c,
        ) ?? null,
    );
  }, []);

  const handleLock = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/lock`, { method: 'POST' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) => (c.peer_id === peerId ? { ...c, locked: true } : c)) ??
        null,
    );
  }, []);

  const handleUnlock = useCallback((peerId: string) => {
    apiFetch(`/api/messages/${peerId}/lock`, { method: 'DELETE' }).catch(
      () => {},
    );
    setConversations(
      (prev) =>
        prev?.map((c) =>
          c.peer_id === peerId ? { ...c, locked: false } : c,
        ) ?? null,
    );
  }, []);

  const openChat = (conv: Conversation) => {
    if (conv.locked) {
      setLockPromptPeer(conv);
      setPinInput('');
      return;
    }
    setActivePeer(conv);
    requestAnimationFrame(() => setChatVisible(true));
  };

  const handlePinSubmit = () => {
    const stored = localStorage.getItem(`dm_pin_${lockPromptPeer?.peer_id}`);
    if (!stored) {
      localStorage.setItem(`dm_pin_${lockPromptPeer?.peer_id}`, pinInput);
      setActivePeer(lockPromptPeer);
      setLockPromptPeer(null);
      setPinInput('');
      requestAnimationFrame(() => setChatVisible(true));
      return;
    }
    if (pinInput === stored) {
      setActivePeer(lockPromptPeer);
      setLockPromptPeer(null);
      setPinInput('');
      requestAnimationFrame(() => setChatVisible(true));
    } else {
      setPinInput('');
    }
  };

  const closeChat = () => {
    setChatVisible(false);
    setTimeout(() => setActivePeer(null), 250);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    if (text && activePeer && socket) {
      socket.emit('dm:typing', { peerId: activePeer.peer_id });
    }
    const slashMatch = text.match(/^\/(\w+)\s*(.*)/);
    const validCmds: string[] = SLASH_COMMANDS.map((c) => c.command);
    if (slashMatch && validCmds.includes(`/${slashMatch[1]}`)) {
      setSlashCommand(`/${slashMatch[1]}`);
      setSlashQuery(slashMatch[2] || '');
    } else {
      setSlashCommand(null);
      setSlashQuery('');
    }
  };

  const handleTagSelect = (tag: PostTag) => {
    setAttachedTag(tag);
    setInput('');
    setSlashCommand(null);
    setSlashQuery('');
    trackEvent('explore_tag_select', { type: tag.type });
  };

  const sendMessage = useCallback(() => {
    if (
      (!input.trim() && !attachedTag && !attachment) ||
      !activePeer ||
      !socket
    )
      return;
    hapticLight();
    const content = attachedTag
      ? `[${attachedTag.type}] ${attachedTag.title}`
      : attachment
        ? `[${attachment.type}] ${attachment.url}`
        : input.trim();
    socket.emit('dm:send', {
      peerId: activePeer.peer_id,
      content,
      replyToId: replyingTo?.id,
    });
    setMsgs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: user!.id,
        receiverId: activePeer.peer_id,
        content,
        replyToId: replyingTo?.id || null,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput('');
    setAttachedTag(null);
    setReplyingTo(null);
    clearAttachment();
    trackEvent('dm_send');
  }, [
    input,
    attachedTag,
    attachment,
    activePeer,
    socket,
    user,
    replyingTo,
    clearAttachment,
  ]);

  const handleSearchChange = (query: string) => {
    dmSearch.setQuery(query);
    if (!searchOpen && query) setSearchOpen(true);
  };

  if (activePeer) {
    return (
      <div
        className={`absolute inset-0 z-30 flex flex-col bg-card transition-transform duration-250 ease-out max-h-[100dvh] ${chatVisible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ paddingBottom: 'var(--keyboard-height, 0px)' }}
      >
        <PageTitle title={activePeer.peer_name} href="/dm" />
        <DMChatHeader
          peer={activePeer}
          searchQuery={dmSearch.query}
          onSearchChange={handleSearchChange}
          onBack={closeChat}
          onCall={() =>
            initiateCall({
              id: activePeer.peer_id,
              name: activePeer.peer_name,
              photo: activePeer.peer_photo,
            })
          }
        />

        {searchOpen && dmSearch.results.length > 0 && (
          <div className="px-4 py-2 border-b border-border/50">
            <div className="max-h-32 overflow-y-auto space-y-1">
              {dmSearch.results.map((m) => (
                <div
                  key={m.id}
                  className="text-xs px-2 py-1.5 rounded bg-muted/30 truncate"
                >
                  <span className="text-foreground/40">
                    {new Date(m.createdAt).toLocaleDateString()}{' '}
                  </span>
                  {m.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {dmPinned.pinned.length > 0 && (
          <div className="px-4 py-2 border-b border-border/50 bg-amber-500/5">
            <p className="text-[10px] font-bold text-amber-600 mb-1">
              Pinned ({dmPinned.pinned.length})
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {dmPinned.pinned.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30"
                >
                  <span className="truncate flex-1">{m.content}</span>
                  <button
                    type="button"
                    onClick={() => dmPinned.unpin(m.id)}
                    className="text-foreground/30 hover:text-foreground ml-2 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop < 50 && hasMoreMsgs && !loadingMore)
              loadOlderMessages();
          }}
        >
          {loadingMore && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {msgsLoading ? (
            <div className="space-y-3">
              {['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'].map(
                (key, i) => (
                  <div
                    key={key}
                    className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="h-9 rounded-2xl bg-muted animate-pulse"
                      style={{ width: `${50 + Math.random() * 100}px` }}
                    />
                  </div>
                ),
              )}
            </div>
          ) : (
            msgs.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'} group`}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLElement).dataset.swipeX = String(
                    touch.clientX,
                  );
                  longPressTimer.current = setTimeout(() => {
                    setReactionMsgId(msg.id);
                    hapticLight();
                  }, 500);
                }}
                onTouchMove={() => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
                onTouchEnd={(e) => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                  const startX = Number(
                    (e.currentTarget as HTMLElement).dataset.swipeX || 0,
                  );
                  const endX = e.changedTouches[0].clientX;
                  if (endX - startX > 80) {
                    setReplyingTo(msg);
                    hapticLight();
                  }
                }}
              >
                <DMMessageBubble
                  msg={msg}
                  isOwn={msg.senderId === user?.id}
                  msgs={msgs}
                  onImageClick={setLightboxUrl}
                />
              </div>
            ))
          )}
          {peerTyping && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl bg-muted rounded-bl-md text-sm text-foreground/50 italic">
                typing...
              </div>
            </div>
          )}
        </div>

        {reactionMsgId && (
          <div className="px-4 py-2 border-t border-border/50 bg-card flex items-center gap-2">
            {[
              '\u2764\uFE0F',
              '\uD83D\uDC4D',
              '\uD83D\uDE02',
              '\uD83D\uDE2E',
              '\uD83D\uDE22',
              '\uD83D\uDD25',
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  socket?.emit('dm:react', { messageId: reactionMsgId, emoji });
                  setReactionMsgId(null);
                  hapticLight();
                }}
                className="text-xl p-1.5 hover:scale-125 active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReactionMsgId(null)}
              className="ml-auto p-1 text-foreground/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {lightboxUrl && (
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          >
            <img
              src={lightboxUrl}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </button>
        )}

        <DMInputBar
          input={input}
          onInputChange={handleInputChange}
          onSend={sendMessage}
          attachPanel={attachPanel}
          onToggleAttachPanel={() => setAttachPanel(!attachPanel)}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          analyser={analyserRef.current}
          attachment={attachment}
          attachedTag={attachedTag}
          onClearAttachment={clearAttachment}
          onClearTag={() => setAttachedTag(null)}
          isUploading={isUploading}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          peerName={activePeer.peer_name}
          userId={user?.id}
          imageInputRef={imageInputRef}
          videoInputRef={videoInputRef}
          onMediaSelect={handleMediaSelect}
          startRecording={startRecording}
          stopRecording={stopRecording}
          onGifToggle={dmGif.toggle}
          slashCommand={slashCommand}
          tagResults={tagResults}
          onTagSelect={handleTagSelect}
          sendDisabled={!input.trim() && !attachedTag && !attachment}
        />

        {dmGif.open && (
          <div className="border-t border-border/50 bg-card">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
              <input
                type="text"
                value={dmGif.query}
                onChange={(e) => dmGif.setQuery(e.target.value)}
                placeholder="Search GIFs..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <img
                src="/giphy-attribution.svg"
                alt="Powered by GIPHY"
                className="h-3.5 opacity-60"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 p-2 max-h-48 overflow-y-auto">
              {dmGif.results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    if (!activePeer || !socket) return;
                    const content = `[image] ${gif.url}`;
                    socket.emit('dm:send', {
                      peerId: activePeer.peer_id,
                      content,
                    });
                    setMsgs((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        senderId: user!.id,
                        receiverId: activePeer.peer_id,
                        content,
                        replyToId: null,
                        readAt: null,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                    dmGif.toggle();
                    hapticLight();
                  }}
                  className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary"
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-20 object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {lockPromptPeer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-72 space-y-4 text-center">
            <Lock className="w-8 h-8 mx-auto text-foreground/60" />
            <p className="text-sm font-bold">{t('enterPin')}</p>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinInput.length === 4)
                  handlePinSubmit();
              }}
              className="w-full text-center text-2xl tracking-[0.5em] bg-muted/30 rounded-lg py-2 outline-none"
              placeholder="••••"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLockPromptPeer(null)}
                className="flex-1 py-2 rounded-lg bg-muted text-sm"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 4}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-40"
              >
                {t('unlock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {clearConfirmPeer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-72 space-y-4 text-center">
            <p className="text-sm font-bold">{t('clearConfirmTitle')}</p>
            <p className="text-xs text-foreground/50">
              {t('clearConfirmDesc')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmPeer(null)}
                className="flex-1 py-2 rounded-lg bg-muted text-sm"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm"
              >
                {t('clearChat')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto [touch-action:pan-y] pb-16">
        <DMConversationList
          conversations={conversations}
          userId={user?.id}
          onOpenChat={openChat}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onClear={handleClear}
          onLock={handleLock}
          onUnlock={handleUnlock}
          onMute={handleMute}
          onUnmute={handleUnmute}
          onMarkUnread={handleMarkUnread}
        />
      </div>
    </div>
  );
}

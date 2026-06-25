'use client';

import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Mic,
  Pin,
  Play,
  Search,
  Send,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import { hapticLight } from '@/lib/haptics';
import { useSocket } from '@/providers/socket-provider';
import { useAuthStore } from '@/store/use-auth-store';
import { FilePreview } from './FilePreview';
import { LinkPreviewCard } from './LinkPreviewCard';
import { Waveform } from './Waveform';

interface Conversation {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
  peer_id: string;
  peer_name: string;
  peer_username: string | null;
  peer_photo: string | null;
}

interface Message {
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  const dmSearch = useDmSearch(activePeer?.peer_id || null);
  const dmPinned = useDmPinned(activePeer?.peer_id || null);
  const dmGif = useDmGif();

  const { results: tagResults } = useTagSearch(
    slashCommand
      ? SLASH_COMMANDS.find((c) => c.command === slashCommand)?.tagType || null
      : null,
    slashQuery,
  );

  // Expose close function to parent
  useEffect(() => {
    if (closeChatRef) closeChatRef.current = closeChat;
  }); // intentionally no deps - always keep ref in sync

  useEffect(() => {
    onChatOpen?.(!!activePeer);
  }, [activePeer, onChatOpen]);

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>('/api/messages')
      .then((r) => setConversations(r.conversations))
      .catch(() => setConversations([]));
  }, []);

  // Auto-open conversation from notification deep-link (?peer=userId)
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

  // Load messages for active peer
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

  // Load older messages on scroll to top
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

  // Real-time messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: Message) => {
      setMsgs((prev) => [...prev, msg]);
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      // Auto mark as delivered
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
    if (msgs.length)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length]);

  const openChat = (conv: Conversation) => {
    setActivePeer(conv);
    requestAnimationFrame(() => setChatVisible(true));
  };

  const closeChat = () => {
    setChatVisible(false);
    setTimeout(() => setActivePeer(null), 250);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
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

  // Chat view
  if (activePeer) {
    return (
      <div
        className={`absolute inset-0 z-30 flex flex-col bg-card transition-transform duration-250 ease-out ${chatVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <PageTitle title={activePeer.peer_name} href="/dm" />
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-lg px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={closeChat}
            className="p-1 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link
            href={`/user/${activePeer.peer_username || activePeer.peer_id}`}
            className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border"
          >
            {activePeer.peer_photo ? (
              <Image
                src={activePeer.peer_photo}
                alt=""
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {activePeer.peer_name[0]}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{activePeer.peer_name}</p>
            {activePeer.peer_username && (
              <p className="text-[10px] text-foreground/50">
                @{activePeer.peer_username}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPinnedOpen(!pinnedOpen)}
            className="p-1.5 rounded-full hover:bg-muted text-foreground/50"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-1.5 rounded-full hover:bg-muted text-foreground/50"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 py-2 border-b border-border/50">
            <input
              type="text"
              value={dmSearch.query}
              onChange={(e) => dmSearch.setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-muted/30 rounded-lg px-3 py-1.5 text-sm outline-none"
            />
            {dmSearch.results.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
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
            )}
          </div>
        )}

        {/* Pinned messages */}
        {pinnedOpen && dmPinned.pinned.length > 0 && (
          <div className="px-4 py-2 border-b border-border/50 bg-amber-500/5">
            <p className="text-[10px] font-bold text-amber-600 mb-1">
              📌 Pinned ({dmPinned.pinned.length})
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

        {/* Messages */}
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
                }}
                onTouchEnd={(e) => {
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
                <div
                  className={`max-w-[75%] ${msg.senderId === user?.id ? 'text-right' : 'text-left'}`}
                >
                  {/* Forwarded label */}
                  {msg.forwardedFromId && (
                    <p className="text-[9px] text-foreground/40 italic mb-0.5 px-1">
                      ↗ Forwarded
                    </p>
                  )}
                  {/* Reply quote bubble */}
                  {msg.replyToId && (
                    <div className="text-[10px] text-foreground/50 bg-muted/50 border-l-2 border-primary/50 rounded px-2 py-1 mb-1 max-w-[200px] truncate">
                      {msgs
                        .find((m) => m.id === msg.replyToId)
                        ?.content?.slice(0, 60) || 'Original message'}
                    </div>
                  )}
                  {/* Deleted for everyone */}
                  {msg.deletedForAll ? (
                    <div className="inline-block px-3.5 py-2 rounded-2xl text-sm bg-muted/30 text-foreground/40 italic border border-border/50">
                      🚫 Message deleted
                    </div>
                  ) : msg.content.startsWith('[document] ') ? (
                    <FilePreview
                      url={msg.content.slice(11)}
                      className="max-w-[280px]"
                    />
                  ) : msg.content.startsWith('[image] ') ? (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(msg.content.slice(8))}
                      className="block"
                    >
                      <img
                        src={msg.content.slice(8)}
                        alt=""
                        loading="lazy"
                        className="max-w-[220px] rounded-xl border border-border hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ) : msg.content.startsWith('[video] ') ? (
                    <video
                      src={msg.content.slice(8)}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-w-[220px] rounded-xl border border-border"
                    >
                      <track kind="captions" />
                    </video>
                  ) : msg.content.startsWith('[audio] ') ? (
                    <audio
                      src={msg.content.slice(8)}
                      controls
                      preload="metadata"
                      className="max-w-[220px]"
                    >
                      <track kind="captions" />
                    </audio>
                  ) : (
                    <div
                      className={`inline-block px-3.5 py-2 rounded-2xl text-sm ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}
                    >
                      {msg.content}
                    </div>
                  )}
                  {/* Link preview for text messages with URLs */}
                  {!msg.deletedForAll &&
                    !msg.content.startsWith('[') &&
                    msg.content.match(/https?:\/\/\S+/) && (
                      <div className="mt-1 max-w-[250px]">
                        <LinkPreviewCard content={msg.content} />
                      </div>
                    )}
                  {/* Timestamp + delivery status */}
                  <div className="flex items-center gap-1 mt-0.5 px-1 justify-end">
                    <p className="text-[9px] text-foreground/30">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {msg.senderId === user?.id && !msg.deletedForAll && (
                      <span className="text-[9px]">
                        {msg.readAt ? (
                          <span className="text-primary">✓✓</span>
                        ) : msg.deliveredAt ? (
                          <span className="text-foreground/40">✓✓</span>
                        ) : (
                          <span className="text-foreground/30">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Image lightbox */}
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

        {/* Slash command results */}
        {slashCommand && tagResults.length > 0 && (
          <div className="border-t border-border/50 max-h-40 overflow-y-auto px-3 py-2 space-y-1 bg-card">
            {tagResults.map((tag: PostTag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagSelect(tag)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-left text-sm transition-colors"
              >
                {tag.image && (
                  <img
                    src={tag.image}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <span className="truncate">{tag.title}</span>
                <span className="text-[10px] text-foreground/40 ml-auto">
                  {tag.type}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Slash command hint */}
        {input === '/' && (
          <div className="px-3 py-2 space-y-1 bg-card">
            {SLASH_COMMANDS.map((cmd) => (
              <button
                key={cmd.command}
                type="button"
                onClick={() => {
                  setInput(`${cmd.command} `);
                  setSlashCommand(cmd.command);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-muted/50 text-left text-sm"
              >
                <span className="font-mono text-primary">{cmd.command}</span>
                <span className="text-foreground/50 text-xs">{cmd.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Attached tag preview */}
        {attachedTag && (
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
              <span className="text-foreground/50 text-xs">
                {attachedTag.type}
              </span>
              <span className="truncate max-w-[150px]">
                {attachedTag.title}
              </span>
              <button
                type="button"
                onClick={() => setAttachedTag(null)}
                className="text-foreground/40 hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Attachment preview */}
        {attachment && (
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
              {attachment.type === 'audio' && attachment.duration != null ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const a = new Audio(attachment.url);
                      a.play();
                    }}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <Play className="w-3 h-3 text-primary-foreground" />
                  </button>
                  <span className="text-xs text-foreground/70">
                    {Math.floor(attachment.duration / 60)}:
                    {String(attachment.duration % 60).padStart(2, '0')} voice
                    note
                  </span>
                </>
              ) : attachment.thumbnailUrl ? (
                <>
                  <img
                    src={attachment.thumbnailUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                  <span className="text-xs text-foreground/70">
                    {attachment.type}
                  </span>
                </>
              ) : attachment.filename ? (
                <span className="truncate max-w-[180px] text-xs text-foreground/70">
                  {attachment.filename}
                </span>
              ) : (
                <>
                  <span className="text-foreground/50 text-xs">
                    {attachment.type}
                  </span>
                  <span className="truncate max-w-[150px] text-xs">
                    Attached
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={clearAttachment}
                className="text-foreground/40 hover:text-foreground ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Uploading indicator */}
        {isUploading && (
          <div className="px-3 py-1">
            <span className="text-xs text-foreground/40">Uploading...</span>
          </div>
        )}

        {/* Reply-to indicator */}
        {replyingTo && (
          <div className="px-3 py-1.5 flex items-center gap-2 border-t border-border/50 bg-muted/20">
            <div className="flex-1 border-l-2 border-primary pl-2">
              <p className="text-[10px] text-primary font-bold">
                Replying to{' '}
                {replyingTo.senderId === user?.id
                  ? 'yourself'
                  : activePeer?.peer_name}
              </p>
              <p className="text-[11px] text-foreground/50 truncate">
                {replyingTo.content.slice(0, 80)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-foreground/40 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2 flex items-end gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={handleMediaSelect}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
              className="hidden"
              onChange={handleMediaSelect}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="p-2 rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-muted/50 transition-colors active:scale-90"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-muted/50 transition-colors active:scale-90"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-full transition-colors active:scale-90 ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={dmGif.toggle}
              className={`p-2 rounded-full transition-colors active:scale-90 ${dmGif.open ? 'text-primary bg-primary/10' : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50'}`}
            >
              <span className="text-xs font-bold">GIF</span>
            </button>
          </div>
          <div className="flex-1 flex items-center bg-muted/30 rounded-3xl px-4 h-9">
            {isRecording ? (
              <>
                <span className="text-xs text-red-500 font-mono mr-2">
                  {Math.floor(recordingDuration / 60)}:
                  {String(recordingDuration % 60).padStart(2, '0')}
                </span>
                <Waveform analyser={analyserRef.current} />
              </>
            ) : (
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Message... (try /music)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() && !attachedTag && !attachment}
            className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-30 active:scale-90 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* GIF picker */}
        {dmGif.open && (
          <div className="border-t border-border/50 bg-card">
            <input
              type="text"
              value={dmGif.query}
              onChange={(e) => dmGif.setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full px-4 py-2 bg-transparent text-sm outline-none border-b border-border/30"
            />
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

  // Conversations list
  return (
    <div className="flex flex-col h-full">
      <PageTitle title="Messages" href="/dm" />

      <div className="flex-1 overflow-y-auto">
        {conversations === null ? (
          <div className="space-y-1 p-2">
            {['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((key) => (
              <div
                key={key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
              >
                <div className="w-11 h-11 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground/40">
            <p className="font-headline font-bold">No messages yet</p>
            <p className="text-sm mt-1">Start a conversation with a friend</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.peer_id}
                type="button"
                onClick={() => openChat(conv)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
                  {conv.peer_photo ? (
                    <Image
                      src={conv.peer_photo}
                      alt=""
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                      {conv.peer_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{conv.peer_name}</p>
                  <p className="text-xs text-foreground/50 truncate">
                    {conv.content}
                  </p>
                </div>
                {!conv.read_at && conv.sender_id !== user?.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

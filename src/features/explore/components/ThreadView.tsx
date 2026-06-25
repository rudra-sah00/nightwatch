'use client';

import { Theme } from 'emoji-picker-react';
import { ArrowLeft, MessageCircle, Send, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  createPost,
  type GifResult,
  getPostThread,
  searchGifs,
} from '@/features/explore/api';
import type { ExplorePost } from '@/features/explore/types';
import { useSocket } from '@/providers/socket-provider';
import { useTheme } from '@/providers/theme-provider';
import { ReactionBar } from './ReactionBar';
import { TagChip } from './TagChip';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ThreadViewProps {
  postId: string;
  onBack: () => void;
}

function getTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ReplyItem({
  reply,
  depth,
  onReplyTo,
  children,
}: {
  reply: ExplorePost;
  depth: number;
  onReplyTo: (id: string, name: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-border/40 pl-3' : ''}>
      <div className="py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted border border-border shrink-0">
            {reply.authorPhoto ? (
              <Image
                src={reply.authorPhoto}
                alt=""
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">
                {reply.authorName[0]}
              </div>
            )}
          </div>
          <span className="text-xs font-bold">{reply.authorName}</span>
          {reply.authorId === 'nightwatch-ai' && (
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
          <span className="text-[10px] text-foreground/40">
            · {getTimeAgo(new Date(reply.createdAt))}
          </span>
        </div>
        <p className="text-sm mt-1 ml-8 break-words">{reply.content}</p>
        {reply.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8">
            {reply.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5 ml-8">
          <button
            type="button"
            onClick={() => onReplyTo(reply.id, reply.authorName)}
            className="flex items-center gap-1 text-foreground/40 hover:text-primary text-xs transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Build a tree from flat replies array */
function buildReplyTree(
  replies: ExplorePost[],
  rootId: string,
): Map<string, ExplorePost[]> {
  const childrenMap = new Map<string, ExplorePost[]>();
  const replyIds = new Set(replies.map((r) => r.id));
  for (const reply of replies) {
    // If parent was deleted (not in set and not root), fall back to root
    const parentKey =
      reply.parentId === rootId || replyIds.has(reply.parentId || '')
        ? reply.parentId || rootId
        : rootId;
    const existing = childrenMap.get(parentKey) || [];
    existing.push(reply);
    childrenMap.set(parentKey, existing);
  }
  return childrenMap;
}

function NestedReplies({
  parentId,
  childrenMap,
  depth,
  onReplyTo,
}: {
  parentId: string;
  childrenMap: Map<string, ExplorePost[]>;
  depth: number;
  onReplyTo: (id: string, name: string) => void;
}) {
  const children = childrenMap.get(parentId);
  if (!children?.length) return null;
  return (
    <>
      {children.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          depth={depth}
          onReplyTo={onReplyTo}
        >
          {depth < 4 && (
            <NestedReplies
              parentId={reply.id}
              childrenMap={childrenMap}
              depth={depth + 1}
              onReplyTo={onReplyTo}
            />
          )}
        </ReplyItem>
      ))}
    </>
  );
}

export function ThreadView({ postId, onBack }: ThreadViewProps) {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [isSending, setIsSending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const { theme: appTheme } = useTheme();
  const isDark =
    appTheme === 'dark' ||
    (appTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    let cancelled = false;
    setIsLoading(true);
    getPostThread(postId)
      .then((thread) => {
        if (!cancelled) {
          setPosts(thread);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // Subscribe to real-time replies via Socket.IO
  useEffect(() => {
    if (!socket) return;
    socket.emit('explore:subscribe-post', postId);
    const handleReply = (data: {
      postId: string;
      replyId: string;
      fromUser: string;
      content: string;
    }) => {
      if (data.postId !== postId) return;
      // Refetch thread to get the new reply with full data
      getPostThread(postId)
        .then(setPosts)
        .catch(() => {});
    };
    socket.on('explore:post-reply', handleReply);
    return () => {
      socket.emit('explore:unsubscribe-post', postId);
      socket.off('explore:post-reply', handleReply);
    };
  }, [socket, postId]);

  const handleBack = () => {
    setVisible(false);
    setTimeout(onBack, 250);
  };

  // GIF search debounce
  useEffect(() => {
    if (!gifOpen) return;
    const timer = setTimeout(() => {
      searchGifs(gifQuery || undefined)
        .then(setGifResults)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [gifQuery, gifOpen]);

  const handleReplyTo = useCallback((id: string, name: string) => {
    setReplyTo({ id, name });
  }, []);

  const handleSend = async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      const parentId = replyTo?.id || postId;
      const post = await createPost({
        content: replyText.trim(),
        type: 'text',
        tags: [],
        parentId,
      });
      setPosts((prev) => {
        const updated = [...prev, post];
        if (updated[0]) {
          updated[0] = {
            ...updated[0],
            stats: {
              ...updated[0].stats,
              replies: updated[0].stats.replies + 1,
            },
          };
        }
        return updated;
      });
      setReplyText('');
      setReplyTo(null);
    } finally {
      setIsSending(false);
    }
  };

  const sendGif = async (gif: GifResult) => {
    setGifOpen(false);
    setIsSending(true);
    try {
      const parentId = replyTo?.id || postId;
      const post = await createPost({
        content: gif.url,
        type: 'text',
        tags: [],
        media: { urls: [gif.url], type: 'image' },
        parentId,
      });
      setPosts((prev) => {
        const updated = [...prev, post];
        if (updated[0]) {
          updated[0] = {
            ...updated[0],
            stats: {
              ...updated[0].stats,
              replies: updated[0].stats.replies + 1,
            },
          };
        }
        return updated;
      });
      setReplyTo(null);
    } finally {
      setIsSending(false);
    }
  };

  const root = posts[0];
  const replies = posts.slice(1);

  return (
    <div
      className={`absolute inset-0 z-30 bg-card flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-lg px-4 py-3 flex items-center gap-3 border-b border-border/50">
        <button
          type="button"
          onClick={handleBack}
          className="p-1 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-headline font-bold text-sm">Thread</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
            </div>
            <div className="border-t border-border/50 pt-3 space-y-3">
              {['r0', 'r1', 'r2', 'r3'].map((key) => (
                <div key={key} className="flex gap-2 ml-4">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Root post */}
            {root && (
              <div className="py-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-border">
                    {root.authorPhoto ? (
                      <Image
                        src={root.authorPhoto}
                        alt=""
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                        {root.authorName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm">{root.authorName}</p>
                      {root.authorId === 'nightwatch-ai' && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          AI
                        </span>
                      )}
                    </div>
                    {root.authorUsername && (
                      <p className="text-[10px] text-foreground/50">
                        @{root.authorUsername}
                      </p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-foreground/40">
                    {getTimeAgo(new Date(root.createdAt))}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {root.content}
                </p>
                {root.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {root.tags.map((t) => (
                      <span
                        key={t.id}
                        className="px-2 py-0.5 rounded-md bg-muted/50 border border-border text-xs"
                      >
                        {t.title}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <ReactionBar
                    reactionsMap={root.reactionsMap}
                    totalReactions={root.stats.reactions}
                    onReact={() => {}}
                    onRemove={() => {}}
                  />
                </div>
                <p className="text-xs text-foreground/50 mt-3">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </p>
              </div>
            )}

            {/* Replies - Reddit style nested */}
            <div className="py-2">
              <NestedReplies
                parentId={postId}
                childrenMap={buildReplyTree(replies, postId)}
                depth={0}
                onReplyTo={handleReplyTo}
              />
            </div>
          </>
        )}
      </div>

      {/* Emoji picker */}
      {emojiOpen && (
        <div className="px-3 pb-1 rounded-xl overflow-hidden">
          <EmojiPicker
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(d) => {
              setReplyText((prev) => prev + d.emoji);
              setEmojiOpen(false);
            }}
            lazyLoadEmojis
            height={260}
            width="100%"
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* GIF picker */}
      {gifOpen && (
        <div className="border-t border-border/50 bg-card">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
            <input
              type="text"
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-1 p-2 max-h-48 overflow-y-auto">
            {gifResults.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => sendGif(gif)}
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

      {/* Reply input */}
      <div className="border-t border-border/50 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {replyTo && (
          <div className="flex items-center gap-1 mb-1.5 px-1">
            <span className="text-[10px] text-foreground/50">
              Replying to {replyTo.name}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[10px] text-foreground/40 hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEmojiOpen(!emojiOpen);
              setGifOpen(false);
            }}
            className={`p-2 rounded-full transition-colors ${emojiOpen ? 'text-primary bg-primary/10' : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setGifOpen(!gifOpen);
              setEmojiOpen(false);
            }}
            className={`p-2 rounded-full transition-colors text-xs font-bold ${gifOpen ? 'text-primary bg-primary/10' : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50'}`}
          >
            GIF
          </button>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
            placeholder="Write a reply..."
            maxLength={500}
            className="flex-1 bg-muted/30 rounded-full px-4 py-2 text-sm outline-none focus:bg-muted/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!replyText.trim() || isSending}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-30 active:scale-90 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

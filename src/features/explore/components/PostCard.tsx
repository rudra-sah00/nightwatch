'use client';

import {
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { recordPostView } from '@/features/explore/api';
import type { ExplorePost } from '@/features/explore/types';
import { useAuthStore } from '@/store/use-auth-store';
import { LinkPreviewCard } from './LinkPreviewCard';
import { PollCard } from './PollCard';
import { ReactionBar } from './ReactionBar';
import { TagChip } from './TagChip';
import { WatchPartyCard } from './WatchPartyCard';

interface PostCardProps {
  post: ExplorePost;
  viewCount?: number;
  onReact: (postId: string, emoji: string) => void;
  onRemoveReaction: (postId: string, emoji: string) => void;
  onRepost: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onBlock?: (userId: string) => void;
  onPollVote: (postId: string, optionId: string) => void;
  onOpen?: (postId: string) => void;
}

export const PostCard = memo(function PostCard({
  post,
  viewCount,
  onReact,
  onRemoveReaction,
  onRepost,
  onDelete,
  onEdit,
  onBlock,
  onPollVote,
  onOpen,
}: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwn = user?.id === post.authorId;
  const cardRef = useRef<HTMLElement>(null);
  const viewedRef = useRef(false);

  // Track view when post enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el || viewedRef.current || !user?.id) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          recordPostView(post.id).catch(() => {});
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id, user?.id]);

  const handleEditSave = useCallback(() => {
    if (editContent.trim() && editContent !== post.content) {
      onEdit?.(post.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, post.content, post.id, onEdit]);

  const timeAgo = post.createdAt ? getTimeAgo(new Date(post.createdAt)) : '';

  return (
    <article
      ref={cardRef}
      className="border-b border-border px-4 py-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
    >
      {/* Repost header */}
      {post.repostOf && (
        <div className="flex items-center gap-1.5 mb-2 ml-10 text-xs text-foreground/50">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{post.authorName} reposted</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link
          href={`/user/${post.authorUsername || post.authorId}`}
          className="shrink-0"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-border">
            {post.authorPhoto ? (
              <Image
                src={post.authorPhoto}
                alt={post.authorName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                {post.authorName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <Link
              href={`/user/${post.authorUsername || post.authorId}`}
              className="font-headline font-bold text-sm truncate hover:underline"
            >
              {post.authorName}
            </Link>
            {post.authorUsername && (
              <span className="text-xs text-foreground/50 truncate">
                @{post.authorUsername}
              </span>
            )}
            <span className="text-xs text-foreground/40">·</span>
            <span className="text-xs text-foreground/40 whitespace-nowrap">
              {timeAgo}
            </span>
            <div className="ml-auto relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <MoreHorizontal className="w-4 h-4 text-foreground/40" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-10 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                  {isOwn ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setEditContent(post.content);
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(post.id);
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neo-red hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onBlock?.(post.authorId);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neo-red hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Block @{post.authorUsername || 'user'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Repost content */}
          {post.repostOf && (
            <div className="mt-2 border border-border rounded-xl p-3 bg-muted/30">
              <p className="text-xs font-bold text-foreground/60">
                {post.repostOf.authorName}
              </p>
              <p className="text-sm mt-1">{post.repostOf.content}</p>
            </div>
          )}

          {/* Text content */}
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
                maxLength={500}
                className="w-full text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 resize-none outline-none focus:border-primary"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditSave}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs rounded-lg border border-border"
                >
                  Cancel
                </button>
                <span className="text-[10px] text-foreground/40 ml-auto">
                  {editContent.length}/500
                </span>
              </div>
            </div>
          ) : (
            post.content && (
              <button
                type="button"
                onClick={() => onOpen?.(post.id)}
                className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-left w-full"
              >
                {post.content}
                {post.editHistory?.length ? (
                  <span className="text-[10px] text-foreground/40 ml-1">
                    (edited)
                  </span>
                ) : null}
              </button>
            )
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {post.tags.map((tag) => (
                <TagChip key={`${tag.type}-${tag.id}`} tag={tag} />
              ))}
            </div>
          )}

          {/* Media */}
          {post.media && (
            <div
              className={`mt-3 rounded-xl overflow-hidden border border-border ${
                post.media.urls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'
              }`}
            >
              {post.media.urls.map((url, i) => (
                <Image
                  key={url}
                  src={url}
                  alt={`Post media ${i + 1}`}
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-80"
                />
              ))}
            </div>
          )}

          {/* Poll */}
          {post.poll && (
            <PollCard
              postId={post.id}
              poll={post.poll}
              onVote={onPollVote}
              hasVoted={post.poll.voterIds.includes(user?.id || '')}
            />
          )}

          {/* Watch Party Invite */}
          {post.watchParty && <WatchPartyCard watchParty={post.watchParty} />}

          {/* Link Preview */}
          {post.content && <LinkPreviewCard content={post.content} />}

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-3 -ml-1">
            {/* Reply */}
            <button
              type="button"
              onClick={() => onOpen?.(post.id)}
              className="flex items-center gap-1.5 text-foreground/50 hover:text-primary transition-colors group"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {post.stats.replies > 0 && (
                <span className="text-xs">{post.stats.replies}</span>
              )}
            </button>

            {/* Repost */}
            <button
              type="button"
              onClick={() => onRepost(post.id)}
              className="flex items-center gap-1.5 text-foreground/50 hover:text-green-500 transition-colors group"
            >
              <Repeat2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {post.stats.reposts > 0 && (
                <span className="text-xs">{post.stats.reposts}</span>
              )}
            </button>

            {/* Views */}
            {viewCount !== undefined && viewCount > 0 && (
              <span className="flex items-center gap-1.5 text-foreground/40 text-xs">
                <Eye className="w-3.5 h-3.5" />
                {viewCount}
              </span>
            )}

            {/* Reactions */}
            <ReactionBar
              reactionsMap={post.reactionsMap}
              totalReactions={post.stats.reactions}
              onReact={(emoji) => onReact(post.id, emoji)}
              onRemove={(emoji) => onRemoveReaction(post.id, emoji)}
            />
          </div>
        </div>
      </div>
    </article>
  );
});

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

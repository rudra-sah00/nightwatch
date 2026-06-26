import { MessageCircle, Repeat2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ExplorePost } from '@/features/explore/types';

interface PublicPostCardProps {
  post: ExplorePost;
}

export function PublicPostCard({ post }: PublicPostCardProps) {
  const timeAgo = getTimeAgo(new Date(post.createdAt));

  return (
    <Link
      href={`/feed/post/${post.id}`}
      className="block bg-card border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors"
    >
      {/* Author */}
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={post.authorPhoto || '/default-avatar.png'}
          alt=""
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
        <div>
          <p className="font-headline font-bold text-sm text-foreground">
            {post.authorName}
          </p>
          <p className="text-xs text-foreground/40">
            @{post.authorUsername} · {timeAgo}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground/80 text-sm whitespace-pre-wrap break-words mb-3">
        {post.content}
      </p>

      {/* Media */}
      {post.media && post.media.urls.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-3 border border-border">
          <Image
            src={post.media.urls[0]}
            alt="Post media"
            width={600}
            height={400}
            className="w-full h-auto object-cover max-h-80"
          />
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <div className="space-y-2 mb-3">
          {post.poll.options.map((option) => (
            <div
              key={option.id}
              className="bg-muted/50 rounded-md px-3 py-2 text-sm text-foreground/70"
            >
              {option.text} · {option.votes} votes
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 bg-muted text-foreground/60 text-xs rounded-full font-medium"
            >
              {tag.title}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-foreground/40 text-xs">
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {post.stats.replies}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="w-3.5 h-3.5" />
          {post.stats.reposts}
        </span>
        {post.stats.reactions > 0 && (
          <span>{post.stats.reactions} reactions</span>
        )}
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

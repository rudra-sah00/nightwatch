'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { getPostReplies } from '@/features/explore/api';
import type { ExplorePost } from '@/features/explore/types';

interface InlineRepliesProps {
  postId: string;
  replyCount: number;
}

/** Expandable inline replies — click to load first 3 replies without navigating */
export function InlineReplies({ postId, replyCount }: InlineRepliesProps) {
  const [replies, setReplies] = useState<ExplorePost[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReplies = useCallback(async () => {
    if (replies) {
      setReplies(null);
      return;
    } // Toggle collapse
    setLoading(true);
    try {
      const data = await getPostReplies(postId);
      setReplies(data);
    } catch {
      // Non-fatal - just collapse loading
    } finally {
      setLoading(false);
    }
  }, [postId, replies]);

  if (replyCount === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={loadReplies}
        className="text-xs text-primary hover:underline font-medium"
      >
        {loading
          ? 'Loading...'
          : replies
            ? 'Hide replies'
            : `Show ${replyCount > 3 ? '3 of ' : ''}${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
      </button>

      {replies && (
        <div className="mt-2 ml-4 border-l-2 border-border/50 pl-3 space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                {reply.authorPhoto ? (
                  <Image
                    src={reply.authorPhoto}
                    alt={reply.authorName}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">
                    {reply.authorName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold">{reply.authorName}</span>
                {reply.authorId === 'nightwatch-ai' && (
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">
                    AI
                  </span>
                )}
                <p className="text-xs text-foreground/80 break-words">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
          {replyCount > 3 && (
            <p className="text-[10px] text-foreground/40">
              +{replyCount - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

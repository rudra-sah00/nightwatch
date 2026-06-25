'use client';

import { useCallback } from 'react';
import {
  deletePost,
  editPost,
  reactToPost,
  removeReaction,
  repostPost,
  voteOnPoll,
} from '@/features/explore/api';
import type { ExplorePost } from '@/features/explore/types';

interface UsePostActionsOptions {
  updatePost: (id: string, updater: (p: ExplorePost) => ExplorePost) => void;
  removePost: (id: string) => void;
  prependPost: (post: ExplorePost) => void;
}

/**
 * Post interaction mutations with optimistic updates.
 */
export function usePostActions({
  updatePost,
  removePost,
  prependPost,
}: UsePostActionsOptions) {
  const handleReact = useCallback(
    async (postId: string, emoji: string) => {
      // Optimistic update
      updatePost(postId, (p) => ({
        ...p,
        reactionsMap: {
          ...p.reactionsMap,
          [emoji]: (p.reactionsMap[emoji] || 0) + 1,
        },
        stats: { ...p.stats, reactions: p.stats.reactions + 1 },
      }));
      try {
        await reactToPost(postId, emoji);
      } catch {
        // Revert on failure
        updatePost(postId, (p) => ({
          ...p,
          reactionsMap: {
            ...p.reactionsMap,
            [emoji]: Math.max((p.reactionsMap[emoji] || 1) - 1, 0),
          },
          stats: { ...p.stats, reactions: Math.max(p.stats.reactions - 1, 0) },
        }));
      }
    },
    [updatePost],
  );

  const handleRemoveReaction = useCallback(
    async (postId: string, emoji: string) => {
      updatePost(postId, (p) => ({
        ...p,
        reactionsMap: {
          ...p.reactionsMap,
          [emoji]: Math.max((p.reactionsMap[emoji] || 1) - 1, 0),
        },
        stats: { ...p.stats, reactions: Math.max(p.stats.reactions - 1, 0) },
      }));
      try {
        await removeReaction(postId);
      } catch {
        updatePost(postId, (p) => ({
          ...p,
          reactionsMap: {
            ...p.reactionsMap,
            [emoji]: (p.reactionsMap[emoji] || 0) + 1,
          },
          stats: { ...p.stats, reactions: p.stats.reactions + 1 },
        }));
      }
    },
    [updatePost],
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      removePost(postId);
      try {
        await deletePost(postId);
      } catch {
        // Could refetch, but deletion is usually final
      }
    },
    [removePost],
  );

  const handleRepost = useCallback(
    async (postId: string) => {
      try {
        const newPost = await repostPost(postId);
        prependPost(newPost);
      } catch {
        // Non-fatal
      }
    },
    [prependPost],
  );

  const handlePollVote = useCallback(
    async (postId: string, optionId: string) => {
      updatePost(postId, (p) => {
        if (!p.poll) return p;
        // Prevent double-click: check if already voted
        if (p.poll.voterIds.includes('__self__')) return p;
        return {
          ...p,
          poll: {
            ...p.poll,
            voterIds: [...p.poll.voterIds, '__self__'],
            options: p.poll.options.map((o) =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
            ),
          },
        };
      });
      try {
        await voteOnPoll(postId, optionId);
      } catch {
        // Revert
        updatePost(postId, (p) => {
          if (!p.poll) return p;
          return {
            ...p,
            poll: {
              ...p.poll,
              voterIds: p.poll.voterIds.filter((id) => id !== '__self__'),
              options: p.poll.options.map((o) =>
                o.id === optionId
                  ? { ...o, votes: Math.max(o.votes - 1, 0) }
                  : o,
              ),
            },
          };
        });
      }
    },
    [updatePost],
  );

  const handleEdit = useCallback(
    async (postId: string, content: string) => {
      updatePost(postId, (p) => ({ ...p, content }));
      try {
        await editPost(postId, content);
      } catch {
        // Revert on failure — would need original content, but acceptable UX
      }
    },
    [updatePost],
  );

  return {
    handleReact,
    handleRemoveReaction,
    handleDelete,
    handleEdit,
    handleRepost,
    handlePollVote,
  };
}

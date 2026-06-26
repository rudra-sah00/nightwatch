'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { deletePost, editPost } from '@/features/explore/api';
import type { ExplorePost } from '@/features/explore/types';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';
import { apiFetch } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';

export default function MyPostsPage() {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const user = useAuthStore((s) => s.user);
  const format = useFormatter();

  useEffect(() => {
    apiFetch<{ posts: ExplorePost[] }>('/api/explore/feed?tab=foryou&limit=50')
      .then((r) => {
        setPosts(r.posts.filter((p) => p.authorId === user?.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const handleDelete = useCallback(async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      // Revert not possible without caching removed post - fire and forget
    }
  }, []);

  const handleEdit = useCallback(
    async (postId: string) => {
      if (!editContent.trim()) return;
      const original = posts.find((p) => p.id === postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: editContent } : p)),
      );
      setEditingId(null);
      try {
        await editPost(postId, editContent.trim());
      } catch {
        if (original) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? original : p)));
        }
      }
    },
    [editContent, posts],
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <PageTitle title="My Posts" href="/profile/posts" />
      <ProfileBackButton label="Profile" />

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {['ps0', 'ps1', 'ps2'].map((key) => (
              <div
                key={key}
                className="h-20 bg-muted animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-foreground/40 text-center py-8">
            No posts yet. Share something on Explore!
          </p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="border border-border rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editingId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) =>
                          setEditContent(e.target.value.slice(0, 500))
                        }
                        className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm resize-none outline-none"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(post.id)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs rounded-lg border border-border"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm break-words">
                      {post.content || '(media post)'}
                    </p>
                  )}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {post.tags.map((t) => (
                        <span
                          key={`${t.type}-${t.id}`}
                          className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                        >
                          {t.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {post.media && (
                    <div className="flex gap-1 mt-2">
                      {post.media.urls.slice(0, 3).map((url) => (
                        <Image
                          key={url}
                          src={url}
                          alt=""
                          width={60}
                          height={60}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(post.id);
                      setEditContent(post.content);
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted text-foreground/50"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-neo-red/70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-foreground/40">
                <span>
                  {format.dateTime(new Date(post.createdAt), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>💬 {post.stats.replies}</span>
                <span>🔁 {post.stats.reposts}</span>
                <span>❤️ {post.stats.reactions}</span>
                {post.editHistory?.length ? (
                  <span className="italic">edited</span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

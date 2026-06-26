import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getPublicPost, getPublicThread } from '../../api';
import { PublicPostCard } from '../../components/PublicPostCard';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { post } = await getPublicPost(id);
  if (!post) return { title: 'Post Not Found' };
  const description = post.content.slice(0, 160);
  return {
    title: `${post.authorName} on Nightwatch`,
    description,
    openGraph: {
      title: `${post.authorName} on Nightwatch`,
      description,
      type: 'article',
      images: post.media?.urls[0] ? [post.media.urls[0]] : undefined,
    },
    twitter: {
      card: post.media ? 'summary_large_image' : 'summary',
      title: `${post.authorName} on Nightwatch`,
      description,
    },
  };
}

export default function PostPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/feed"
            className="font-headline font-black text-xl uppercase tracking-tighter"
          >
            Nightwatch
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-foreground text-background font-headline font-bold text-sm uppercase tracking-wider rounded-md hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Suspense fallback={<PostSkeleton />}>
          <PostLoader params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function PostLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { post } = await getPublicPost(id);
  if (!post) notFound();

  const { posts: thread } = await getPublicThread(id);

  return (
    <div className="space-y-4">
      <PublicPostCard post={post} />

      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <p className="text-foreground/60 text-sm mb-3">
          Sign in to reply, react, and join the conversation.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-foreground text-background font-headline font-bold text-sm uppercase tracking-wider rounded-md hover:opacity-90 transition-opacity"
        >
          Sign In to Reply
        </Link>
      </div>

      {thread.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-foreground/50">
            Replies
          </h2>
          {thread.map((reply) => (
            <PublicPostCard key={reply.id} post={reply} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );
}

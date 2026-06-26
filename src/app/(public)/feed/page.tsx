import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getPublicFeed } from './api';
import { PublicExploreClient } from './components/PublicExploreClient';
import { PublicPostCard } from './components/PublicPostCard';

export const metadata: Metadata = {
  title: 'Explore | Nightwatch',
  description:
    'Discover what people are watching, listening to, and talking about on Nightwatch.',
  openGraph: {
    title: 'Explore | Nightwatch',
    description:
      'Discover what people are watching, listening to, and talking about on Nightwatch.',
    type: 'website',
  },
};

export default function PublicExplorePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
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
        <Suspense fallback={<FeedSkeleton />}>
          <FeedLoader />
        </Suspense>
      </div>
    </main>
  );
}

async function FeedLoader() {
  const { posts } = await getPublicFeed('trending');
  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <PublicPostCard key={post.id} post={post} />
        ))}
      </div>
      {posts.length > 0 && <PublicExploreClient initialPosts={posts} />}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {['s1', 's2', 's3', 's4', 's5'].map((id) => (
        <div
          key={id}
          className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

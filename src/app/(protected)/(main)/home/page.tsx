import type { Metadata } from 'next';
import { Suspense } from 'react';
import { searchContent } from '@/features/search/api';
import { HomeClient } from '@/features/search/components/HomeClient';
import {
  SearchSkeleton,
  WatchProgressSkeleton,
} from '@/features/search/components/SearchSkeletons';
import type { SearchResult } from '@/features/search/types';

export const metadata: Metadata = {
  title: 'Home | Watch Rudra',
  description: 'Search for movies and TV shows to start watching together.',
};

const LoadingFallback = () => (
  <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted/60 rounded animate-pulse" />
      <div className="space-y-2">
        <WatchProgressSkeleton />
        <WatchProgressSkeleton />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted/60 rounded animate-pulse" />
      <div className="space-y-2">
        {['sk-1', 'sk-2', 'sk-3'].map((id) => (
          <SearchSkeleton key={id} />
        ))}
      </div>
    </div>
  </div>
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeLoader query={query} />
    </Suspense>
  );
}

async function HomeLoader({ query }: { query: string }) {
  // Pre-fetch search results on the server if query exists
  let initialResults: SearchResult[] = [];
  if (query.trim()) {
    try {
      initialResults = await searchContent(query);
    } catch (_e) {
      // Gracefully handle server-side fetch errors
    }
  }

  return <HomeClient initialResults={initialResults} initialQuery={query} />;
}

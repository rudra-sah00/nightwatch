import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  SearchSkeleton,
  WatchProgressSkeleton,
} from '@/components/ui/skeletons';
import { searchContent } from '@/features/search/api';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

export const metadata: Metadata = {
  title: 'Search | Watch Rudra',
  description: 'Search for movies, TV shows, and anime.',
};

const LoadingFallback = () => (
  <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
    <div className="space-y-4">
      <div className="h-8 w-48 bg-[#f2ede5] border-4 border-[#1a1a1a] neo-shadow-sm rounded-none animate-pulse" />
      <div className="space-y-2">
        <WatchProgressSkeleton />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-8 w-32 bg-[#f2ede5] border-4 border-[#1a1a1a] neo-shadow-sm rounded-none animate-pulse" />
      <div className="space-y-2">
        {['sk-1', 'sk-2', 'sk-3'].map((id) => (
          <SearchSkeleton key={id} />
        ))}
      </div>
    </div>
  </div>
);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchLoader query={query} />
    </Suspense>
  );
}

async function SearchLoader({ query }: { query: string }) {
  let initialResults: SearchResult[] = [];
  if (query.trim()) {
    try {
      initialResults = await searchContent(query);
    } catch (_e) {
      // Gracefully handle server-side fetch errors
    }
  }

  return <SearchClient initialResults={initialResults} initialQuery={query} />;
}

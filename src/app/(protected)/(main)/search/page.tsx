import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchSkeleton } from '@/components/ui/skeletons';
import { searchContent } from '@/features/search/api';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

export const metadata: Metadata = {
  title: 'Search | Watch Rudra',
  description: 'Search for movies, TV shows, and anime.',
};

function SearchFallback() {
  return (
    <div className="container mx-auto px-6 py-12 md:px-10 min-h-[calc(100vh-80px)]">
      <div className="mb-12">
        <div className="h-16 w-64 bg-muted animate-pulse mb-4" />
        <div className="h-6 w-48 bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          /* biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array */
          <SearchSkeleton key={`search-sk-${i}`} />
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchLoader query={query} />
    </Suspense>
  );
}

async function SearchLoader({ query }: { query: string }) {
  let initialResults: SearchResult[] = [];
  let error = false;
  if (query.trim()) {
    try {
      initialResults = await searchContent(query);
    } catch (_e) {
      error = true;
    }
  }

  return (
    <SearchClient
      initialResults={initialResults}
      initialQuery={query}
      serverError={error}
    />
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { searchContent } from '@/features/search/api';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

export const metadata: Metadata = {
  title: 'Search | Watch Rudra',
  description: 'Search for movies, TV shows, and anime.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

  return (
    <Suspense fallback={null}>
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

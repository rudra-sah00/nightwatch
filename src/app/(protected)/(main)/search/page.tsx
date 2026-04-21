import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { searchContent } from '@/features/search/api';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return { title: t('searchTitle'), description: t('searchDescription') };
}

function SearchFallback() {
  return (
    <div className="w-full">
      <main className="container mx-auto px-6 py-12 md:px-10 min-h-[calc(100vh-80px)]">
        <div className="w-full">
          <div className="mb-12">
            <div className="h-14 sm:h-16 md:h-24 w-80 bg-muted animate-pulse rounded mb-4" />
            <div className="h-6 w-56 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`search-sk-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                  i
                }`}
              >
                <div className="aspect-[2/3] bg-muted animate-pulse rounded mb-4" />
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
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

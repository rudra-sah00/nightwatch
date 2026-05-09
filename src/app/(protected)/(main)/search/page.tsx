import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { searchContent } from '@/features/search/api';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('searchTitle'),
    description: t('searchDescription'),
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

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

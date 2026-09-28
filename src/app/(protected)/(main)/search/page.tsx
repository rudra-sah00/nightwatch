import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { SearchClient } from '@/features/search/components/SearchClient';
import { SearchTvGate } from './SearchTvGate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('searchTitle'),
    description: t('searchDescription'),
  };
}

/**
 * Search route.
 *
 * Deliberately does no searching itself. It used to `await searchContent(query)`, which held
 * the whole RSC payload behind a three-way upstream fan-out — the user got a full-page
 * skeleton and then every result at once, however slow the worst catalogue was. The client
 * now fetches one catalogue per request so each section of the grid paints as it lands, which
 * is only possible if the route ships its shell immediately.
 *
 * The query lives in the URL, so `SearchClient` reads it from `useSearchParams` and needs
 * nothing passed down.
 */
export default function SearchPage() {
  return (
    <FeatureErrorBoundary feature="Search">
      <SearchTvGate>
        <SearchClient />
      </SearchTvGate>
    </FeatureErrorBoundary>
  );
}

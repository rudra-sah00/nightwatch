'use client';

import { Film, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { SearchSkeleton } from '@/components/ui/skeletons';
import type { CatalogSection } from '../hooks/use-catalog-search';
import { catalogBadgeClass } from '../lib/catalog-badge';
import type { SearchResult } from '../types';
import { SearchResultItem } from './search-result-item';

/** Skeleton tile count for a section still in flight. One row on most breakpoints. */
const PENDING_TILES = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'];

const GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

/** Props for {@link SearchResultsByCatalog}. */
interface SearchResultsByCatalogProps {
  sections: CatalogSection[];
  onSelect: (result: SearchResult) => void;
}

/**
 * Renders one section per catalogue, each filling in as its own request lands.
 *
 * A catalogue that is still in flight shows skeleton tiles under its heading, so the page
 * communicates "more is coming" rather than looking finished. A catalogue that failed shows
 * a retry affordance for itself alone — the others keep their results. A catalogue that
 * answered with nothing is dropped entirely rather than left as an empty heading, since a
 * title being absent from one service is not information the user asked for.
 */
export const SearchResultsByCatalog = React.memo(
  function SearchResultsByCatalog({
    sections,
    onSelect,
  }: SearchResultsByCatalogProps) {
    return (
      <div className="space-y-8 md:space-y-10">
        {sections.map((section) => (
          <CatalogSectionBlock
            key={section.id}
            section={section}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  },
);

/**
 * One catalogue's heading plus its grid, skeletons, or failure state.
 *
 * Memoized per section so a slow catalogue arriving does not re-render the ones already
 * painted — the whole point of fetching them separately.
 */
const CatalogSectionBlock = React.memo(function CatalogSectionBlock({
  section,
  onSelect,
}: {
  section: CatalogSection;
  onSelect: (result: SearchResult) => void;
}) {
  const t = useTranslations('search');

  // Nothing to say about a catalogue that answered with no matches.
  if (!(section.isPending || section.isError) && section.results.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`catalog-${section.id}`}>
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <h2
          id={`catalog-${section.id}`}
          className={`font-headline font-black uppercase tracking-widest text-[11px] sm:text-xs px-2 py-1 border-[2px] border-border text-foreground ${catalogBadgeClass(section.id)}`}
        >
          {section.label}
        </h2>
        {section.isPending ? (
          <span className="font-headline font-bold uppercase tracking-widest text-[10px] text-foreground/40">
            {t('results.searching')}
          </span>
        ) : null}
        {!section.isPending && section.results.length > 0 ? (
          <span className="font-headline font-bold uppercase tracking-widest text-[10px] text-foreground/40">
            {t('results.catalogCount', { count: section.results.length })}
          </span>
        ) : null}
      </div>

      {section.isError ? (
        <CatalogSectionError label={section.label} onRetry={section.retry} />
      ) : (
        <div className={GRID_CLASS} style={{ contentVisibility: 'auto' }}>
          {section.results.map((result, index) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onSelect={onSelect}
              index={index}
            />
          ))}
          {section.isPending
            ? PENDING_TILES.map((id) => <SearchSkeleton key={id} />)
            : null}
        </div>
      )}
    </section>
  );
});

/**
 * Failure state for a single catalogue.
 *
 * Deliberately small and inline: one dead upstream is a partial degradation, and blowing it
 * up into a full-width error panel would imply the whole search failed.
 */
function CatalogSectionError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  const t = useTranslations('search');

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 bg-neo-surface border-[3px] border-border">
      <Film className="w-5 h-5 text-foreground/30 stroke-[3px] shrink-0" />
      <p className="font-headline font-bold uppercase tracking-widest text-[11px] text-foreground/60 flex-1 min-w-[12ch]">
        {t('results.catalogFailed', { catalog: label })}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-card border-[2px] border-border font-headline font-black uppercase tracking-widest text-[10px] hover:bg-neo-yellow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue"
      >
        <RotateCw className="w-3 h-3 stroke-[3px]" />
        {t('results.retry')}
      </button>
    </div>
  );
}

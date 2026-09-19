import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchResults } from '@/features/search/components/search-results';
import { catalogBadgeClass } from '@/features/search/lib/catalog-badge';
import { ContentType, type SearchResult } from '@/types/content';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/components/ui/skeletons', () => ({
  SearchSkeleton: () => <div data-testid="skeleton" />,
}));

const result = (over: Partial<SearchResult> = {}): SearchResult => ({
  id: 'nm:70143836',
  title: 'Breaking Bad',
  contentType: ContentType.Series,
  poster: 'https://img/poster.jpg',
  ...over,
});

const renderResults = (results: SearchResult[]) =>
  render(
    <SearchResults results={results} isLoading={false} onSelect={vi.fn()} />,
  );

describe('search result catalogue badge', () => {
  /**
   * One search merges every NetMirror catalogue, so without this a user cannot tell a
   * Netflix hit from a Prime Video one — the posters look identical.
   */
  it('badges each poster with the catalogue it came from', () => {
    renderResults([
      result({ id: 'nm:1', source: 'nf', sourceLabel: 'Netflix' }),
      result({ id: 'nm:pv:2', source: 'pv', sourceLabel: 'Prime Video' }),
      result({ id: 'nm:hs:3', source: 'hs', sourceLabel: 'JioHotstar' }),
    ]);

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
    expect(screen.getByText('JioHotstar')).toBeInTheDocument();
  });

  it('colour-codes the badge per catalogue so origin reads at a glance', () => {
    renderResults([
      result({ id: 'nm:1', source: 'nf', sourceLabel: 'Netflix' }),
      result({ id: 'nm:pv:2', source: 'pv', sourceLabel: 'Prime Video' }),
    ]);

    expect(screen.getByText('Netflix').className).toContain(
      catalogBadgeClass('nf'),
    );
    expect(screen.getByText('Prime Video').className).toContain(
      catalogBadgeClass('pv'),
    );
    expect(catalogBadgeClass('nf')).not.toBe(catalogBadgeClass('pv'));
  });

  /** Older cached search responses predate the field; a result must still render. */
  it('omits the badge when the result carries no label', () => {
    renderResults([result({ sourceLabel: undefined, source: undefined })]);

    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  /** A catalogue added backend-side must still render, just without a bespoke colour. */
  it('falls back to a neutral colour for an unknown catalogue', () => {
    renderResults([result({ source: 'zz', sourceLabel: 'Some New Service' })]);

    const badge = screen.getByText('Some New Service');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain(catalogBadgeClass(undefined));
  });

  /** The year badge already occupies the top-right, so the two must not overlap. */
  it('keeps the catalogue and year badges on opposite corners', () => {
    renderResults([
      result({ year: 2008, source: 'nf', sourceLabel: 'Netflix' }),
    ]);

    expect(screen.getByText('Netflix').className).toContain('bottom-2');
    expect(screen.getByText('2008').className).toContain('top-2');
  });
});

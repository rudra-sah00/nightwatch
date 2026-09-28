import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchResultsByCatalog } from '@/features/search/components/search-results-by-catalog';
import type { CatalogSection } from '@/features/search/hooks/use-catalog-search';
import type { SearchResult } from '@/features/search/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
}));

vi.mock('@/components/ui/skeletons', () => ({
  SearchSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/features/search/components/search-result-item', () => ({
  SearchResultItem: ({ result }: { result: SearchResult }) => (
    <div data-testid="result">{result.title}</div>
  ),
}));

const result = (id: string, title: string) =>
  ({ id, title }) as unknown as SearchResult;

const section = (over: Partial<CatalogSection> = {}): CatalogSection => ({
  id: 'nf',
  label: 'Netflix',
  results: [],
  isPending: false,
  isError: false,
  retry: vi.fn(),
  ...over,
});

/**
 * The whole point of fetching catalogues separately is that the grid fills in as each one
 * answers. These assertions pin the states that make that legible: what landed is shown,
 * what is still coming shows skeletons, and neither one hides the other.
 */
describe('SearchResultsByCatalog', () => {
  it('renders a landed catalogue and a pending one side by side', () => {
    render(
      <SearchResultsByCatalog
        sections={[
          section({ id: 'nf', results: [result('nm:1', 'Breaking Bad')] }),
          section({ id: 'pv', label: 'Prime Video', isPending: true }),
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  /** Skeletons under the heading are what tell the user more is still coming. */
  it('shows skeletons only for the catalogues still in flight', () => {
    render(
      <SearchResultsByCatalog
        sections={[
          section({ id: 'nf', results: [result('nm:1', 'A')] }),
          section({ id: 'pv', label: 'Prime Video', isPending: true }),
        ]}
        onSelect={vi.fn()}
      />,
    );

    const netflix = screen.getByText('Netflix').closest('section');
    const prime = screen.getByText('Prime Video').closest('section');

    expect(netflix?.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(
      0,
    );
    expect(
      (prime?.querySelectorAll('[data-testid="skeleton"]')?.length ?? 0) > 0,
    ).toBe(true);
  });

  /** A title missing from one service is not information the user asked for. */
  it('drops a settled catalogue that found nothing', () => {
    render(
      <SearchResultsByCatalog
        sections={[
          section({ id: 'nf', results: [result('nm:1', 'A')] }),
          section({ id: 'hs', label: 'JioHotstar', results: [] }),
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByText('JioHotstar')).not.toBeInTheDocument();
  });

  /** One dead upstream is a partial degradation; the rest of the grid must survive it. */
  describe('when one catalogue fails', () => {
    it('keeps the other catalogues results on screen', () => {
      render(
        <SearchResultsByCatalog
          sections={[
            section({ id: 'nf', results: [result('nm:1', 'Breaking Bad')] }),
            section({ id: 'pv', label: 'Prime Video', isError: true }),
          ]}
          onSelect={vi.fn()}
        />,
      );

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(
        screen.getByText('results.catalogFailed:Prime Video'),
      ).toBeInTheDocument();
    });

    it('offers a retry for that catalogue alone', async () => {
      const retry = vi.fn();
      render(
        <SearchResultsByCatalog
          sections={[
            section({ id: 'pv', label: 'Prime Video', isError: true, retry }),
          ]}
          onSelect={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByRole('button'));

      expect(retry).toHaveBeenCalledTimes(1);
    });
  });

  it('labels each section for assistive technology', () => {
    render(
      <SearchResultsByCatalog
        sections={[section({ id: 'nf', results: [result('nm:1', 'A')] })]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Netflix' })).toBeInTheDocument();
  });
});

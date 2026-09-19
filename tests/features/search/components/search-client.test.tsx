import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { SearchResult } from '@/features/search/types';

const { homeClientState } = vi.hoisted(() => ({
  homeClientState: {
    results: [] as SearchResult[],
    isTransitioning: false,
    hasSearched: false,
    selectedContent: null,
    selectedContentId: null,
    fromContinueWatching: false,
    handleSelectContent: vi.fn(),
    handleCloseModal: vi.fn(),
  },
}));

const { searchInputState } = vi.hoisted(() => ({
  searchInputState: {
    query: '',
    setQuery: vi.fn(),
    suggestion: '',
    handleSearch: vi.fn(),
    handleManualSearch: vi.fn(),
    handleFocus: vi.fn(),
    handleBlur: vi.fn(),
    isPending: false,
    containerRef: { current: null },
  },
}));

vi.mock('@/features/search/hooks/use-home-client', () => ({
  useHomeClient: () => homeClientState,
}));

vi.mock('@/features/search/hooks/use-search-input', () => ({
  useSearchInput: () => searchInputState,
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ isLoading: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/search/components/search-results', () => ({
  SearchResults: () => <div data-testid="search-results" />,
}));

vi.mock('@/components/ui/global-loading', () => ({
  GlobalLoading: () => <div data-testid="global-loading" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  homeClientState.results = [];
  homeClientState.isTransitioning = false;
  homeClientState.hasSearched = false;
  searchInputState.query = '';
  searchInputState.isPending = false;
});

const render_ = (query = '') =>
  render(<SearchClient initialResults={[]} initialQuery={query} />);

describe('SearchClient', () => {
  /**
   * The hub's "Movies & Web Series" tile lands on /search with no query. The results
   * layout has nothing to report in that state — it rendered a "Results:" label over an
   * empty input, "0 Films Found in the Archives", and then dead space.
   */
  describe('with no query', () => {
    it('shows the search landing, not an empty results report', () => {
      render_();

      expect(screen.getByText('idle.headline1')).toBeInTheDocument();
      expect(
        screen.queryByText('results.resultsLabel'),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
    });

    it('reports no film count', () => {
      render_();

      expect(screen.queryByText('results.filmsFound')).not.toBeInTheDocument();
    });
  });

  describe('with a query', () => {
    it('shows the results layout', () => {
      homeClientState.hasSearched = true;
      homeClientState.results = [
        { id: 'nm:70143836', title: 'Breaking Bad' } as SearchResult,
      ];

      render_('breaking bad');

      expect(screen.getByText('results.resultsLabel')).toBeInTheDocument();
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
    });

    it('reports no results when the query found nothing', () => {
      homeClientState.hasSearched = true;
      homeClientState.results = [];

      render_('zzzzz');

      expect(screen.getByText('results.noResults')).toBeInTheDocument();
      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
    });

    it('reports a failed search', () => {
      homeClientState.hasSearched = true;

      render(
        <SearchClient
          initialResults={[]}
          initialQuery="breaking"
          serverError
        />,
      );

      expect(screen.getByText('results.searchFailed')).toBeInTheDocument();
    });
  });

  /**
   * A transition is underway, so the query is about to exist — falling back to the
   * landing here would flash the hero between submit and results.
   */
  describe('while a search is in flight', () => {
    it('leaves the landing once a transition starts', () => {
      homeClientState.isTransitioning = true;

      render_();

      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
      expect(screen.getByText('results.searching')).toBeInTheDocument();
    });

    it('leaves the landing once the router transition is pending', () => {
      searchInputState.isPending = true;

      render_();

      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
    });
  });

  it('defers to the auth loading state', () => {
    render_();

    expect(screen.queryByTestId('global-loading')).not.toBeInTheDocument();
  });
});

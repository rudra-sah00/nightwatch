import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchClient } from '@/features/search/components/SearchClient';
import type { CatalogSection } from '@/features/search/hooks/use-catalog-search';

const section = (over: Partial<CatalogSection> = {}): CatalogSection => ({
  id: 'nf',
  label: 'Netflix',
  results: [],
  isPending: false,
  isError: false,
  retry: vi.fn(),
  ...over,
});

const { homeClientState } = vi.hoisted(() => ({
  homeClientState: {
    sections: [] as unknown[],
    totalCount: 0,
    isAnyPending: false,
    isSettled: false,
    isAllFailed: false,
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

vi.mock('@/features/search/components/search-results-by-catalog', () => ({
  SearchResultsByCatalog: () => <div data-testid="search-results" />,
}));

vi.mock('@/components/ui/global-loading', () => ({
  GlobalLoading: () => <div data-testid="global-loading" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  homeClientState.sections = [];
  homeClientState.totalCount = 0;
  homeClientState.isAnyPending = false;
  homeClientState.isSettled = false;
  homeClientState.isAllFailed = false;
  homeClientState.hasSearched = false;
  searchInputState.query = '';
  searchInputState.isPending = false;
});

describe('SearchClient', () => {
  /**
   * The hub's "Movies & Web Series" tile lands on /search with no query. The results
   * layout has nothing to report in that state — it rendered a "Results:" label over an
   * empty input, "0 Films Found in the Archives", and then dead space.
   */
  describe('with no query', () => {
    it('shows the search landing, not an empty results report', () => {
      render(<SearchClient />);

      expect(screen.getByText('idle.headline1')).toBeInTheDocument();
      expect(
        screen.queryByText('results.resultsLabel'),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
    });

    it('reports no film count', () => {
      render(<SearchClient />);

      expect(screen.queryByText('results.filmsFound')).not.toBeInTheDocument();
    });
  });

  describe('with a query', () => {
    it('shows the results layout', () => {
      homeClientState.hasSearched = true;
      homeClientState.isSettled = true;
      homeClientState.totalCount = 1;
      homeClientState.sections = [section({ results: [{}] as never })];

      render(<SearchClient />);

      expect(screen.getByText('results.resultsLabel')).toBeInTheDocument();
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
    });

    it('reports no results when every catalogue settled with nothing', () => {
      homeClientState.hasSearched = true;
      homeClientState.isSettled = true;
      homeClientState.totalCount = 0;
      homeClientState.sections = [section()];

      render(<SearchClient />);

      expect(screen.getByText('results.noResults')).toBeInTheDocument();
      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
    });

    /** Only a total failure is a failed search; one dead catalogue is a bad section. */
    it('reports a failed search when every catalogue failed', () => {
      homeClientState.hasSearched = true;
      homeClientState.isSettled = true;
      homeClientState.isAllFailed = true;
      homeClientState.sections = [section({ isError: true })];

      render(<SearchClient />);

      expect(screen.getByText('results.searchFailed')).toBeInTheDocument();
    });

    it('keeps rendering sections when only one catalogue failed', () => {
      homeClientState.hasSearched = true;
      homeClientState.isSettled = true;
      homeClientState.totalCount = 1;
      homeClientState.sections = [
        section({ id: 'nf', results: [{}] as never }),
        section({ id: 'pv', label: 'Prime Video', isError: true }),
      ];

      render(<SearchClient />);

      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(
        screen.queryByText('results.searchFailed'),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Results arrive per catalogue, so the page is partially populated while the rest are
   * still in flight. It must show what landed rather than an all-or-nothing state.
   */
  describe('while catalogues are still arriving', () => {
    it('renders the sections that landed instead of an empty or failed panel', () => {
      homeClientState.hasSearched = true;
      homeClientState.isAnyPending = true;
      homeClientState.totalCount = 4;
      homeClientState.sections = [
        section({ id: 'nf', results: [{}, {}, {}, {}] as never }),
        section({ id: 'pv', label: 'Prime Video', isPending: true }),
      ];

      render(<SearchClient />);

      expect(screen.getByTestId('search-results')).toBeInTheDocument();
      expect(screen.queryByText('results.noResults')).not.toBeInTheDocument();
      expect(screen.getByText('results.searching')).toBeInTheDocument();
    });

    /** An empty panel here would flash before the slower catalogues answered. */
    it('does not claim "no results" until every catalogue has settled', () => {
      homeClientState.hasSearched = true;
      homeClientState.isAnyPending = true;
      homeClientState.isSettled = false;
      homeClientState.totalCount = 0;
      homeClientState.sections = [section({ isPending: true })];

      render(<SearchClient />);

      expect(screen.queryByText('results.noResults')).not.toBeInTheDocument();
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });

  /**
   * A transition is underway, so the query is about to exist — falling back to the
   * landing here would flash the hero between submit and results.
   */
  describe('while a search is in flight', () => {
    it('leaves the landing once the router transition is pending', () => {
      searchInputState.isPending = true;

      render(<SearchClient />);

      expect(screen.queryByText('idle.headline1')).not.toBeInTheDocument();
      expect(screen.getByText('results.searching')).toBeInTheDocument();
    });
  });

  it('defers to the auth loading state', () => {
    render(<SearchClient />);

    expect(screen.queryByTestId('global-loading')).not.toBeInTheDocument();
  });
});

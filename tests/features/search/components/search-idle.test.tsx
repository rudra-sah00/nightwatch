import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchIdle } from '@/features/search/components/SearchIdle';

const { hookState, mockUseSearchInput } = vi.hoisted(() => {
  const hookState = {
    query: '',
    suggestion: '',
    isPending: false,
    setQuery: vi.fn(),
    handleFocus: vi.fn(),
    handleBlur: vi.fn(),
    handleSearch: vi.fn(),
    handleManualSearch: vi.fn(),
    lastOptions: undefined as unknown,
  };
  return {
    hookState,
    mockUseSearchInput: vi.fn((options?: unknown) => {
      hookState.lastOptions = options;
      return { ...hookState, containerRef: { current: null } };
    }),
  };
});

vi.mock('@/features/search/hooks/use-search-input', () => ({
  useSearchInput: mockUseSearchInput,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.clearAllMocks();
  hookState.query = '';
  hookState.suggestion = '';
  hookState.isPending = false;
});

describe('SearchIdle', () => {
  it('leads with the headline rather than an empty result count', () => {
    render(<SearchIdle />);

    expect(screen.getByText('idle.headline1')).toBeInTheDocument();
    expect(screen.getByText('idle.headline2')).toBeInTheDocument();
    expect(screen.queryByText('results.resultsLabel')).not.toBeInTheDocument();
    expect(screen.queryByText(/filmsFound/)).not.toBeInTheDocument();
  });

  it('gives the page a labelled search input', () => {
    render(<SearchIdle />);

    const input = screen.getByRole('textbox', {
      name: 'idle.searchAriaLabel',
    });

    expect(input).toHaveAttribute('placeholder', 'idle.searchPlaceholder');
    expect(input).toHaveAttribute('name', 'q');
  });

  /**
   * The hook suppresses typeahead on /search so the compact results header does not
   * autocomplete over a query already run. The idle hero is the landing input, not that
   * header, so it has to opt back in or the ghost completion silently never appears.
   */
  it('opts into typeahead, which /search suppresses by default', () => {
    render(<SearchIdle />);

    expect(mockUseSearchInput).toHaveBeenCalledWith({
      enableSuggestions: true,
    });
  });

  describe('ghost completion', () => {
    it('shows the remainder of a matching suggestion', () => {
      hookState.query = 'break';
      hookState.suggestion = 'breaking bad';

      render(<SearchIdle />);

      expect(screen.getByText('ing bad')).toBeInTheDocument();
    });

    it('stays hidden when the suggestion does not extend the query', () => {
      hookState.query = 'zzz';
      hookState.suggestion = 'breaking bad';

      render(<SearchIdle />);

      expect(screen.queryByText('breaking bad')).not.toBeInTheDocument();
    });

    it('stays hidden when nothing has been typed', () => {
      hookState.query = '';
      hookState.suggestion = 'breaking bad';

      render(<SearchIdle />);

      expect(screen.queryByText('breaking bad')).not.toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('searches on button press', () => {
      render(<SearchIdle />);

      fireEvent.click(screen.getByRole('button'));

      expect(hookState.handleManualSearch).toHaveBeenCalled();
    });

    it('searches on Enter', () => {
      render(<SearchIdle />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(hookState.handleSearch).toHaveBeenCalled();
    });

    /**
     * The transition is owned by this component's own hook instance, so the results
     * layout cannot report it. Without feedback here, pressing Enter looks like nothing
     * happened until the next page renders.
     */
    it('reports progress on its own button while the transition runs', () => {
      hookState.isPending = true;

      render(<SearchIdle />);

      const button = screen.getByRole('button');

      expect(button).toHaveTextContent('results.searching');
      expect(button).toBeDisabled();
    });

    it('is ready to search when idle', () => {
      render(<SearchIdle />);

      const button = screen.getByRole('button');

      expect(button).toHaveTextContent('idle.searchButton');
      expect(button).toBeEnabled();
    });
  });
});

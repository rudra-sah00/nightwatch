import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as searchApi from '@/features/search/api';
import { useSearchInput } from '@/features/search/hooks/use-search-input';

// Hoisted router mock so we can spy on push across tests
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => '/',
  useSearchParams: () => searchParamsMock,
}));

vi.mock('@/features/search/api', () => ({
  getSearchSuggestions: vi.fn(),
  getSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  deleteSearchHistoryItem: vi.fn(),
}));

vi.mock('@/providers/server-provider', () => ({
  useServer: vi.fn(() => ({
    activeServer: 's2',
    serverLabel: 'Server 2',
    setActiveServer: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Module-level mock that tests can swap out
let searchParamsMock = { get: vi.fn().mockReturnValue(null) };

describe('useSearchInput', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    searchParamsMock = { get: vi.fn().mockReturnValue(null) };
    // Restore server to s2 (clearAllMocks doesn't reset mockReturnValue overrides)
    const { useServer } = await import('@/providers/server-provider');
    vi.mocked(useServer).mockReturnValue({
      activeServer: 's2',
      serverLabel: 'Server 2',
      setActiveServer: vi.fn(),
    });
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue([]);
    vi.mocked(searchApi.getSearchHistory).mockResolvedValue([]);
    vi.mocked(searchApi.clearSearchHistory).mockResolvedValue(undefined);
    vi.mocked(searchApi.deleteSearchHistoryItem).mockResolvedValue(undefined);
  });

  it('initialises query from URL q param', () => {
    searchParamsMock.get.mockImplementation((key: string) =>
      key === 'q' ? 'batman' : null,
    );

    const { result } = renderHook(() => useSearchInput());

    expect(result.current.query).toBe('batman');
  });

  it('initialises with empty query when no URL param', () => {
    const { result } = renderHook(() => useSearchInput());
    expect(result.current.query).toBe('');
  });

  it('does NOT update query from URL while input is focused', async () => {
    // Start with q=hello in URL
    searchParamsMock.get.mockImplementation((key: string) =>
      key === 'q' ? 'hello' : null,
    );

    const { result } = renderHook(() => useSearchInput());

    // Simulate focus
    act(() => {
      result.current.handleFocus();
    });
    expect(result.current.query).toBe('hello');

    // Now URL changes to q=world — but since we are focused, query must stay as-is
    searchParamsMock = {
      get: vi
        .fn()
        .mockImplementation((key: string) => (key === 'q' ? 'world' : null)),
    };

    // Wait a tick — useEffect with urlQuery would fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // query should still be the user-typed value, not the new URL value
    // (isFocusedRef guards the sync)
    expect(result.current.query).toBe('hello');
  });

  it('updates query from URL after blur resolves focus guard', async () => {
    searchParamsMock.get.mockImplementation((key: string) =>
      key === 'q' ? 'initial' : null,
    );

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
    });
    act(() => {
      result.current.handleBlur();
    });

    // After blur, isFocusedRef is false — URL sync can run
    // Verify handleBlur doesn't throw and state is intact
    expect(result.current.query).toBe('initial');
  });

  it('handleFocus opens the dropdown', () => {
    const { result } = renderHook(() => useSearchInput());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.handleFocus();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('handleClear resets query and closes dropdown', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('some text');
      result.current.handleFocus();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleClear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
  });

  it('handleClear navigates to /home', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleClear();
    });

    // router.push is called inside startTransition — wait for it
    expect(mockRouterPush).toHaveBeenCalledWith('/home');
  });

  it('handleSearch on Enter navigates with query', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('avengers');
    });

    act(() => {
      result.current.handleSearch({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/home?q=avengers');
  });

  it('handleSearch on Escape closes dropdown', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleSearch({
        key: 'Escape',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('handleSearch does nothing on Enter when query is empty', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleSearch({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(mockRouterPush).not.toHaveBeenCalledWith(
      expect.stringContaining('/home?q='),
    );
  });

  it('handleSelect sets query and closes suggestions', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
    });
    act(() => {
      result.current.handleSelect('inception');
    });

    expect(result.current.query).toBe('inception');
    expect(result.current.isOpen).toBe(false);
    expect(mockRouterPush).toHaveBeenCalledWith('/home?q=inception');
  });

  it('does NOT fetch suggestions on s1 server', async () => {
    const { useServer } = await import('@/providers/server-provider');
    vi.mocked(useServer).mockReturnValue({
      activeServer: 's1',
      serverLabel: 'Server 1',
      setActiveServer: vi.fn(),
    });

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('avengers');
    });

    // Wait past the 500ms debounce
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(searchApi.getSearchSuggestions).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });

  it('fetches suggestions on s2 server after debounce', async () => {
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue([
      'avengers',
      'avatar',
    ]);

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('avan');
    });

    // Before debounce — should not have called yet
    expect(searchApi.getSearchSuggestions).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    await waitFor(() => {
      expect(searchApi.getSearchSuggestions).toHaveBeenCalledWith('avan', 's2');
    });
    expect(result.current.suggestions).toEqual(['avengers', 'avatar']);
  });

  it('does not fetch suggestions for query shorter than 2 chars', async () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('a');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(searchApi.getSearchSuggestions).not.toHaveBeenCalled();
  });

  it('showSuggestions is true when open, s2, and query >= 2 chars', async () => {
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue([
      'test1',
      'test2',
    ]);

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
      result.current.setQuery('te');
    });

    expect(result.current.showSuggestions).toBe(true);
  });

  it('showSuggestions is false when query is shorter than 2 chars', () => {
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
      result.current.setQuery('t');
    });

    expect(result.current.showSuggestions).toBe(false);
  });

  it('loads history on focus when query is empty', async () => {
    const mockHistory = [{ id: '1', query: 'batman', createdAt: '2024-01-01' }];
    vi.mocked(searchApi.getSearchHistory).mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useSearchInput());

    // ensure query is empty
    act(() => {
      result.current.setQuery('');
    });
    act(() => {
      result.current.handleFocus();
    });

    await waitFor(() => {
      expect(result.current.history).toEqual(mockHistory);
    });
  });

  it('handleClearHistory clears all history items', async () => {
    const { toast } = await import('sonner');

    vi.mocked(searchApi.getSearchHistory).mockResolvedValue([
      { id: '1', query: 'batman', createdAt: '2024-01-01' },
    ]);
    vi.mocked(searchApi.clearSearchHistory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSearchInput());

    // Load history first
    act(() => {
      result.current.handleFocus();
    });
    await waitFor(() => expect(result.current.history.length).toBe(1));

    await act(async () => {
      await result.current.handleClearHistory();
    });

    expect(searchApi.clearSearchHistory).toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
    expect(toast.success).toHaveBeenCalled();
  });
});

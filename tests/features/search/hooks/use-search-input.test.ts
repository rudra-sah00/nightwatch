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
}));

vi.mock('@/providers/server-provider', () => ({
  useServer: vi.fn(() => ({
    activeServer: 's2',
    serverLabel: 'Balanced',
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
      serverLabel: 'Balanced',
      setActiveServer: vi.fn(),
    });
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue([]);
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
    expect(result.current.query).toBe('hello');
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

    expect(mockRouterPush).toHaveBeenCalledWith('/search?q=avengers');
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
    expect(mockRouterPush).toHaveBeenCalledWith('/search?q=inception');
  });

  it('does NOT fetch suggestions on s1 server', async () => {
    const { useServer } = await import('@/providers/server-provider');
    vi.mocked(useServer).mockReturnValue({
      activeServer: 's1',
      serverLabel: 'Netflix',
      setActiveServer: vi.fn(),
    });

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.setQuery('avengers');
    });

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

    expect(searchApi.getSearchSuggestions).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    await waitFor(() => {
      expect(searchApi.getSearchSuggestions).toHaveBeenCalledWith('avan', 's2');
    });
    // Hook now slices to 1 suggestion
    expect(result.current.suggestions).toEqual(['avengers']);
  });

  it('showSuggestions is true when open, s2, and suggestions exist', async () => {
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue(['test1']);

    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
      result.current.setQuery('te');
    });

    await waitFor(() => {
      expect(result.current.showSuggestions).toBe(true);
    });
  });

  it('showSuggestions is false when no suggestions found', async () => {
    vi.mocked(searchApi.getSearchSuggestions).mockResolvedValue([]);
    const { result } = renderHook(() => useSearchInput());

    act(() => {
      result.current.handleFocus();
      result.current.setQuery('t');
    });

    await waitFor(() => {
      expect(result.current.showSuggestions).toBe(false);
    });
  });
});

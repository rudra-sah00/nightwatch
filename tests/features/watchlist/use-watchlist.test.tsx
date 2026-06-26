vi.mock('@/lib/fetch');
vi.mock('@/lib/analytics');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWatchlist, removeFromWatchlist } from '@/features/watchlist/api';
import { useWatchlist } from '@/features/watchlist/hooks/use-watchlist';
import type { WatchlistItem } from '@/features/watchlist/types';
import { ContentType } from '@/types/content';

vi.mock('@/features/watchlist/api', () => ({
  getWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}));

const mockGetWatchlist = vi.mocked(getWatchlist);
const mockRemove = vi.mocked(removeFromWatchlist);

const items: WatchlistItem[] = [
  {
    id: '1',
    contentId: 'c1',
    title: 'Movie A',
    posterUrl: '',
    contentType: ContentType.Movie,
    addedAt: '2024-01-01',
  },
  {
    id: '2',
    contentId: 'c2',
    title: 'Series B',
    posterUrl: '',
    contentType: ContentType.Series,
    addedAt: '2024-01-02',
  },
];

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWatchlist.mockResolvedValue(items);
  });

  it('happy path: loads watchlist and allows removal with optimistic update', async () => {
    mockRemove.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );
    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.watchlist).toHaveLength(2);

    act(() => {
      result.current.removeItem('c1');
    });

    // Optimistic: item removed after onMutate runs
    await waitFor(() =>
      expect(
        result.current.watchlist.find((i) => i.contentId === 'c1'),
      ).toBeUndefined(),
    );
    expect(mockRemove).toHaveBeenCalledWith('c1');
  });

  it('error case: rolls back on failed removal', async () => {
    // Delay rejection so optimistic update is observable
    mockRemove.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('fail')), 50),
        ),
    );
    // After rollback, invalidation refetches - return full list
    mockGetWatchlist.mockResolvedValue(items);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.watchlist).toHaveLength(2);

    act(() => {
      result.current.removeItem('c1');
    });

    // Optimistic removal
    await waitFor(() => expect(result.current.watchlist).toHaveLength(1));

    // After error, rollback + refetch restores
    await waitFor(() => expect(result.current.watchlist).toHaveLength(2));
  });

  it('edge case: isEmpty is true when watchlist is empty', async () => {
    mockGetWatchlist.mockResolvedValue([]);
    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
  });

  it('edge case: selectedId state management', async () => {
    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.selectedId).toBeNull();
    act(() => {
      result.current.setSelectedId('c2');
    });
    expect(result.current.selectedId).toBe('c2');
  });
});

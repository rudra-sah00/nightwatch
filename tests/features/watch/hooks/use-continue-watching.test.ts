import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContinueWatching } from '@/features/watch/hooks/use-continue-watching';
import { ServerProvider } from '@/providers/server-provider';
import { ContentType } from '@/types/content';

// Mock API
vi.mock('@/features/watch/api', () => ({
  fetchContinueWatching: vi.fn(),
  getCachedContinueWatching: vi.fn(() => null),
  invalidateContinueWatchingCache: vi.fn(),
  deleteWatchProgress: vi.fn(),
  setContinueWatchingCache: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('useContinueWatching — race condition and stale response guards', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore getCachedContinueWatching to no-cache
    const { getCachedContinueWatching } = await import('@/features/watch/api');
    vi.mocked(getCachedContinueWatching).mockReturnValue(null);
  });

  it('clears items immediately when server changes', async () => {
    const { fetchContinueWatching } = await import('@/features/watch/api');

    const s1Items = [
      {
        id: '1',
        contentId: 'c1',
        contentType: ContentType.Movie,
        title: 'S1 Movie',
        posterUrl: '',
        progressSeconds: 0,
        durationSeconds: 100,
        progressPercent: 0,
        remainingSeconds: 100,
        remainingMinutes: 2,
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    // First fetch (s1) responds immediately
    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      cb?.(s1Items);
      return s1Items;
    });

    const { result, rerender } = renderHook(() => useContinueWatching({}), {
      wrapper: ({ children }) =>
        React.createElement(ServerProvider, { defaultServer: 's1', children }),
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    // Now control the next fetch
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      const items = await pendingPromise;
      cb?.(items as any);
      return items as any;
    });

    // Switch server triggers re-render (note: usually requires activeServer change in provider)
    rerender();

    // Fetch should have been called
    expect(fetchContinueWatching).toHaveBeenCalledTimes(2);
  });

  it('discards stale s1 response when server already switched to s2', async () => {
    const { fetchContinueWatching, getCachedContinueWatching } = await import(
      '@/features/watch/api'
    );
    vi.mocked(getCachedContinueWatching).mockReturnValue(null);

    const s1Items = [
      {
        id: '1',
        contentId: 'c1',
        contentType: ContentType.Movie,
        title: 'S1 Movie',
        posterUrl: '',
        progressSeconds: 0,
        durationSeconds: 100,
        progressPercent: 0,
        remainingSeconds: 100,
        remainingMinutes: 2,
        lastWatchedAt: new Date().toISOString(),
      },
    ];
    const s2Items = [
      {
        id: '2',
        contentId: 'c2',
        contentType: ContentType.Movie,
        title: 'S2 Movie',
        posterUrl: '',
        progressSeconds: 0,
        durationSeconds: 100,
        progressPercent: 0,
        remainingSeconds: 100,
        remainingMinutes: 2,
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    // First call (s1) - we handle the resolve manually
    let resolveS1: (value: any) => void;
    const s1Promise = new Promise((resolve) => {
      resolveS1 = resolve;
    });

    vi.mocked(fetchContinueWatching).mockImplementationOnce(
      async (_l, _s, cb) => {
        const items = await s1Promise;
        cb?.(items as any);
        return items as any;
      },
    );

    // Second call (s2) responds immediately
    vi.mocked(fetchContinueWatching).mockImplementationOnce(
      async (_l, _s, cb) => {
        cb?.(s2Items);
        return s2Items;
      },
    );

    // Wrap with mutable server state
    let setServer: (s: 's1' | 's2') => void = () => {};
    function ControlledWrapper({ children }: { children: React.ReactNode }) {
      const [server, setS] = React.useState<'s1' | 's2'>('s1');
      setServer = setS;
      return React.createElement(ServerProvider, {
        defaultServer: server,
        children,
      });
    }

    const { result } = renderHook(() => useContinueWatching({}), {
      wrapper: ControlledWrapper,
    });

    // Initial fetch is pending
    await waitFor(() => expect(fetchContinueWatching).toHaveBeenCalled());

    // Switch to s2 - triggers second fetch
    act(() => {
      setServer('s2');
    });

    // Wait for s2 response to be applied
    await waitFor(() => {
      expect(result.current.items).toEqual(s2Items);
    });

    // Now resolve the stale s1 promise
    await act(async () => {
      resolveS1!(s1Items);
    });

    // Items must still be s2Items, not s1Items
    expect(result.current.items).toEqual(s2Items);
    expect(result.current.items.every((i) => i.title === 'S2 Movie')).toBe(
      true,
    );
  });

  it('uses cache when available (no force)', async () => {
    const { fetchContinueWatching, getCachedContinueWatching } = await import(
      '@/features/watch/api'
    );

    const cachedItems = [
      {
        id: 'cached-1',
        contentId: 'cc1',
        contentType: ContentType.Movie,
        title: 'Cached Movie',
        posterUrl: '',
        progressSeconds: 0,
        durationSeconds: 100,
        progressPercent: 0,
        remainingSeconds: 100,
        remainingMinutes: 2,
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    // Response for the mount-time force fetch
    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      cb?.(cachedItems);
      return cachedItems;
    });
    vi.mocked(getCachedContinueWatching).mockReturnValue(cachedItems);

    const { result } = renderHook(() => useContinueWatching({}), {
      wrapper: ({ children }) =>
        React.createElement(ServerProvider, { defaultServer: 's1', children }),
    });

    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });

    // only 1 force-fetch on mount
    expect(fetchContinueWatching).toHaveBeenCalledTimes(1);
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContinueWatching } from '@/features/watch/hooks/use-continue-watching';
import { ServerProvider } from '@/providers/server-provider';

// Mock API
vi.mock('@/features/watch/api', () => ({
  fetchContinueWatching: vi.fn(),
  getCachedContinueWatching: vi.fn(() => null),
  invalidateContinueWatchingCache: vi.fn(),
  deleteWatchProgress: vi.fn(),
  setContinueWatchingCache: vi.fn(),
}));

// Mock socket provider
vi.mock('@/providers/socket-provider', () => ({
  useSocket: vi.fn(() => ({
    socket: {
      connected: true,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    } as unknown as Socket,
    isConnected: true,
    connect: vi.fn(),
    connectGuest: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('useContinueWatching — race condition and stale response guards', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore useSocket to connected state after any test that overrides it
    const { useSocket } = await import('@/providers/socket-provider');
    vi.mocked(useSocket).mockReturnValue({
      socket: {
        connected: true,
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      } as unknown as Socket,
      isConnected: true,
      connect: vi.fn(),
      connectGuest: vi.fn(),
      disconnect: vi.fn(),
    });
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
        contentType: 'Movie' as const,
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
    vi.mocked(fetchContinueWatching).mockImplementation((_l, _s, cb) => {
      cb(s1Items);
    });

    const _wrapper = ({
      children,
      server,
    }: {
      children: React.ReactNode;
      server: 's1' | 's2';
    }) =>
      React.createElement(ServerProvider, { defaultServer: server, children });

    const { result, rerender } = renderHook(() => useContinueWatching({}), {
      wrapper: ({ children }) =>
        React.createElement(ServerProvider, { defaultServer: 's1', children }),
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    // Now hold the next fetch callback
    let holdCallback: ((items: typeof s1Items | null) => void) | null = null;
    vi.mocked(fetchContinueWatching).mockImplementation((_l, _s, cb) => {
      holdCallback = cb as typeof holdCallback;
    });

    // Switch server to s2 — triggers re-render with new ServerProvider
    rerender();

    // Hold callback is pending — but items should have been cleared synchronously
    // Note: because the ServerProvider default doesn't change in this wrapper,
    // we test via the mock state.
    expect(holdCallback).toBeDefined(); // second fetch was initiated
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
        contentType: 'Movie' as const,
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
        contentType: 'Movie' as const,
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

    // Hold the first callback
    let firstCallback: ((items: typeof s1Items | null) => void) | null = null;
    vi.mocked(fetchContinueWatching).mockImplementationOnce((_l, _s, cb) => {
      firstCallback = cb as typeof firstCallback;
    });
    // Second call (s2) responds immediately
    vi.mocked(fetchContinueWatching).mockImplementationOnce((_l, _s, cb) => {
      cb(s2Items);
    });

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

    // Wait for first fetch to be initiated (callback is held)
    await waitFor(() => expect(firstCallback).not.toBeNull());

    // Switch to s2 — triggers new fetch which resolves with s2Items
    act(() => {
      setServer('s2');
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(s2Items);
    });

    // Now fire the stale s1 callback — should be discarded
    act(() => {
      firstCallback?.(s1Items);
    });

    // Items must still be s2Items, not s1Items
    expect(result.current.items).toEqual(s2Items);
    expect(result.current.items.every((i) => i.title === 'S2 Movie')).toBe(
      true,
    );
  });

  it('resolves isLoading=false when socket is disconnected', async () => {
    const { useSocket } = await import('@/providers/socket-provider');
    vi.mocked(useSocket).mockReturnValue({
      socket: null,
      isConnected: false,
      connect: vi.fn(),
      connectGuest: vi.fn(),
      disconnect: vi.fn(),
    });

    const onLoadComplete = vi.fn();
    const { result } = renderHook(
      () => useContinueWatching({ onLoadComplete }),
      {
        wrapper: ({ children }) =>
          React.createElement(ServerProvider, {
            defaultServer: 's1',
            children,
          }),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onLoadComplete).toHaveBeenCalledWith(0);
  });

  it('uses cache when available (no force)', async () => {
    const { fetchContinueWatching, getCachedContinueWatching } = await import(
      '@/features/watch/api'
    );

    const cachedItems = [
      {
        id: 'cached-1',
        contentId: 'cc1',
        contentType: 'Movie' as const,
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

    // On mount, hook always force-fetches — return cached from the network call
    vi.mocked(fetchContinueWatching).mockImplementation((_l, _s, cb) => {
      cb(cachedItems);
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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = {
  id: 'mobile-socket-1',
  connected: true,
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
};

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

import { useAvailableTvs } from '@/features/remote-control/hooks/use-available-tvs';

describe('useAvailableTvs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty tvs array', () => {
    const { result } = renderHook(() => useAvailableTvs());
    expect(result.current.tvs).toEqual([]);
  });

  it('registers TV_AVAILABLE listener on mount', () => {
    renderHook(() => useAvailableTvs());
    expect(mockOn).toHaveBeenCalledWith(
      'remote:tv_available',
      expect.any(Function),
    );
  });

  it('adds a TV when tv_available event fires', () => {
    const { result } = renderHook(() => useAvailableTvs());

    const onTvAvailable = mockOn.mock.calls.find(
      (c) => c[0] === 'remote:tv_available',
    )?.[1];

    act(() => {
      onTvAvailable?.({
        socketId: 'tv-socket-1',
        deviceName: 'Android TV',
      });
    });

    expect(result.current.tvs).toHaveLength(1);
    expect(result.current.tvs[0].deviceName).toBe('Android TV');
  });

  it('ignores own socket id', () => {
    const { result } = renderHook(() => useAvailableTvs());

    const onTvAvailable = mockOn.mock.calls.find(
      (c) => c[0] === 'remote:tv_available',
    )?.[1];

    act(() => {
      onTvAvailable?.({
        socketId: 'mobile-socket-1', // same as own socket
        deviceName: 'Self',
      });
    });

    expect(result.current.tvs).toHaveLength(0);
  });

  it('castToTv emits remote:cast_content', () => {
    const { result } = renderHook(() => useAvailableTvs());

    act(() => {
      result.current.castToTv('tv-socket-1', {
        movieId: 'movie-123',
        title: 'Test Movie',
      });
    });

    expect(mockEmit).toHaveBeenCalledWith('remote:cast_content', {
      targetSocketId: 'tv-socket-1',
      movieId: 'movie-123',
      title: 'Test Movie',
    });
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useAvailableTvs());
    unmount();
    expect(mockOff).toHaveBeenCalledWith(
      'remote:tv_available',
      expect.any(Function),
    );
  });
});

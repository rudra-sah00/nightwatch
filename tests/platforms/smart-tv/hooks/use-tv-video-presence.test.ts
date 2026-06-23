import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockPush = vi.fn();
const mockSocket = {
  id: 'tv-socket-1',
  connected: true,
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
};

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/platforms/smart-tv/lib/detection', () => ({
  isTV: () => true,
}));

import { useTvVideoPresence } from '@/platforms/smart-tv/hooks/use-tv-video-presence';

describe('useTvVideoPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('emits tv_available on mount', () => {
    renderHook(() => useTvVideoPresence());

    expect(mockEmit).toHaveBeenCalledWith('remote:tv_available', {
      socketId: 'tv-socket-1',
      deviceName: 'Android TV',
    });
  });

  it('registers cast_content listener', () => {
    renderHook(() => useTvVideoPresence());

    expect(mockOn).toHaveBeenCalledWith(
      'remote:cast_content',
      expect.any(Function),
    );
  });

  it('navigates to watch page on cast_content', () => {
    renderHook(() => useTvVideoPresence());

    const onCast = mockOn.mock.calls.find(
      (c) => c[0] === 'remote:cast_content',
    )?.[1];

    onCast?.({ movieId: 'movie-456', title: 'Test' });

    expect(mockPush).toHaveBeenCalledWith('/watch/movie-456');
  });

  it('emits tv_available every 60 seconds', () => {
    renderHook(() => useTvVideoPresence());

    // Initial emit
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // After 60s
    vi.advanceTimersByTime(60_000);
    expect(mockEmit).toHaveBeenCalledTimes(2);

    // After another 60s
    vi.advanceTimersByTime(60_000);
    expect(mockEmit).toHaveBeenCalledTimes(3);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useTvVideoPresence());
    unmount();

    expect(mockOff).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith(
      'remote:cast_content',
      expect.any(Function),
    );
  });
});

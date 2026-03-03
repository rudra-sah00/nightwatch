import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoundboard } from '@/features/watch-party/interactions/hooks/use-soundboard';
import {
  emitPartyInteraction,
  getTrendingSounds,
  onPartyInteraction,
  searchSounds,
} from '@/features/watch-party/room/services/watch-party.api';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  emitPartyInteraction: vi.fn(),
  getTrendingSounds: vi.fn(),
  searchSounds: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()),
}));

const mockSounds = [
  {
    name: 'Laugh',
    slug: 'laugh',
    sound: '/api/sounds/laugh.mp3',
    color: '#ff4444',
  },
  {
    name: 'Clap',
    slug: 'clap',
    sound: '/api/sounds/clap.mp3',
    color: '#44ff44',
  },
];

describe('useSoundboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTrendingSounds).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockSounds,
    });
    vi.mocked(searchSounds).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    vi.mocked(onPartyInteraction).mockReturnValue(vi.fn());
  });

  it('fetches trending sounds on mount', async () => {
    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getTrendingSounds).toHaveBeenCalledWith(1);
    expect(result.current.sounds).toEqual(mockSounds);
  });

  it('shows error toast when fetch fails', async () => {
    const { toast } = await import('sonner');
    vi.mocked(getTrendingSounds).mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to load sounds');
  });

  it('loads more sounds when loadMore is called', async () => {
    vi.mocked(getTrendingSounds).mockResolvedValue({
      count: 10,
      next: 'page2',
      previous: null,
      results: mockSounds,
    });

    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(getTrendingSounds).mockResolvedValueOnce({
      count: 10,
      next: null,
      previous: 'page1',
      results: [
        {
          name: 'Air Horn',
          slug: 'air-horn',
          sound: '/api/sounds/horn.mp3',
          color: '#4444ff',
        },
      ],
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTrendingSounds).toHaveBeenCalledWith(2);
  });

  it('sets searchQuery and debounces search', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSoundboard());

    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.setSearchQuery('laugh');
    });

    // Before debounce fires, searchSounds should not have been called yet
    expect(searchSounds).not.toHaveBeenCalled();

    // Advance timers past debounce (500ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(searchSounds).toHaveBeenCalledWith('laugh', 1);
    vi.useRealTimers();
  });

  it('handleTriggerSound emits interaction and plays audio', async () => {
    // Mock Audio as a class constructor
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      play = mockPlay;
      pause = vi.fn();
      onended: (() => void) | null = null;
      currentTime = 0;
    }
    vi.stubGlobal('Audio', MockAudio);

    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleTriggerSound('/api/sounds/laugh.mp3', 'Laugh');
    });

    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'sound',
      value: '/api/sounds/laugh.mp3',
    });

    vi.unstubAllGlobals();
  });

  it('appends guest token to /api/ URLs when sessionStorage has guest_token', async () => {
    // Set guest token in sessionStorage
    sessionStorage.setItem('guest_token', 'mytoken123');

    const constructedUrls: string[] = [];
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      play = mockPlay;
      pause = vi.fn();
      onended: (() => void) | null = null;
      currentTime = 0;
      constructor(url: string) {
        constructedUrls.push(url);
      }
    }
    vi.stubGlobal('Audio', MockAudio);

    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleTriggerSound('/api/sounds/laugh.mp3', 'Laugh');
    });

    // Audio should be constructed with token appended
    expect(constructedUrls.some((u) => u.includes('token=mytoken123'))).toBe(
      true,
    );

    sessionStorage.removeItem('guest_token');
    vi.unstubAllGlobals();
  });

  it('appends token with & when URL already has query string', async () => {
    sessionStorage.setItem('guest_token', 'tok456');

    const constructedUrls: string[] = [];
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      play = mockPlay;
      pause = vi.fn();
      onended: (() => void) | null = null;
      currentTime = 0;
      constructor(url: string) {
        constructedUrls.push(url);
      }
    }
    vi.stubGlobal('Audio', MockAudio);

    const { result } = renderHook(() => useSoundboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleTriggerSound(
        '/api/sounds/laugh.mp3?quality=hi',
        'Laugh',
      );
    });

    expect(constructedUrls).toContain(
      '/api/sounds/laugh.mp3?quality=hi&token=tok456',
    );

    sessionStorage.removeItem('guest_token');
    vi.unstubAllGlobals();
  });

  it('clears searchQuery and resets to trending sounds', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSoundboard());

    await act(async () => {
      vi.runAllTimers();
    });

    // First search with query
    act(() => {
      result.current.setSearchQuery('laugh');
    });

    // Clear the query
    act(() => {
      result.current.setSearchQuery('');
    });

    await act(async () => {
      vi.runAllTimers();
    });

    // Clearing should trigger getTrendingSounds, not searchSounds
    expect(searchSounds).not.toHaveBeenCalled();
    expect(getTrendingSounds).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

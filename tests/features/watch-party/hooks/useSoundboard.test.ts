import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoundboard } from '@/features/watch-party/interactions/hooks/use-soundboard';
import * as api from '@/features/watch-party/room/services/watch-party.api';

// Override global next-intl mock with a stable reference to prevent infinite re-render loops
const stableT = (key: string, values?: Record<string, unknown>) => {
  if (values) {
    let result = key;
    for (const [k, v] of Object.entries(values)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  }
  return key;
};
vi.mock('next-intl', () => ({
  useTranslations: () => stableT,
  useLocale: () => 'en',
  useMessages: () => ({}),
  useNow: () => new Date(),
  useTimeZone: () => 'UTC',
  useFormatter: () => ({
    number: (n: number) => String(n),
    dateTime: (d: Date) => d.toISOString(),
    relativeTime: (d: Date) => d.toISOString(),
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  getTrendingSounds: vi.fn(),
  searchSounds: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useSoundboard', () => {
  const mockRtmSendMessage = vi.fn();
  const defaultProps = {
    rtmSendMessage: mockRtmSendMessage,
    userId: 'user-1',
    userName: 'User 1',
  };

  const mockSounds = [
    {
      name: 'Laugh',
      slug: 'laugh',
      sound: '/api/sounds/laugh.mp3',
      color: '#ff4444',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTrendingSounds).mockResolvedValue({
      results: mockSounds,
      next: null,
      count: 1,
    } as unknown as import('@/features/watch-party/room/services/watch-party.api').SoundboardResponse);
  });

  it('fetches trending sounds on mount', async () => {
    const { result } = renderHook(() => useSoundboard(defaultProps));

    await waitFor(() => {
      expect(result.current.sounds).toEqual(mockSounds);
    });
    expect(api.getTrendingSounds).toHaveBeenCalledWith(1);
  });

  it('handleTriggerSound broadcasts RTM and plays locally', async () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      class {
        play = mockPlay;
        volume = 0;
      },
    );

    const { result } = renderHook(() => useSoundboard(defaultProps));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleTriggerSound('/api/sounds/laugh.mp3', 'Laugh');
    });

    expect(mockRtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INTERACTION',
        kind: 'sound',
        sound: '/api/sounds/laugh.mp3',
      }),
    );
    expect(mockPlay).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('debounces search queries', async () => {
    vi.mocked(api.searchSounds).mockResolvedValue({
      results: [],
      next: null,
      count: 0,
    } as unknown as import('@/features/watch-party/room/services/watch-party.api').SoundboardResponse);

    const { result } = renderHook(() => useSoundboard(defaultProps));

    // Wait for initial fetch to finish so loadingRef resets
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setSearchQuery('applause');
    });

    // Advance 200ms - shouldn't trigger yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(api.searchSounds).not.toHaveBeenCalled();

    // Advance to 600ms
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(api.searchSounds).toHaveBeenCalledWith('applause', 1);

    vi.useRealTimers();
  });
});

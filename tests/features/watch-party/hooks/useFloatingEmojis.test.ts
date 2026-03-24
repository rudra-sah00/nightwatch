import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloatingEmojis } from '@/features/watch-party/interactions/hooks/use-floating-emojis';
import * as api from '@/features/watch-party/room/services/watch-party.api';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  onPartyInteraction: vi.fn(),
}));

describe('useFloatingEmojis', () => {
  let capturedCallback: (data: unknown) => void;
  const mockCleanup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(api.onPartyInteraction).mockImplementation((cb) => {
      capturedCallback = cb;
      return mockCleanup;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns emojis when RTM interaction is received via bridge', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'INTERACTION',
        kind: 'emoji',
        emoji: '🔥',
        userId: 'u1',
        userName: 'Alice',
      });
    });

    expect(result.current.activeEmojis.length).toBeGreaterThan(0);
    expect(result.current.activeEmojis[0].emoji).toBe('🔥');
    expect(result.current.activeEmojis[0].userName).toBe('Alice');
  });

  it('ignores non-emoji interactions', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'INTERACTION',
        kind: 'sound',
        sound: 'clap.mp3',
      });
    });

    expect(result.current.activeEmojis).toHaveLength(0);
  });

  it('removes emojis after timeout', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'INTERACTION',
        kind: 'emoji',
        emoji: '👍',
      });
    });

    expect(result.current.activeEmojis.length).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.activeEmojis.length).toBe(0);
  });
});

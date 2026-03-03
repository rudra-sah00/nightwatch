import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloatingEmojis } from '@/features/watch-party/interactions/hooks/use-floating-emojis';
import { onPartyInteraction } from '@/features/watch-party/room/services/watch-party.api';
import type { InteractionPayload } from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  onPartyInteraction: vi.fn(),
}));

describe('useFloatingEmojis', () => {
  let capturedCallback: (data: InteractionPayload) => void;
  const mockCleanup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(onPartyInteraction).mockImplementation((cb) => {
      capturedCallback = cb;
      return mockCleanup;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty activeEmojis', () => {
    const { result } = renderHook(() => useFloatingEmojis());
    expect(result.current.activeEmojis).toEqual([]);
  });

  it('spawns emojis when interaction is type emoji', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'emoji',
        value: '🔥',
        userId: 'u1',
        userName: 'Alice',
        timestamp: Date.now(),
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.activeEmojis.length).toBeGreaterThan(0);
    expect(result.current.activeEmojis[0].emoji).toBe('🔥');
    expect(result.current.activeEmojis[0].userName).toBe('Alice');
  });

  it('ignores interactions that are NOT type emoji (line 55-56 branch)', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'sound',
        value: 'clap.mp3',
        userId: 'u1',
        userName: 'Bob',
        timestamp: Date.now(),
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // No emojis should have been spawned for a 'sound' interaction
    expect(result.current.activeEmojis).toEqual([]);
  });

  it('uses "Guest" when userName is missing', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'emoji',
        value: '👍',
        userId: 'u1',
        // No userName
        timestamp: Date.now(),
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.activeEmojis[0].userName).toBe('Guest');
  });

  it('removes emojis after their duration expires', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      capturedCallback({
        type: 'emoji',
        value: '😂',
        userId: 'u1',
        userName: 'Tester',
        timestamp: Date.now(),
      });
    });

    // Advance to trigger spawn
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const countAfterSpawn = result.current.activeEmojis.length;
    expect(countAfterSpawn).toBeGreaterThan(0);

    // Advance past duration (max ~2s + 100ms + spawn delay)
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.activeEmojis.length).toBe(0);
  });

  it('spawnEmoji can be called directly', async () => {
    const { result } = renderHook(() => useFloatingEmojis());

    await act(async () => {
      result.current.spawnEmoji('⭐', 'DirectUser');
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.activeEmojis.length).toBeGreaterThan(0);
  });

  it('calls cleanup on unmount', () => {
    const { unmount } = renderHook(() => useFloatingEmojis());
    unmount();
    expect(mockCleanup).toHaveBeenCalled();
  });
});

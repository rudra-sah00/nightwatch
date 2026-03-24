import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingEmojis } from '@/features/watch-party/interactions/components/FloatingEmojis';
import { onPartyInteraction } from '@/features/watch-party/room/services/watch-party.api';
import type { InteractionPayload } from '@/features/watch-party/room/types';

// Mock the API
vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  onPartyInteraction: vi.fn(),
}));

describe('FloatingEmojis', () => {
  let interactionCallback: (data: InteractionPayload) => void;
  const mockCleanup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(onPartyInteraction).mockImplementation((cb) => {
      interactionCallback = cb;
      return mockCleanup;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    render(<FloatingEmojis />);
    expect(screen.queryByText('❤️')).not.toBeInTheDocument();
  });

  it('spawns emojis when receiving an interaction', async () => {
    render(<FloatingEmojis />);

    // Trigger the interaction callback
    await act(async () => {
      interactionCallback({
        type: 'INTERACTION',
        kind: 'emoji',
        emoji: '🔥',
        userId: 'u1',
        userName: 'TestUser',
        timestamp: Date.now(),
      } as unknown as Parameters<typeof interactionCallback>[0]);
    });

    // We use a small delay in FloatingEmojis (Math.random() based)
    // and multiple emojis are spawned.
    // Let's advance timers
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Check if the emoji and username are rendered
    expect(screen.getAllByText('🔥').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TestUser').length).toBeGreaterThan(0);
  });

  it('removes emojis after duration', async () => {
    render(<FloatingEmojis />);

    await act(async () => {
      interactionCallback({
        type: 'INTERACTION',
        kind: 'emoji',
        emoji: '😂',
        userId: 'u1',
        userName: 'TestUser',
        timestamp: Date.now(),
      } as unknown as Parameters<typeof interactionCallback>[0]);
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('😂').length).toBeGreaterThan(0);

    // After 4.5 seconds (max duration is 4.5s)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('😂')).not.toBeInTheDocument();
  });
});

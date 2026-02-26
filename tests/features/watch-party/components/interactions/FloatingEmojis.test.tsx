import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingEmojis } from '@/features/watch-party/components/interactions/FloatingEmojis';
import { onPartyInteraction } from '@/features/watch-party/services/watch-party.api';
import type { InteractionPayload } from '@/features/watch-party/types';

// Mock the API
vi.mock('@/features/watch-party/services/watch-party.api', () => ({
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
        type: 'emoji',
        value: '🔥',
        userId: 'u1',
        userName: 'TestUser',
        timestamp: Date.now(),
      });
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
        type: 'emoji',
        value: '😂',
        userId: 'u1',
        userName: 'TestUser',
        timestamp: Date.now(),
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getAllByText('😂').length).toBeGreaterThan(0);

    // After ~3 seconds (max duration is 2s + 100ms + spawn delays)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('😂')).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiReactions } from '@/features/watch-party/components/interactions/EmojiReactions';
import { emitPartyInteraction } from '@/features/watch-party/services/watch-party.api';

// Mock the API
vi.mock('@/features/watch-party/services/watch-party.api', () => ({
  emitPartyInteraction: vi.fn(),
}));

// Mock next/dynamic to avoid loading issues in tests
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent() {
      return <div data-testid="emoji-picker-mock">Emoji Picker</div>;
    };
  },
}));

describe('EmojiReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quick emojis', () => {
    render(<EmojiReactions />);
    // Check for some of the QUICK_EMOJIS
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('😂')).toBeInTheDocument();
    expect(screen.getByText('😠')).toBeInTheDocument();
  });

  it('emits interaction when quick emoji is clicked', () => {
    render(<EmojiReactions />);
    const heartButton = screen.getByText('❤️');
    fireEvent.click(heartButton);

    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'emoji',
      value: '❤️',
    });
  });

  it('toggles full emoji picker', () => {
    render(<EmojiReactions />);
    const plusButton = screen.getByTitle('Full Emoji Library');

    // Initially hidden
    expect(screen.queryByTestId('emoji-picker-mock')).not.toBeInTheDocument();

    // Show on click
    fireEvent.click(plusButton);
    expect(screen.getByTestId('emoji-picker-mock')).toBeInTheDocument();

    // Hide on click again
    fireEvent.click(plusButton);
    expect(screen.queryByTestId('emoji-picker-mock')).not.toBeInTheDocument();
  });
});

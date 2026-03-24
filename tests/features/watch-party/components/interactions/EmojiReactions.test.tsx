import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiReactions } from '@/features/watch-party/interactions/components/EmojiReactions';

// Mock the hook
vi.mock(
  '@/features/watch-party/interactions/hooks/use-emoji-reactions',
  () => ({
    useEmojiReactions: vi.fn(() => ({
      showPicker: false,
      setShowPicker: vi.fn(),
      pickerRef: { current: null },
      handleTriggerEmoji: vi.fn(),
    })),
  }),
);

describe('EmojiReactions', () => {
  const mockRtmSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quick emojis', () => {
    render(<EmojiReactions rtmSendMessage={mockRtmSendMessage} />);
    expect(screen.getByLabelText('Send ❤️ reaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Send 😂 reaction')).toBeInTheDocument();
  });

  it('calls handleTriggerEmoji when a quick emoji is clicked', async () => {
    const { useEmojiReactions } = await import(
      '@/features/watch-party/interactions/hooks/use-emoji-reactions'
    );
    const mockHandleTrigger = vi.fn();
    vi.mocked(useEmojiReactions).mockReturnValue({
      showPicker: false,
      setShowPicker: vi.fn(),
      pickerRef: { current: null },
      handleTriggerEmoji: mockHandleTrigger,
    });

    render(<EmojiReactions rtmSendMessage={mockRtmSendMessage} />);
    fireEvent.click(screen.getByLabelText('Send ❤️ reaction'));
    expect(mockHandleTrigger).toHaveBeenCalledWith('❤️');
  });
});

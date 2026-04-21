import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchPartyChat } from '@/features/watch-party/chat/components/WatchPartyChat';
import type { ChatMessage } from '@/features/watch-party/room/types';

// Mock emoji-picker-react with functional onEmojiClick support
vi.mock('emoji-picker-react', () => ({
  default: ({
    onEmojiClick,
  }: {
    onEmojiClick?: (emoji: { emoji: string }) => void;
  }) => (
    <div data-testid="emoji-picker">
      <button
        data-testid="emoji-😊"
        onClick={() => onEmojiClick?.({ emoji: '😊' })}
        type="button"
      >
        😊
      </button>
    </div>
  ),
  EmojiStyle: {},
  Theme: {},
}));

// Mock next/dynamic to render components synchronously in tests
vi.mock('next/dynamic', () => ({
  default: (_importFn: unknown, _opts?: unknown) => {
    return function EmojiPickerWrapper({
      onEmojiClick,
    }: {
      onEmojiClick?: (emoji: { emoji: string }) => void;
    }) {
      return (
        <div data-testid="emoji-picker">
          <button
            data-testid="emoji-😊"
            onClick={() => onEmojiClick?.({ emoji: '😊' })}
            type="button"
          >
            😊
          </button>
        </div>
      );
    };
  },
}));

describe('WatchPartyChat', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      roomId: 'room-1',
      userId: 'user-1',
      userName: 'User One',
      content: 'Hello everyone!',
      timestamp: Date.now() - 5000,
      isSystem: false,
    },
    {
      id: '2',
      roomId: 'room-1',
      userId: 'user-2',
      userName: 'User Two',
      content: 'Hi there!',
      timestamp: Date.now() - 3000,
      isSystem: false,
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    onSendMessage: vi.fn(),
    currentUserId: 'user-1',
    typingUsers: [],
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render chat messages', () => {
      render(<WatchPartyChat {...defaultProps} />);

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should render user names for non-current users', () => {
      render(<WatchPartyChat {...defaultProps} />);

      // Only non-current user names are shown
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    it('should render message input', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeInTheDocument();
    });

    it('should render emoji button', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const emojiButton = screen.getByTitle('addEmoji');
      expect(emojiButton).toBeInTheDocument();
    });
  });

  describe('clickable links', () => {
    it('should render HTTP links as clickable', () => {
      const messagesWithLink: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'Check out http://example.com',
        },
      ];

      render(<WatchPartyChat {...defaultProps} messages={messagesWithLink} />);

      const link = screen.getByRole('link', { name: /example\.com/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'http://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render HTTPS links as clickable', () => {
      const messagesWithLink: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'Visit https://secure.example.com',
        },
      ];

      render(<WatchPartyChat {...defaultProps} messages={messagesWithLink} />);

      const link = screen.getByRole('link', {
        name: /secure\.example\.com/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://secure.example.com');
    });

    it('should render multiple links in one message', () => {
      const messagesWithLinks: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'Check http://first.com and https://second.com',
        },
      ];

      render(<WatchPartyChat {...defaultProps} messages={messagesWithLinks} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'http://first.com');
      expect(links[1]).toHaveAttribute('href', 'https://second.com');
    });

    it('should render external link icon for links', () => {
      const messagesWithLink: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'https://example.com',
        },
      ];

      const { container } = render(
        <WatchPartyChat {...defaultProps} messages={messagesWithLink} />,
      );

      // Check for ExternalLink icon (lucide-react)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render plain text without links normally', () => {
      const messagesWithoutLinks: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'Just plain text here',
        },
      ];

      render(
        <WatchPartyChat {...defaultProps} messages={messagesWithoutLinks} />,
      );

      expect(screen.getByText('Just plain text here')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should handle mixed text and links', () => {
      const messagesWithMixedContent: ChatMessage[] = [
        {
          ...mockMessages[0],
          content: 'Before link https://example.com after link',
        },
      ];

      render(
        <WatchPartyChat
          {...defaultProps}
          messages={messagesWithMixedContent}
        />,
      );

      expect(screen.getByText(/Before link/)).toBeInTheDocument();
      expect(screen.getByText(/after link/)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /example\.com/i }),
      ).toBeInTheDocument();
    });
  });

  describe('typing indicators', () => {
    it('should not show typing indicator when no one is typing', () => {
      render(<WatchPartyChat {...defaultProps} typingUsers={[]} />);

      expect(screen.queryByText(/isTyping/i)).not.toBeInTheDocument();
    });

    it('should show single user typing', () => {
      const typingUsers = [{ userId: 'user-2', userName: 'User Two' }];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/isTyping/i)).toBeInTheDocument();
    });

    it('should show two users typing', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/twoTyping/i)).toBeInTheDocument();
    });

    it('should show three users typing', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
        { userId: 'user-4', userName: 'User Four' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/threeTyping/i)).toBeInTheDocument();
    });

    it('should show "X people are typing" for more than 3 users', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
        { userId: 'user-4', userName: 'User Four' },
        { userId: 'user-5', userName: 'User Five' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/manyTyping/i)).toBeInTheDocument();
    });

    it('should show animated dots for typing indicator', () => {
      const typingUsers = [{ userId: 'user-2', userName: 'User Two' }];

      const { container } = render(
        <WatchPartyChat {...defaultProps} typingUsers={typingUsers} />,
      );

      // Check for animated dots (they should have animation classes)
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('typing indicators', () => {
    it('should not show typing indicator when no one is typing', () => {
      render(<WatchPartyChat {...defaultProps} typingUsers={[]} />);

      expect(screen.queryByText(/isTyping/i)).not.toBeInTheDocument();
    });

    it('should show single user typing', () => {
      const typingUsers = [{ userId: 'user-2', userName: 'User Two' }];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/isTyping/i)).toBeInTheDocument();
    });

    it('should show two users typing', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/twoTyping/i)).toBeInTheDocument();
    });

    it('should show three users typing', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
        { userId: 'user-4', userName: 'User Four' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/threeTyping/i)).toBeInTheDocument();
    });

    it('should show "X people are typing" for more than 3 users', () => {
      const typingUsers = [
        { userId: 'user-2', userName: 'User Two' },
        { userId: 'user-3', userName: 'User Three' },
        { userId: 'user-4', userName: 'User Four' },
        { userId: 'user-5', userName: 'User Five' },
      ];

      render(<WatchPartyChat {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByText(/manyTyping/i)).toBeInTheDocument();
    });

    it('should show animated dots for typing indicator', () => {
      const typingUsers = [{ userId: 'user-2', userName: 'User Two' }];

      const { container } = render(
        <WatchPartyChat {...defaultProps} typingUsers={typingUsers} />,
      );

      // Check for animated dots (they should have animation classes)
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('additional coverage tests', () => {
    it('should render empty state when no messages', () => {
      render(<WatchPartyChat {...defaultProps} messages={[]} />);

      expect(screen.getByText('noMessages')).toBeInTheDocument();
      expect(screen.getByText(/beFirst/)).toBeInTheDocument();
    });

    it('should show message headers when messages are from different users or have time gap', () => {
      const messagesWithGap: ChatMessage[] = [
        {
          id: '1',
          roomId: 'room-1',
          userId: 'user-1',
          userName: 'User One',
          content: 'First message',
          timestamp: Date.now() - 120000, // 2 minutes ago
          isSystem: false,
        },
        {
          id: '2',
          roomId: 'room-1',
          userId: 'user-1',
          userName: 'User One',
          content: 'Second message after gap',
          timestamp: Date.now(), // now
          isSystem: false,
        },
      ];

      render(<WatchPartyChat {...defaultProps} messages={messagesWithGap} />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message after gap')).toBeInTheDocument();
    });

    it('should render system messages differently', () => {
      const messagesWithSystem: ChatMessage[] = [
        {
          id: '1',
          roomId: 'room-1',
          userId: 'system',
          userName: 'System',
          content: 'User joined the room',
          timestamp: Date.now(),
          isSystem: true,
        },
      ];

      render(
        <WatchPartyChat {...defaultProps} messages={messagesWithSystem} />,
      );

      expect(screen.getByText('User joined the room')).toBeInTheDocument();
    });

    it('should disable send button when input is empty', () => {
      render(<WatchPartyChat {...defaultProps} />);

      // Filter to get the submit button (not the emoji button)
      const submitButton = screen
        .getAllByRole('button')
        .find((btn) => (btn as HTMLButtonElement).type === 'submit');
      expect(submitButton).toBeDisabled();
    });

    it('should work without typing callbacks', () => {
      const propsWithoutTyping = {
        ...defaultProps,
        onTypingStart: undefined,
        onTypingStop: undefined,
      };

      render(<WatchPartyChat {...propsWithoutTyping} />);

      const input = screen.getByPlaceholderText('placeholder');
      expect(input).toBeInTheDocument();
    });
  });

  describe('typing indicator behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call onTypingStart when user types', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'H' } });

      expect(defaultProps.onTypingStart).toHaveBeenCalled();
    });

    it('should call onTypingStop when input is cleared', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.change(input, { target: { value: '' } });

      expect(defaultProps.onTypingStop).toHaveBeenCalled();
    });

    it('should auto-stop typing after 3 seconds', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'H' } });

      expect(defaultProps.onTypingStart).toHaveBeenCalled();

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      expect(defaultProps.onTypingStop).toHaveBeenCalled();
    });

    it('should reset timeout when user continues typing', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');

      // Type first character
      fireEvent.change(input, { target: { value: 'H' } });

      // Wait 2 seconds
      vi.advanceTimersByTime(2000);

      // Type another character (should reset timeout)
      fireEvent.change(input, { target: { value: 'Hi' } });

      // Wait another 2 seconds (total 4 seconds from first char, but only 2 from last char)
      vi.advanceTimersByTime(2000);

      // Should not have called onTypingStop yet (timeout was reset)
      expect(defaultProps.onTypingStop).not.toHaveBeenCalled();

      // Wait 1 more second (3 seconds from last char)
      vi.advanceTimersByTime(1000);

      expect(defaultProps.onTypingStop).toHaveBeenCalled();
    });

    it('should call onTypingStop when sending message', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'Hello' } });

      const submitButton = screen
        .getAllByRole('button')
        .find((btn) => (btn as HTMLButtonElement).type === 'submit');
      fireEvent.click(submitButton!);

      expect(defaultProps.onTypingStop).toHaveBeenCalled();
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello');
    });

    it('should send message when Enter key is pressed', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Hello');
      expect(input).toHaveValue('');
    });

    it('should not send message when Shift+Enter is pressed', () => {
      render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
      expect(input).toHaveValue('Hello');
    });

    it('should cleanup typing timeout on unmount', () => {
      const { unmount } = render(<WatchPartyChat {...defaultProps} />);

      const input = screen.getByPlaceholderText('placeholder');
      fireEvent.change(input, { target: { value: 'H' } });

      unmount();

      expect(defaultProps.onTypingStop).toHaveBeenCalled();
    });
  });

  describe('emoji picker', () => {
    it('should show emoji picker when emoji button is clicked', async () => {
      const user = userEvent.setup();
      render(<WatchPartyChat {...defaultProps} />);

      const emojiButton = screen.getByTitle('addEmoji');
      await user.click(emojiButton);

      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });

    it('should close emoji picker when clicking outside', async () => {
      const user = userEvent.setup();
      render(<WatchPartyChat {...defaultProps} />);

      const emojiButton = screen.getByTitle('addEmoji');
      await user.click(emojiButton);

      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();

      // Click outside
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
      });
    });

    it('should close emoji picker when sending message', async () => {
      const user = userEvent.setup();
      render(<WatchPartyChat {...defaultProps} />);

      const emojiButton = screen.getByTitle('addEmoji');
      await user.click(emojiButton);

      const input = screen.getByPlaceholderText('placeholder');
      await user.type(input, 'Hello');

      const submitButton = screen
        .getAllByRole('button')
        .find((btn) => (btn as HTMLButtonElement).type === 'submit');
      await user.click(submitButton!);

      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
    });

    it('should add emoji to input when emoji is selected', async () => {
      const user = userEvent.setup();
      render(<WatchPartyChat {...defaultProps} />);

      const emojiButton = screen.getByTitle('addEmoji');
      await user.click(emojiButton);

      const emojiToClick = screen.getByTestId('emoji-😊');
      await user.click(emojiToClick);

      const input = screen.getByPlaceholderText('placeholder');
      expect(input).toHaveValue('😊');
    });
  });
});

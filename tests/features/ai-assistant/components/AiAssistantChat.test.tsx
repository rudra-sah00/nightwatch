import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantChat } from '@/features/ai-assistant/components/AiAssistantChat';
import { apiFetch } from '@/lib/fetch';

// Mock apiFetch
vi.mock('@/lib/fetch', () => ({
  apiFetch: vi.fn(),
}));

// Mock router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components
vi.mock('@/features/ai-assistant/components/AiLandingView', () => ({
  AiLandingView: ({
    onSendMessage,
    setInputValue,
    inputValue,
    isLoading,
  }: {
    onSendMessage: (e: React.FormEvent) => void;
    setInputValue: (value: string) => void;
    inputValue: string;
    isLoading: boolean;
  }) => (
    <div data-testid="landing-view">
      <input
        data-testid="landing-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isLoading}
      />
      <button
        type="button"
        data-testid="landing-send"
        onClick={(e) => onSendMessage(e)}
        disabled={isLoading}
      >
        Send
      </button>
    </div>
  ),
}));

vi.mock('@/features/ai-assistant/components/AiMessageBubble', () => ({
  AiMessageBubble: vi.fn(
    (props: {
      message: { role: string; content: string };
      onPlayMedia?: (url: string, type: string) => void;
    }) => {
      return (
        <div data-testid="message-bubble">
          {props.message.role}: {props.message.content}
          {props.onPlayMedia && (
            <button
              type="button"
              data-testid={`play-btn-${props.message.role}`}
              onClick={() => props.onPlayMedia?.('test-url', 'video')}
            >
              Play
            </button>
          )}
        </div>
      );
    },
  ),
}));

vi.mock('@/features/ai-assistant/components/MediaModal', () => ({
  MediaModal: ({
    isOpen,
    url,
    type,
    onClose,
  }: {
    isOpen: boolean;
    url: string | null;
    type: string | null;
    onClose: () => void;
  }) => (
    <div
      data-testid="media-modal"
      data-is-open={isOpen}
      data-url={url}
      data-type={type}
    >
      <button
        type="button"
        data-testid="media-modal-close-button"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  ),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Send: () => <div data-testid="send-icon" />,
}));

// Mock auth provider
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { name: 'Rudra', profilePhoto: '/profile.jpg' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe('AiAssistantChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders landing view initially', () => {
    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );
    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
  });

  it('transitions to chat view and handles SSE stream', async () => {
    const chunks = [
      'data: {"type": "token", "text": "Hello"}\n\n',
      'data: {"type": "token", "text": " world"}\n\n',
      'data: [DONE]\n\n',
    ];
    let i = 0;

    const mockReader = {
      read: vi.fn(async () => {
        if (i < chunks.length) {
          return { value: new TextEncoder().encode(chunks[i++]), done: false };
        }
        return { value: undefined, done: true };
      }),
      releaseLock: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(apiFetch).mockResolvedValue(mockResponse as unknown as Response);

    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );

    const input = screen.getByTestId('landing-input');
    const sendButton = screen.getByTestId('landing-send');

    fireEvent.change(input, { target: { value: 'Hi' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Should show messages
    await waitFor(
      () => {
        const bubbles = screen.queryAllByTestId('message-bubble');
        const assistantMessage = bubbles.find((m) =>
          m.textContent?.toLowerCase().includes('hello world'),
        );
        expect(assistantMessage).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('handles SSE state updates and signals', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => {
          const chunks = [
            new TextEncoder().encode(
              'data: {"type": "update", "node": "media", "data": {"playData": {"id": "m1"}}}\n\n',
            ),
            new TextEncoder().encode('data: [DONE]\n\n'),
          ];
          let i = 0;
          return {
            read: () => {
              if (i < chunks.length) {
                return Promise.resolve({ value: chunks[i++], done: false });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      },
    };

    vi.mocked(apiFetch).mockResolvedValue(mockResponse as unknown as Response);

    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('landing-input'), {
      target: { value: 'Play Batman' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('landing-send'));
    });

    // Verification of internal state is harder via DOM,
    // Check that loading indicator is gone
    await waitFor(() => {
      expect(
        screen.queryByTestId('ai-loading-indicator'),
      ).not.toBeInTheDocument();
    });
  });

  it('toggles media modal via message bubble onPlayMedia', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => {
          const chunks = [
            new TextEncoder().encode(
              'data: {"type": "token", "text": "Here is a video."}\n\n',
            ),
            new TextEncoder().encode('data: [DONE]\n\n'),
          ];
          let i = 0;
          return {
            read: () => {
              if (i < chunks.length) {
                return Promise.resolve({ value: chunks[i++], done: false });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      },
    };
    vi.mocked(apiFetch).mockResolvedValue(mockResponse as unknown as Response);

    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );

    // Add a message so bubble renders
    fireEvent.change(screen.getByTestId('landing-input'), {
      target: { value: 'play' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('landing-send'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('play-btn-assistant')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('play-btn-assistant'));

    await waitFor(() => {
      expect(screen.getByTestId('media-modal')).toHaveAttribute(
        'data-is-open',
        'true',
      );
      expect(screen.getByTestId('media-modal')).toHaveAttribute(
        'data-url',
        'test-url',
      );
      expect(screen.getByTestId('media-modal')).toHaveAttribute(
        'data-type',
        'video',
      );
    });

    // Close modal
    fireEvent.click(screen.getByTestId('media-modal-close-button'));
    await waitFor(() => {
      expect(screen.getByTestId('media-modal')).toHaveAttribute(
        'data-is-open',
        'false',
      );
    });
  });

  it('updates input value in chat view', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => {
          const chunks = [
            new TextEncoder().encode(
              'data: {"type": "token", "text": "Hello"}\n\n',
            ),
            new TextEncoder().encode('data: [DONE]\n\n'),
          ];
          let i = 0;
          return {
            read: () => {
              if (i < chunks.length) {
                return Promise.resolve({ value: chunks[i++], done: false });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      },
    };
    vi.mocked(apiFetch).mockResolvedValue(mockResponse as unknown as Response);

    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );

    // Go to chat view by sending a message
    fireEvent.change(screen.getByTestId('landing-input'), {
      target: { value: 'test' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('landing-send'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Message Watch Rudra AI...');
    fireEvent.change(input, { target: { value: 'new message' } });
    expect(input).toHaveValue('new message');
  });

  it('handles "play" and "watch-party" signals from SSE', async () => {
    mockPush.mockClear();

    const chunks = [
      'data: {"type": "update", "node": "respond", "data": {"response": "Watching! __PLAY:{\\"id\\":\\"123\\" }__"}}\n\n',
      'data: {"type": "update", "node": "respond", "data": {"response": "Party! __WATCH_PARTY:{\\"id\\":\\"456\\" }__"}}\n\n',
      'data: [DONE]\n\n',
    ];
    let i = 0;
    const mockReader = {
      read: vi.fn(async () => {
        if (i < chunks.length) {
          return { value: new TextEncoder().encode(chunks[i++]), done: false };
        }
        return { value: undefined, done: true };
      }),
      releaseLock: vi.fn(),
    };
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    } as unknown as Response);

    const onSelectContent = vi.fn();
    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={onSelectContent}
      />,
    );
    fireEvent.change(screen.getByTestId('landing-input'), {
      target: { value: 'signal' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('landing-send'));
    });

    await waitFor(
      () => {
        expect(onSelectContent).toHaveBeenCalledWith('123', undefined, true);
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/watch-party/456?new=true');
      },
      { timeout: 5000 },
    );
  });

  it('handles stream errors gracefully', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));

    render(
      <AiAssistantChat
        isOpen={true}
        onClose={vi.fn()}
        onSelectContent={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('landing-input'), {
      target: { value: 'Error trigger' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('landing-send'));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Sorry, I'm having trouble connecting/i),
      ).toBeInTheDocument();
    });
  });
});

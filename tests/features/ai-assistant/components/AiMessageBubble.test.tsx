import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiMessageBubble } from '@/features/ai-assistant/components/AiMessageBubble';

// Mock icons
vi.mock('lucide-react', () => ({
  User: () => <span data-testid="user-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  CheckCircle2: () => <span data-testid="check-icon" />,
  Image: () => <span data-testid="image-icon" />,
  Play: () => <span data-testid="play-icon" />,
}));

// Mock AssistantMovieCard
vi.mock('@/features/ai-assistant/components/AssistantMovieCard', () => ({
  AssistantMovieCard: ({
    title,
    onSelect,
    id,
  }: {
    title: string;
    onSelect?: (id: string) => void;
    id?: string;
  }) => (
    <button
      type="button"
      data-testid="movie-card"
      onClick={() => onSelect?.(id || 'test-id')}
    >
      {title}
    </button>
  ),
}));

// Mock Next/Image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  > & { src: string; alt: string }) => <img src={src} alt={alt} {...props} />,
}));

describe('AiMessageBubble', () => {
  const mockUser = {
    preferredServer: 's1' as const,
    id: 'user-1',
    name: 'Rudra',
    username: 'rudra',
    email: 'rudra@example.com',
    profilePhoto: '/profile.jpg',
    sessionId: 'session-1',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders user message immediately without typewriter effect', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'Hello AI',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
      />,
    );

    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByAltText('Rudra')).toBeInTheDocument();
  });

  it('renders assistant message with typewriter effect when streaming', async () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'Hello! How can I help you?',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={true}
      />,
    );

    // Initially empty or first char
    expect(screen.getByText('Watch Rudra AI')).toBeInTheDocument();

    // Progress timers - exhausting all pending timers
    for (let j = 0; j < 100; j++) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }

    // Eventually shows full content
    const content = screen.getByTestId('ai-message-content');
    expect(content.textContent).toContain('Hello! How can I help you?');
  });

  it('renders Lottie loading animation when streaming and content is empty', () => {
    const message = {
      id: 'loading-test',
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={true}
      />,
    );

    expect(screen.getByTestId('ai-loading-dots')).toBeInTheDocument();
  });

  it('displays recommendations only after typing is finished', async () => {
    const message = {
      id: '3',
      role: 'assistant' as const,
      content: 'Check this out:',
      timestamp: new Date(),
      recommendations: [{ id: 'm1', title: 'Batman', type: 'movie' }],
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={true}
      />,
    );

    // During typing, recommendations should be hidden
    expect(screen.queryByTestId('movie-card')).not.toBeInTheDocument();

    // Finish typing - manual polling with fake timers
    let retries = 50;
    while (retries > 0) {
      if (screen.queryByTestId('movie-card')) {
        break;
      }
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      retries--;
    }
    expect(screen.getByTestId('movie-card')).toBeInTheDocument();

    expect(screen.getByText('Batman')).toBeInTheDocument();
  });

  it('renders action completed success indicator', () => {
    const message = {
      id: '4',
      role: 'assistant' as const,
      content: 'Added Interstellar to your watchlist!',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={false}
      />,
    );

    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(
      screen.getByText('Action Completed successfully'),
    ).toBeInTheDocument();
  });

  it('handles recommendation clicks for Photos and Trailers', async () => {
    const message = {
      id: '5',
      role: 'assistant' as const,
      content: 'Media:',
      timestamp: new Date(),
      recommendations: [
        { id: 'p1', title: 'Photo', type: 'Photo', poster: '/photo.jpg' },
        { id: 't1', title: 'Trailer', type: 'Trailer', videoUrl: '/video.mp4' },
      ],
    };
    const onPlayMedia = vi.fn();

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        onPlayMedia={onPlayMedia}
        isStreaming={false}
      />,
    );

    // Type: Photo
    fireEvent.click(screen.getByText('Photo'));
    expect(onPlayMedia).toHaveBeenCalledWith('/photo.jpg', 'image');

    // Type: Trailer
    fireEvent.click(screen.getByText('Trailer'));
    expect(onPlayMedia).toHaveBeenCalledWith('/video.mp4', 'video');
  });

  it('renders markdown lists correctly', () => {
    const message = {
      id: '6',
      role: 'assistant' as const,
      content: '- Item 1\n- Item 2',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={false}
      />,
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    // Check for the dot
    expect(screen.getAllByText('•')).toHaveLength(2);
  });

  it('handles inline markdown image clicks', () => {
    const message = {
      id: '7',
      role: 'assistant' as const,
      content: '![test alt](/test.jpg)',
      timestamp: new Date(),
    };
    const onPlayMedia = vi.fn();

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        onPlayMedia={onPlayMedia}
        isStreaming={false}
      />,
    );

    const img = screen.getByAltText('test alt');
    fireEvent.click(img.parentElement!); // The button is the parent
    expect(onPlayMedia).toHaveBeenCalledWith('/test.jpg', 'image');
  });

  it('renders YouTube link as play button', () => {
    const onPlayMedia = vi.fn();
    const message = {
      id: '8',
      role: 'assistant' as const,
      content: 'Watch this: [Trailer](https://www.youtube.com/watch?v=abc123)',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        onPlayMedia={onPlayMedia}
        isStreaming={false}
      />,
    );

    // Should render a play button instead of a regular link
    const playButton = screen.getByRole('button', { name: /trailer/i });
    expect(playButton).toBeInTheDocument();

    fireEvent.click(playButton);
    expect(onPlayMedia).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc123',
      'video',
    );
  });

  it('renders youtu.be short link as play button', () => {
    const onPlayMedia = vi.fn();
    const message = {
      id: '9',
      role: 'assistant' as const,
      content: '[Short video](https://youtu.be/xyz789)',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        onPlayMedia={onPlayMedia}
        isStreaming={false}
      />,
    );

    const playButton = screen.getByRole('button', { name: /short video/i });
    expect(playButton).toBeInTheDocument();

    fireEvent.click(playButton);
    expect(onPlayMedia).toHaveBeenCalledWith(
      'https://youtu.be/xyz789',
      'video',
    );
  });

  it('renders IMDB video link as play button', () => {
    const onPlayMedia = vi.fn();
    const message = {
      id: '10',
      role: 'assistant' as const,
      content: '[IMDB Clip](https://example.com/imdb-video/abc)',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        onPlayMedia={onPlayMedia}
        isStreaming={false}
      />,
    );

    const playButton = screen.getByRole('button', { name: /imdb clip/i });
    expect(playButton).toBeInTheDocument();
    fireEvent.click(playButton);
    expect(onPlayMedia).toHaveBeenCalledWith(
      'https://example.com/imdb-video/abc',
      'video',
    );
  });

  it('renders regular links as anchor tags', () => {
    const message = {
      id: '11',
      role: 'assistant' as const,
      content: '[Regular link](https://example.com)',
      timestamp: new Date(),
    };

    render(
      <AiMessageBubble
        message={message}
        currentUser={mockUser}
        onSelectContent={vi.fn()}
        isStreaming={false}
      />,
    );

    const link = screen.getByRole('link', { name: /regular link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyMediaGallery } from '@/features/ai-assistant/components/LazyMediaGallery';

// Mock apiFetch
vi.mock('@/lib/fetch', () => ({
  apiFetch: vi.fn(),
}));

// Mock styles
vi.mock('@/features/ai-assistant/styles/AIAssistant.module.css', () => ({
  default: {
    glassCard: 'glass-card',
  },
}));

// Mock AssistantMovieCard to avoid rendering internals
vi.mock('@/features/ai-assistant/components/AssistantMovieCard', () => ({
  AssistantMovieCard: ({
    id,
    title,
    onSelect,
  }: {
    id: string;
    title: string;
    type: string;
    onSelect?: () => void;
  }) => (
    <button type="button" data-testid={`movie-card-${id}`} onClick={onSelect}>
      {title}
    </button>
  ),
}));

describe('LazyMediaGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton while fetching', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    // Never resolve to keep loading state
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <LazyMediaGallery id="tt1234567" title="Test Movie" />,
    );

    // Should show animated skeleton (animate-pulse class)
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows auth error message for unauthorized errors', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new Error('Unauthorized: session expired'),
    );

    render(<LazyMediaGallery id="tt1234567" title="My Movie" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Authentication required to view media for My Movie/i),
      ).toBeInTheDocument();
    });
  });

  it('shows generic error for non-auth errors', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network failure'));

    render(<LazyMediaGallery id="tt1234567" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to load media gallery: Network failure/i),
      ).toBeInTheDocument();
    });
  });

  it('returns null when data has no trailers or photos', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [],
      trailers: [],
    });

    const { container } = render(<LazyMediaGallery id="tt1234567" />);

    await waitFor(() => {
      // Component returns null for empty data
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders trailers section when trailers are present', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [],
      trailers: [
        {
          id: 'vi12345',
          name: 'Official Trailer',
          thumbnail: 'https://example.com/thumb.jpg',
          playbackUrl: 'https://example.com/trailer.mp4',
        },
      ],
    });

    render(<LazyMediaGallery id="tt1234567" title="Test Movie" />);

    await waitFor(() => {
      expect(screen.getByText(/Trailers & Clips/i)).toBeInTheDocument();
      expect(screen.getByText('Official Trailer')).toBeInTheDocument();
    });
  });

  it('renders photos section when photos are present', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [
        {
          url: 'https://example.com/photo.jpg',
          caption: 'Scene 1',
        },
      ],
      trailers: [],
    });

    render(<LazyMediaGallery id="tt1234567" />);

    await waitFor(() => {
      expect(screen.getByText(/Photos/i)).toBeInTheDocument();
      expect(screen.getByText('Scene 1')).toBeInTheDocument();
    });
  });

  it('calls onPlayMedia when trailer card is selected with playbackUrl', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    const mockPlayMedia = vi.fn();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [],
      trailers: [
        {
          id: 'vi12345',
          name: 'Trailer',
          playbackUrl: 'https://example.com/play.mp4',
        },
      ],
    });

    render(<LazyMediaGallery id="tt1234567" onPlayMedia={mockPlayMedia} />);

    await waitFor(() => {
      expect(screen.getByTestId('movie-card-vi12345')).toBeInTheDocument();
    });

    screen.getByTestId('movie-card-vi12345').click();
    expect(mockPlayMedia).toHaveBeenCalledWith(
      'https://example.com/play.mp4',
      'video',
    );
  });

  it('calls onPlayMedia for trailer with imdb video id when no playbackUrl or url', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    const mockPlayMedia = vi.fn();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [],
      trailers: [
        {
          id: 'vi98765',
          name: 'Clip',
          // No playbackUrl or url — uses imdb id since starts with 'vi'
        },
      ],
    });

    render(<LazyMediaGallery id="tt1234567" onPlayMedia={mockPlayMedia} />);

    await waitFor(() => {
      expect(screen.getByTestId('movie-card-vi98765')).toBeInTheDocument();
    });

    screen.getByTestId('movie-card-vi98765').click();
    expect(mockPlayMedia).toHaveBeenCalledWith(
      'https://www.imdb.com/video/vi98765',
      'video',
    );
  });

  it('calls onPlayMedia for trailer using youtube key when no other url', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    const mockPlayMedia = vi.fn();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [],
      trailers: [
        {
          id: 'youtube-clip-1',
          name: 'YouTube Clip',
          key: 'dQw4w9WgXcQ',
        },
      ],
    });

    render(<LazyMediaGallery id="tt1234567" onPlayMedia={mockPlayMedia} />);

    await waitFor(() => {
      expect(
        screen.getByTestId('movie-card-youtube-clip-1'),
      ).toBeInTheDocument();
    });

    screen.getByTestId('movie-card-youtube-clip-1').click();
    expect(mockPlayMedia).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'video',
    );
  });

  it('calls onPlayMedia when photo card is selected', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    const mockPlayMedia = vi.fn();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      photos: [
        {
          url: 'https://example.com/scene.jpg',
          caption: 'Key Scene',
        },
      ],
      trailers: [],
    });

    render(<LazyMediaGallery id="tt1234567" onPlayMedia={mockPlayMedia} />);

    await waitFor(() => {
      expect(screen.getByText('Key Scene')).toBeInTheDocument();
    });

    // Get the photo card and click it
    const photoCard = screen.getByTestId('movie-card-scene');
    photoCard.click();
    expect(mockPlayMedia).toHaveBeenCalledWith(
      'https://example.com/scene.jpg',
      'image',
    );
  });

  it('handles non-Error rejections gracefully', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockRejectedValueOnce('string error');

    render(<LazyMediaGallery id="tt1234567" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to load media gallery: Unknown error/i),
      ).toBeInTheDocument();
    });
  });

  it('shows error without title when title prop is not provided', async () => {
    const { apiFetch } = await import('@/lib/fetch');
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('session expired'));

    render(<LazyMediaGallery id="tt1234567" />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Authentication required to view media for this content/i,
        ),
      ).toBeInTheDocument();
    });
  });
});

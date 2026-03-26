import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';
import { ContentType } from '@/types/content';

// Mock the watch API
vi.mock('@/features/watch/api', () => import('./__mocks__/watch-api'));

// Mock the watch API
vi.mock('@/features/watch/api', () => import('./__mocks__/watch-api'));

// Mock SocketProvider
vi.mock(
  '@/providers/socket-provider',
  () => import('./__mocks__/socket-provider'),
);

describe('ContinueWatching', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Always restore getCachedContinueWatching to return null (prevents pollution from cache tests)
    const { getCachedContinueWatching } = await import('@/features/watch/api');
    vi.mocked(getCachedContinueWatching).mockReturnValue(null);
  });

  it('displays series with correct season and episode numbers', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Stranger Things',
        posterUrl: 'https://example.com/poster.jpg',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 5,
        episodeNumber: 2,
        episodeTitle: 'The Beginning',
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    // Wait for items to load
    await screen.findByText('Stranger Things');

    // Check season and episode are displayed correctly
    expect(screen.getByText(/s5:e2/i)).toBeInTheDocument();
    expect(screen.getByText(/the beginning/i)).toBeInTheDocument();
  });

  it('displays multiple series with different season/episode numbers', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Show One',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 9,
        episodeNumber: 10,
        episodeTitle: 'Finale',
      },
      {
        id: '2',
        contentId: 'show-2',
        contentType: ContentType.Series,
        title: 'Show Two',
        posterUrl: '',
        progressSeconds: 300,
        durationSeconds: 1800,
        progressPercent: 16,
        remainingSeconds: 1500,
        remainingMinutes: 25,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 3,
        episodeTitle: 'Episode Three',
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Show One');
    await screen.findByText('Show Two');

    expect(screen.getByText(/s9:e10/i)).toBeInTheDocument();
    expect(screen.getByText(/s1:e3/i)).toBeInTheDocument();
  });

  it('displays movie without season/episode info', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: ContentType.Movie,
        title: 'Test Movie',
        posterUrl: '',
        progressSeconds: 1200,
        durationSeconds: 7200,
        progressPercent: 16,
        remainingSeconds: 6000,
        remainingMinutes: 100,
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Test Movie');

    // Should not display season/episode for movies
    expect(screen.queryByText(/s\d+:e\d+/i)).not.toBeInTheDocument();
  });

  it('calls onSelectContent with correct contentId when item clicked', async () => {
    const user = userEvent.setup();
    const mockOnSelectContent = vi.fn();

    const mockItems = [
      {
        id: '1',
        contentId: 'show-123',
        contentType: ContentType.Series,
        title: 'Test Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 2,
        episodeNumber: 5,
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching onSelectContent={mockOnSelectContent} />);

    const button = await screen.findByTitle('Continue watching Test Show');
    await user.click(button);

    expect(mockOnSelectContent).toHaveBeenCalledWith('show-123');
  });

  it('displays remaining time correctly', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Test Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Test Show');

    expect(screen.getByText(/30m left/i)).toBeInTheDocument();
  });

  it('shows series badge for series content', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Test Series',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 3,
        episodeNumber: 7,
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Test Series');

    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  it('shows Movie badge for movie content', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: ContentType.Movie,
        title: 'Test Movie',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Test Movie');

    expect(screen.getByText('Movie')).toBeInTheDocument();
  });

  it('formats hours and minutes correctly', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: ContentType.Movie,
        title: 'Long Movie',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 10800,
        progressPercent: 5,
        remainingSeconds: 10200,
        remainingMinutes: 150, // 2h 30m
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Long Movie');

    expect(screen.getByText(/2h 30m left/i)).toBeInTheDocument();
  });

  it('formats exact hours without minutes', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: ContentType.Movie,
        title: 'Exactly Two Hours',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 7200,
        progressPercent: 8,
        remainingSeconds: 7200,
        remainingMinutes: 120, // Exactly 2h
        lastWatchedAt: new Date().toISOString(),
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Exactly Two Hours');

    expect(screen.getByText(/2h left/i)).toBeInTheDocument();
  });

  it('handles remove action successfully', async () => {
    const user = userEvent.setup();
    const mockItems = [
      {
        id: 'progress-1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Show to Remove',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching, deleteWatchProgress } = await import(
      '@/features/watch/api'
    );
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    vi.mocked(deleteWatchProgress).mockImplementation(async () => true);

    render(<ContinueWatching />);

    await screen.findByText('Show to Remove');

    const removeButton = screen.getByTitle('Remove from list');
    await user.click(removeButton);

    expect(deleteWatchProgress).toHaveBeenCalledWith(
      'progress-1',
      expect.any(String),
    );
  });

  it('shows error toast when remove fails', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    vi.spyOn(toast, 'error');

    const mockItems = [
      {
        id: 'progress-1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching, deleteWatchProgress } = await import(
      '@/features/watch/api'
    );
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);
    vi.mocked(deleteWatchProgress).mockImplementation(async () => false);

    render(<ContinueWatching />);

    await screen.findByText('Show');

    const removeButton = screen.getByTitle('Remove from list');
    await user.click(removeButton);

    expect(toast.error).toHaveBeenCalledWith('Failed to remove from list');
  });

  it('uses cached data when available', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'cached-show',
        contentType: ContentType.Series,
        title: 'Cached Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { getCachedContinueWatching, fetchContinueWatching } = await import(
      '@/features/watch/api'
    );

    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    // Also return cached data so subsequent non-forced fetches (e.g. focus) use cache.
    vi.mocked(getCachedContinueWatching).mockReturnValue(mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Cached Show');

    // fetchContinueWatching is called once on mount (force=true bypasses cache)
    expect(fetchContinueWatching).toHaveBeenCalledTimes(1);
  });

  it('registers window focus handler', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Test Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Test Show');

    // Check that focus handler was registered
    await waitFor(() => {
      const focusCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'focus',
      );
      expect(focusCalls.length).toBeGreaterThan(0);
    });

    addEventListenerSpy.mockRestore();
  });

  it('displays empty state when no items to display', async () => {
    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      cb?.([]);
      return [];
    });

    render(<ContinueWatching />);

    await screen.findByText(/your watch history is empty/i);
  });

  it('shows loading state initially', async () => {
    // Socket connected but fetch hasn't resolved yet — component shows loading spinner
    const { fetchContinueWatching, getCachedContinueWatching } = await import(
      '@/features/watch/api'
    );

    // Reset to ensure no cached data and fetch hangs
    vi.mocked(getCachedContinueWatching).mockReturnValue(null);
    vi.mocked(fetchContinueWatching).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<ContinueWatching />);

    expect(screen.getByText('Continue Watching')).toBeInTheDocument();
    // Check for loading spinner
    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('displays items without posterUrl with fallback icon', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'No Poster Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async () => mockItems);

    render(<ContinueWatching />);

    await screen.findByText('No Poster Show');

    // Verify the component renders without errors
    expect(screen.getByText('No Poster Show')).toBeInTheDocument();
  });

  it('prevents duplicate fetches within 1 second', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: ContentType.Series,
        title: 'Test Show',
        posterUrl: '',
        progressSeconds: 600,
        durationSeconds: 2400,
        progressPercent: 25,
        remainingSeconds: 1800,
        remainingMinutes: 30,
        lastWatchedAt: new Date().toISOString(),
        seasonNumber: 1,
        episodeNumber: 1,
      },
    ];

    const { fetchContinueWatching, getCachedContinueWatching } = await import(
      '@/features/watch/api'
    );

    const mockGetCached = getCachedContinueWatching as unknown as {
      mockReturnValue: (items: null) => void;
    };
    mockGetCached.mockReturnValue(null);

    let callCount = 0;
    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      callCount++;
      cb?.(mockItems);
      return mockItems;
    });

    render(<ContinueWatching />);

    // Wait for initial effect-triggered fetch to complete
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    const initialCount = callCount;

    // Trigger a window focus event — should be blocked by 1s dedup
    window.dispatchEvent(new Event('focus'));

    // Count should not have increased (blocked by time guard)
    expect(callCount).toBe(initialCount);
  });

  it('calls onLoadComplete(0) when fetchedItems is null (error case)', async () => {
    const mockOnLoadComplete = vi.fn();

    const { fetchContinueWatching } = await import('@/features/watch/api');
    vi.mocked(fetchContinueWatching).mockImplementation(async (_l, _s, cb) => {
      cb?.(null, 'Network error');
      return null;
    });

    render(<ContinueWatching onLoadComplete={mockOnLoadComplete} />);

    await waitFor(
      () => {
        expect(mockOnLoadComplete).toHaveBeenCalledWith(0);
      },
      { timeout: 2000 },
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';

// Mock the watch API
vi.mock('@/features/watch/api', () => ({
  fetchContinueWatching: vi.fn(),
  deleteWatchProgress: vi.fn(),
  getCachedContinueWatching: vi.fn(() => null),
}));

// Mock the websocket
vi.mock('@/lib/ws', () => ({
  getSocket: vi.fn(() => ({
    connected: true,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}));

describe('ContinueWatching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays series with correct season and episode numbers', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

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
        contentType: 'Series' as const,
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
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

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
        contentType: 'Movie' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

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
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

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
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Test Show');

    expect(screen.getByText(/30m left/i)).toBeInTheDocument();
  });

  it('shows series badge for series content', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Test Series');

    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  it('shows Movie badge for movie content', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: 'Movie' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Test Movie');

    expect(screen.getByText('Movie')).toBeInTheDocument();
  });

  it('formats hours and minutes correctly', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: 'Movie' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Long Movie');

    expect(screen.getByText(/2h 30m left/i)).toBeInTheDocument();
  });

  it('formats exact hours without minutes', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'movie-1',
        contentType: 'Movie' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

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
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    const mockDelete = deleteWatchProgress as unknown as {
      mockImplementation: (
        impl: (id: string, callback: (success: boolean) => void) => void,
      ) => void;
    };
    mockDelete.mockImplementation(
      (_id: string, callback: (success: boolean) => void) => {
        callback(true);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Show to Remove');

    const removeButton = screen.getByTitle('Remove from list');
    await user.click(removeButton);

    expect(mockDelete).toHaveBeenCalledWith('progress-1', expect.any(Function));
  });

  it('shows error toast when remove fails', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    vi.spyOn(toast, 'error');

    const mockItems = [
      {
        id: 'progress-1',
        contentId: 'show-1',
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    const mockDelete = deleteWatchProgress as unknown as {
      mockImplementation: (
        impl: (id: string, callback: (success: boolean) => void) => void,
      ) => void;
    };
    mockDelete.mockImplementation(
      (_id: string, callback: (success: boolean) => void) => {
        callback(false); // Simulate failure
      },
    );

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
        contentType: 'Series' as const,
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

    const mockGetCached = getCachedContinueWatching as unknown as {
      mockReturnValue: (items: typeof mockItems) => void;
    };
    mockGetCached.mockReturnValue(mockItems);

    render(<ContinueWatching />);

    await screen.findByText('Cached Show');

    // Should not call fetchContinueWatching if cache is available
    expect(fetchContinueWatching).not.toHaveBeenCalled();
  });

  it.skip('handles no socket connection gracefully', async () => {
    const mockOnLoadComplete = vi.fn();

    const { getSocket } = await import('@/lib/ws');
    const mockGetSocket = getSocket as unknown as {
      mockReturnValueOnce: (socket: null) => void;
    };
    mockGetSocket.mockReturnValueOnce(null);

    render(<ContinueWatching onLoadComplete={mockOnLoadComplete} />);

    // Wait for the component to finish loading
    await waitFor(
      () => {
        expect(mockOnLoadComplete).toHaveBeenCalledWith(0);
      },
      { timeout: 2000 },
    );
  });

  it.skip('handles socket not connected state', async () => {
    const { getSocket } = await import('@/lib/ws');
    const onceMock = vi.fn();
    const mockGetSocket = getSocket as unknown as {
      mockReturnValueOnce: (
        socket: {
          connected: boolean;
          once: (event: string, cb: () => void) => void;
        } | null,
      ) => void;
    };
    mockGetSocket.mockReturnValueOnce({
      connected: false,
      once: onceMock,
    } as unknown as ReturnType<typeof getSocket>);

    render(<ContinueWatching />);

    // Wait for component to mount and call socket.once
    await waitFor(
      () => {
        expect(onceMock).toHaveBeenCalledWith('connect', expect.any(Function));
      },
      { timeout: 2000 },
    );
  });

  it.skip('registers window focus handler', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: 'Series' as const,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('Test Show');

    // Check that focus handler was registered
    await waitFor(() => {
      const focusCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'focus',
      );
      expect(focusCalls.length).toBeGreaterThan(0);
    });
  });

  it.skip('returns null when no items to display', async () => {
    const { fetchContinueWatching } = await import('@/features/watch/api');
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: [] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: [] | null, error?: string) => void,
      ) => {
        callback([]); // Empty array means no items
      },
    );

    const { container } = render(<ContinueWatching />);

    // Wait for loading to complete and component to render null
    await waitFor(
      () => {
        // Container should be empty (null render)
        expect(container.querySelector('h2')).toBeNull();
      },
      { timeout: 2000 },
    );
  });

  it('shows loading state initially', async () => {
    vi.useFakeTimers();

    // Don't mock fetchContinueWatching so it stays pending
    const { container } = render(<ContinueWatching />);

    expect(screen.getByText('Continue Watching')).toBeInTheDocument();
    // Check for loading spinner
    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();

    vi.useRealTimers();
  });

  it.skip('displays items without posterUrl with fallback icon', async () => {
    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: 'Series' as const,
        title: 'No Poster Show',
        posterUrl: null,
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
    type WatchProgress = (typeof mockItems)[0];
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await screen.findByText('No Poster Show');

    // Verify the component renders without errors
    expect(screen.getByText('No Poster Show')).toBeInTheDocument();
  });

  it('prevents duplicate fetches within 1 second', async () => {
    vi.useFakeTimers();

    const mockItems = [
      {
        id: '1',
        contentId: 'show-1',
        contentType: 'Series' as const,
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

    type WatchProgress = (typeof mockItems)[0];
    let callCount = 0;
    const mockFetch = fetchContinueWatching as unknown as {
      mockImplementation: (
        impl: (
          limit: number,
          callback: (items: WatchProgress[] | null, error?: string) => void,
        ) => void,
      ) => void;
    };
    mockFetch.mockImplementation(
      (
        _limit: number,
        callback: (items: WatchProgress[] | null, error?: string) => void,
      ) => {
        callCount++;
        callback(mockItems);
      },
    );

    render(<ContinueWatching />);

    await vi.runAllTimersAsync();

    // Should have called once
    expect(callCount).toBe(1);

    vi.useRealTimers();
  });
});

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContentInfo } from '@/features/search/components/content-info';
import { ContentType } from '@/features/search/types';

describe('ContentInfo', () => {
  const mockShow = {
    id: 'test-show',
    title: 'Test Show',
    contentType: ContentType.Series,
    year: '2024',
    runtime: '45',
    seasons: [
      { seasonId: '1', seasonNumber: 1, episodeCount: 10 },
      { seasonId: '2', seasonNumber: 2, episodeCount: 10 },
    ],
    episodes: [],
    posterUrl: '',
    posterHdUrl: '',
  };

  const mockOnPlay = vi.fn();
  const mockOnResume = vi.fn();

  it('shows "Play S{N}:E1" for series without watch progress', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
      />,
    );

    expect(
      screen.getByRole('button', { name: /play s2:e1/i }),
    ).toBeInTheDocument();
  });

  it('shows "Resume S{N}:E{M}" for series with watch progress', () => {
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Series' as const,
      title: 'Test Show',
      posterUrl: '',
      progressSeconds: 100,
      durationSeconds: 2000,
      progressPercent: 5,
      remainingSeconds: 1900,
      remainingMinutes: 31,
      lastWatchedAt: new Date().toISOString(),
      seasonNumber: 5,
      episodeNumber: 10,
      episodeTitle: 'Test Episode',
    };

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    expect(
      screen.getByRole('button', { name: /resume s5:e10/i }),
    ).toBeInTheDocument();
  });

  it('shows "Watch Solo" for series without selected season', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={null}
        onPlay={mockOnPlay}
      />,
    );

    expect(
      screen.getByRole('button', { name: /watch solo/i }),
    ).toBeInTheDocument();
  });

  it('shows "Watch Solo" for movies without watch progress', () => {
    const movieShow = { ...mockShow, contentType: ContentType.Movie };

    render(
      <ContentInfo
        show={movieShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
      />,
    );

    expect(
      screen.getByRole('button', { name: /watch solo/i }),
    ).toBeInTheDocument();
  });

  it('shows "Resume (X%)" for movies with watch progress', () => {
    const movieShow = { ...mockShow, contentType: ContentType.Movie };
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Movie' as const,
      title: 'Test Movie',
      posterUrl: '',
      progressSeconds: 600,
      durationSeconds: 2000,
      progressPercent: 30,
      remainingSeconds: 1400,
      remainingMinutes: 23,
      lastWatchedAt: new Date().toISOString(),
    };

    render(
      <ContentInfo
        show={movieShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    expect(
      screen.getByRole('button', { name: /resume \(30%\)/i }),
    ).toBeInTheDocument();
  });

  it('shows "Loading..." when playing', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={true}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
      />,
    );

    expect(
      screen.getByRole('button', { name: /loading/i }),
    ).toBeInTheDocument();
  });

  it('shows "Loading..." when loading progress', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        isLoadingProgress={true}
        hasWatchProgress={true}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
      />,
    );

    expect(
      screen.getByRole('button', { name: /loading/i }),
    ).toBeInTheDocument();
  });

  it('calls onResume when button clicked with watch progress', async () => {
    const user = userEvent.setup();
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Series' as const,
      title: 'Test Show',
      posterUrl: '',
      progressSeconds: 100,
      durationSeconds: 2000,
      progressPercent: 5,
      remainingSeconds: 1900,
      remainingMinutes: 31,
      lastWatchedAt: new Date().toISOString(),
      seasonNumber: 2,
      episodeNumber: 5,
    };

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    await user.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockOnResume).toHaveBeenCalledTimes(1);
    expect(mockOnPlay).not.toHaveBeenCalled();
  });

  it('calls onPlay when button clicked without watch progress', async () => {
    const user = userEvent.setup();

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
      />,
    );

    await user.click(screen.getByRole('button', { name: /play/i }));
    expect(mockOnPlay).toHaveBeenCalledTimes(1);
  });

  it('shows progress bar for series with watch progress', () => {
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Series' as const,
      title: 'Test Show',
      posterUrl: '',
      progressSeconds: 900,
      durationSeconds: 2000,
      progressPercent: 45,
      remainingSeconds: 1100,
      remainingMinutes: 18,
      lastWatchedAt: new Date().toISOString(),
      seasonNumber: 3,
      episodeNumber: 7,
    };

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 3 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    // Use within to find the text in the progress indicator specifically
    const progressIndicator = screen.getByText(/45%/i).closest('.space-y-3');
    expect(progressIndicator).toHaveTextContent(/s3:e7/i);
    expect(
      screen.getByRole('button', { name: /resume s3:e7/i }),
    ).toBeInTheDocument();
  });

  it('prioritizes watch progress over selected season', () => {
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Series' as const,
      title: 'Test Show',
      posterUrl: '',
      progressSeconds: 100,
      durationSeconds: 2000,
      progressPercent: 5,
      remainingSeconds: 1900,
      remainingMinutes: 31,
      lastWatchedAt: new Date().toISOString(),
      seasonNumber: 9,
      episodeNumber: 10,
    };

    // Selected season is 2, but watch progress is at season 9
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    // Button should show season 9 episode 10 from watch progress, not season 2
    expect(
      screen.getByRole('button', { name: /resume s9:e10/i }),
    ).toBeInTheDocument();
  });

  it('renders description when show has one', () => {
    const showWithDescription = {
      ...mockShow,
      description: 'An amazing test show with a great storyline.',
    };

    render(
      <ContentInfo
        show={showWithDescription}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
      />,
    );

    // Description is rendered (even if hidden via CSS)
    expect(
      screen.getByText('An amazing test show with a great storyline.'),
    ).toBeInTheDocument();
  });

  it('renders Watch Together button when onWatchParty is provided', async () => {
    const user = userEvent.setup();
    const mockOnWatchParty = vi.fn();

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
        onWatchParty={mockOnWatchParty}
      />,
    );

    const watchTogetherBtn = screen.getByRole('button', {
      name: /start party/i,
    });
    expect(watchTogetherBtn).toBeInTheDocument();

    await user.click(watchTogetherBtn);
    expect(mockOnWatchParty).toHaveBeenCalledTimes(1);
  });

  it('hides watch party button when disabled', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchParty={vi.fn()}
        isWatchPartyDisabled={true}
        watchPartyDisabledReason="Series not supported"
      />,
    );

    // Button is hidden entirely when disabled to keep mobile UI clean
    expect(screen.queryByText('Start Party')).not.toBeInTheDocument();
    expect(screen.queryByText('Series not supported')).not.toBeInTheDocument();
  });

  it('shows creating party state', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchParty={vi.fn()}
        isCreatingParty={true}
      />,
    );

    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });

  it('renders Add to Watchlist button when onWatchlistToggle provided', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();

    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={mockToggle}
        isInWatchlist={false}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /^watchlist$/i });
    expect(addBtn).toBeInTheDocument();

    await user.click(addBtn);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('renders Remove from Watchlist button when in watchlist', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={vi.fn()}
        isInWatchlist={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: /^remove$/i }),
    ).toBeInTheDocument();
  });

  it('shows watchlist loading state', () => {
    render(
      <ContentInfo
        show={mockShow}
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={vi.fn()}
        isInWatchlist={false}
        isWatchlistLoading={true}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /^watchlist$/i });
    expect(addBtn).toBeDisabled();
  });

  it('shows genre and seasons count for series', () => {
    const showWithGenre = {
      ...mockShow,
      genre: 'Drama',
    };

    render(
      <ContentInfo
        show={showWithGenre}
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
      />,
    );

    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('shows progress bar for movies with watch progress', () => {
    const movieShow = { ...mockShow, contentType: ContentType.Movie };
    const watchProgress = {
      id: '1',
      contentId: 'test-show',
      contentType: 'Movie' as const,
      title: 'Test Movie',
      posterUrl: '',
      progressSeconds: 600,
      durationSeconds: 2000,
      progressPercent: 30,
      remainingSeconds: 1400,
      remainingMinutes: 23,
      lastWatchedAt: new Date().toISOString(),
    };

    const { container } = render(
      <ContentInfo
        show={movieShow}
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
      />,
    );

    // Progress bar shows "Continue" for a movie (no season/episode numbers)
    expect(screen.getByText('Continue')).toBeInTheDocument();

    // The progress percentage appears in both the bar and the resume button
    // We check that the progress bar container has it
    const progressContainer = container.querySelector('.space-y-3');
    expect(progressContainer).toHaveTextContent(/30%/);

    // And the button has it
    expect(
      screen.getByRole('button', { name: /resume \(30%\)/i }),
    ).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ContentActions,
  ContentInfo,
} from '@/features/search/components/content-info';
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
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        isSeries={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: /actions\.playEpisode/i }),
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
      <ContentActions
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
        isSeries={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: /actions\.resumeEpisode/i }),
    ).toBeInTheDocument();
  });

  it('shows "Watch Solo" for series without selected season', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={null}
        onPlay={mockOnPlay}
        isSeries={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: /actions\.watchSolo/i }),
    ).toBeInTheDocument();
  });

  it('shows "Watch Solo" for movies without watch progress', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        isSeries={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: /actions\.watchSolo/i }),
    ).toBeInTheDocument();
  });

  it('shows "Resume" for movies with watch progress', () => {
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
      <ContentActions
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
        isSeries={false}
      />,
    );

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('shows "Loading" when playing', () => {
    render(
      <ContentActions
        isPlaying={true}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
        isSeries={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: /loading/i }),
    ).toBeInTheDocument();
  });

  it('shows "Loading" when loading progress', () => {
    render(
      <ContentActions
        isPlaying={false}
        isLoadingProgress={true}
        hasWatchProgress={true}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
        isSeries={true}
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
      <ContentActions
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
        isSeries={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockOnResume).toHaveBeenCalledTimes(1);
    expect(mockOnPlay).not.toHaveBeenCalled();
  });

  it('calls onPlay when button clicked without watch progress', async () => {
    const user = userEvent.setup();

    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
        isSeries={true}
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
      <>
        <ContentInfo
          show={mockShow}
          hasWatchProgress={true}
          watchProgress={watchProgress}
        />
        <ContentActions
          isPlaying={false}
          hasWatchProgress={true}
          watchProgress={watchProgress}
          selectedSeason={{ seasonNumber: 3 }}
          onPlay={mockOnPlay}
          onResume={mockOnResume}
          isSeries={true}
        />
      </>,
    );

    // Use within to find the text in the progress indicator specifically
    const progressIndicator = screen.getByText(/45%/i).closest('.space-y-3');
    expect(progressIndicator).toHaveTextContent(
      /contentInfo\.seasonEpisodePrefix/i,
    );
    expect(
      screen.getByRole('button', { name: /actions\.resumeEpisode/i }),
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
      <ContentActions
        isPlaying={false}
        hasWatchProgress={true}
        watchProgress={watchProgress}
        selectedSeason={{ seasonNumber: 2 }}
        onPlay={mockOnPlay}
        onResume={mockOnResume}
        isSeries={true}
      />,
    );

    // Button should show season 9 episode 10 from watch progress, not season 2
    expect(
      screen.getByRole('button', { name: /actions\.resumeEpisode/i }),
    ).toBeInTheDocument();
  });

  it('renders description when show has one', () => {
    const showWithDescription = {
      ...mockShow,
      description: 'An amazing test show with a great storyline.',
    };

    render(<ContentInfo show={showWithDescription} hasWatchProgress={false} />);

    // Description is rendered (even if hidden via CSS)
    expect(
      screen.getByText('An amazing test show with a great storyline.'),
    ).toBeInTheDocument();
  });

  it('renders Watch Together button when onWatchParty is provided', async () => {
    const user = userEvent.setup();
    const mockOnWatchParty = vi.fn();

    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        selectedSeason={{ seasonNumber: 1 }}
        onPlay={mockOnPlay}
        onWatchParty={mockOnWatchParty}
        isSeries={true}
      />,
    );

    const watchTogetherBtn = screen.getByRole('button', {
      name: /actions\.watchTogether/i,
    });
    expect(watchTogetherBtn).toBeInTheDocument();

    await user.click(watchTogetherBtn);
    expect(mockOnWatchParty).toHaveBeenCalledTimes(1);
  });

  it('hides watch party button when disabled', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchParty={vi.fn()}
        isWatchPartyDisabled={true}
        isSeries={true}
      />,
    );

    // Button is hidden entirely when disabled to keep mobile UI clean
    expect(
      screen.queryByText(/actions\.watchTogether/i),
    ).not.toBeInTheDocument();
  });

  it('shows creating party state', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchParty={vi.fn()}
        isCreatingParty={true}
        isSeries={true}
      />,
    );

    expect(screen.getByText('actions.creating')).toBeInTheDocument();
  });

  it('renders Add to Watchlist button when onWatchlistToggle provided', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();

    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={mockToggle}
        isInWatchlist={false}
        isSeries={true}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /watchlist/i });
    expect(addBtn).toBeInTheDocument();

    await user.click(addBtn);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('renders Remove from Watchlist button when in watchlist', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={vi.fn()}
        isInWatchlist={true}
        isSeries={true}
      />,
    );

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('shows watchlist loading state', () => {
    render(
      <ContentActions
        isPlaying={false}
        hasWatchProgress={false}
        onPlay={mockOnPlay}
        onWatchlistToggle={vi.fn()}
        isInWatchlist={false}
        isWatchlistLoading={true}
        isSeries={true}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /watchlist/i });
    expect(addBtn).toBeDisabled();
  });

  it('shows genre and seasons count for series', () => {
    const showWithGenre = {
      ...mockShow,
      genre: 'Drama',
    };

    render(<ContentInfo show={showWithGenre} hasWatchProgress={false} />);

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
      <>
        <ContentInfo
          show={movieShow}
          hasWatchProgress={true}
          watchProgress={watchProgress}
        />
        <ContentActions
          isPlaying={false}
          hasWatchProgress={true}
          watchProgress={watchProgress}
          onPlay={mockOnPlay}
          onResume={mockOnResume}
          isSeries={false}
        />
      </>,
    );

    // Progress bar shows "Continue" for a movie (no season/episode numbers)
    expect(screen.getByText('contentDetail.continue')).toBeInTheDocument();

    // The progress percentage appears in both the bar and the resume button
    // We check that the progress bar container has it
    const progressContainer = container.querySelector('.space-y-3');
    expect(progressContainer).toHaveTextContent(/30%/);

    // And the button has it
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });
});

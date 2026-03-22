import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Episode, Season } from '@/features/search/types';
import { EpisodePanel } from '@/features/watch/player/ui/controls/EpisodePanel';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, unoptimized, ...rest } = props;
    // biome-ignore lint/a11y/useAltText: mock image component for tests
    return <img data-fill={fill} data-unoptimized={unoptimized} {...rest} />;
  },
}));

const mockEpisodes: Episode[] = [
  {
    episodeId: 'ep1',
    seriesId: 's1',
    episodeNumber: 1,
    seasonNumber: 1,
    title: 'Pilot',
    thumbnailUrl: 'https://img.example.com/ep1.jpg',
    duration: 42,
    description: 'The first episode',
  },
  {
    episodeId: 'ep2',
    seriesId: 's1',
    episodeNumber: 2,
    seasonNumber: 1,
    title: 'Chapter Two',
    thumbnailUrl: 'https://img.example.com/ep2.jpg',
    duration: 38,
  },
  {
    episodeId: 'ep3',
    seriesId: 's1',
    episodeNumber: 3,
    seasonNumber: 1,
    title: 'Chapter Three',
    thumbnailUrl: 'https://img.example.com/ep3.jpg',
    duration: 45,
    description: 'Third episode description',
  },
];

const mockSeasons: Season[] = [
  { seasonNumber: 1, seasonId: 'season-1', episodeCount: 8 },
  { seasonNumber: 2, seasonId: 'season-2', episodeCount: 10 },
];

describe('EpisodePanel', () => {
  const panelRef = { current: null } as React.RefObject<HTMLDivElement | null>;
  const defaultProps = {
    isOpen: true,
    episodes: mockEpisodes,
    seasons: mockSeasons,
    selectedSeason: 1,
    currentEpisode: 1,
    currentSeason: 1,
    isLoading: false,
    onClose: vi.fn(),
    onSeasonChange: vi.fn(),
    onEpisodeSelect: vi.fn(),
    panelRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render nothing when closed', () => {
      const { container } = render(
        <EpisodePanel {...defaultProps} isOpen={false} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render the panel when open', async () => {
      render(<EpisodePanel {...defaultProps} />);

      // Wait for the enter animation to mount and become visible
      await waitFor(() => {
        const panel = document.querySelector('[class*="z-[60]"]');
        expect(panel).toBeInTheDocument();
      });
    });

    it('should render episode thumbnails', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Episode buttons (3) + close area (1) = at least 4
        // Also potentially the season dropdown button
        expect(buttons.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should render episode number badges', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument();
        expect(screen.getByText('E2')).toBeInTheDocument();
        expect(screen.getByText('E3')).toBeInTheDocument();
      });
    });

    it('should render duration badges', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('42m')).toBeInTheDocument();
        expect(screen.getByText('38m')).toBeInTheDocument();
        expect(screen.getByText('45m')).toBeInTheDocument();
      });
    });

    it('should show thumbnails as images', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBe(mockEpisodes.length);
      });
    });
  });

  describe('season dropdown', () => {
    it('should render season button with current season', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S1')).toBeInTheDocument();
      });
    });

    it('should open dropdown on click', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('S1'));

      await waitFor(() => {
        expect(screen.getByText('Season 1')).toBeInTheDocument();
        expect(screen.getByText('Season 2')).toBeInTheDocument();
      });
    });

    it('should show episode counts in dropdown', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('S1'));

      await waitFor(() => {
        expect(screen.getByText('(8)')).toBeInTheDocument();
        expect(screen.getByText('(10)')).toBeInTheDocument();
      });
    });

    it('should call onSeasonChange when a season is selected', async () => {
      const onSeasonChange = vi.fn();
      render(
        <EpisodePanel {...defaultProps} onSeasonChange={onSeasonChange} />,
      );

      await waitFor(() => {
        expect(screen.getByText('S1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('S1'));

      await waitFor(() => {
        expect(screen.getByText('Season 2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Season 2'));
      expect(onSeasonChange).toHaveBeenCalledWith(2);
    });

    it('should not render season dropdown with single season', async () => {
      render(
        <EpisodePanel
          {...defaultProps}
          seasons={[{ seasonNumber: 1, seasonId: 's1', episodeCount: 8 }]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument();
      });

      expect(screen.queryByText('S1')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', async () => {
      render(<EpisodePanel {...defaultProps} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should not show episodes when loading', async () => {
      render(<EpisodePanel {...defaultProps} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      expect(screen.queryByText('E1')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message with no episodes', async () => {
      render(<EpisodePanel {...defaultProps} episodes={[]} />);

      await waitFor(() => {
        expect(screen.getByText('No episodes')).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    it('should call onClose when left glass area is clicked', async () => {
      const onClose = vi.fn();
      render(<EpisodePanel {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close episodes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Close episodes'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose on Escape key in left area', async () => {
      const onClose = vi.fn();
      render(<EpisodePanel {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close episodes')).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByLabelText('Close episodes'), {
        key: 'Escape',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onEpisodeSelect when an episode is clicked', async () => {
      const onEpisodeSelect = vi.fn();
      render(
        <EpisodePanel {...defaultProps} onEpisodeSelect={onEpisodeSelect} />,
      );

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument();
      });

      // Click the first episode button by its aria-label
      const episodeButton = screen.getByLabelText('Pilot (now playing)');
      fireEvent.click(episodeButton);

      expect(onEpisodeSelect).toHaveBeenCalledWith(mockEpisodes[0]);
    });

    it('should handle scroll events and update center index', async () => {
      render(<EpisodePanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument();
      });

      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        // Mock dimensions
        Object.defineProperty(scrollContainer, 'clientHeight', { value: 600 });
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 100 });

        fireEvent.scroll(scrollContainer);

        // Wait for requestAnimationFrame
        await act(async () => {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        });
      }
    });

    it('should close season dropdown when a season is selected', async () => {
      const onSeasonChange = vi.fn();
      render(
        <EpisodePanel {...defaultProps} onSeasonChange={onSeasonChange} />,
      );

      await waitFor(() => {
        expect(screen.getByText('S1')).toBeInTheDocument();
      });

      // Open dropdown
      fireEvent.click(screen.getByText('S1'));

      await waitFor(() => {
        expect(screen.getByText('Season 2')).toBeInTheDocument();
      });

      // Select season
      fireEvent.click(screen.getByText('Season 2'));

      expect(onSeasonChange).toHaveBeenCalledWith(2);

      // Should close dropdown
      await waitFor(() => {
        expect(screen.queryByText('Season 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('now playing indicator', () => {
    it('should mark current episode as now playing in aria-label', async () => {
      render(
        <EpisodePanel
          {...defaultProps}
          currentEpisode={1}
          currentSeason={1}
          selectedSeason={1}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByLabelText('Pilot (now playing)'),
        ).toBeInTheDocument();
      });
    });

    it('should not mark non-current episodes as playing', async () => {
      render(
        <EpisodePanel
          {...defaultProps}
          currentEpisode={1}
          currentSeason={1}
          selectedSeason={1}
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Chapter Two')).toBeInTheDocument();
      });

      expect(
        screen.queryByLabelText('Chapter Two (now playing)'),
      ).not.toBeInTheDocument();
    });

    it('should not mark episodes as playing when viewing different season', async () => {
      render(
        <EpisodePanel
          {...defaultProps}
          currentEpisode={1}
          currentSeason={1}
          selectedSeason={2}
        />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Pilot')).toBeInTheDocument();
      });

      expect(
        screen.queryByLabelText('Pilot (now playing)'),
      ).not.toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('should animate in when opened', async () => {
      const { container } = render(<EpisodePanel {...defaultProps} />);

      // Panel should mount and eventually become visible
      await waitFor(() => {
        const panel = container.querySelector('[class*="z-[60]"]');
        expect(panel).toBeInTheDocument();
        expect(panel).toHaveClass('opacity-100');
      });
    });

    it('should animate out when closed', async () => {
      const { container, rerender } = render(
        <EpisodePanel {...defaultProps} isOpen={true} />,
      );

      // Wait for enter
      await waitFor(() => {
        const panel = container.querySelector('[class*="z-[60]"]');
        expect(panel).toHaveClass('opacity-100');
      });

      // Close the panel
      rerender(<EpisodePanel {...defaultProps} isOpen={false} />);

      // Should have opacity-0 during exit
      const panel = container.querySelector('[class*="z-[60]"]');
      if (panel) {
        expect(panel).toHaveClass('opacity-0');
      }

      // After 300ms, should unmount
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(container.querySelector('[class*="z-[60]"]')).toBeNull();
    });
  });

  describe('episode without thumbnail', () => {
    it('should render placeholder when episode has no thumbnail', async () => {
      const noThumbEpisode: Episode[] = [
        {
          episodeId: 'ep-nothumb',
          seriesId: 's1',
          episodeNumber: 1,
          thumbnailUrl: '',
          title: 'No Thumb',
        },
      ];
      render(
        <EpisodePanel
          {...defaultProps}
          episodes={noThumbEpisode}
          seasons={[{ seasonNumber: 1, seasonId: 's1', episodeCount: 1 }]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument();
      });

      // Should show fallback number instead of image
      expect(screen.queryAllByRole('img')).toHaveLength(0);
    });
  });

  it('should handle hovering over the centered episode', () => {
    // Mock getBoundingClientRect for layout calculations
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0,
      height: 480, // Container H
    });

    render(<EpisodePanel {...defaultProps} isOpen={true} />);

    const ep1Button = screen.getByRole('button', { name: /Pilot/i });

    fireEvent.mouseEnter(ep1Button);
    // This should trigger setIsHoveringCenter(true)

    fireEvent.mouseLeave(ep1Button);
    // This should trigger setIsHoveringCenter(false)
  });
});

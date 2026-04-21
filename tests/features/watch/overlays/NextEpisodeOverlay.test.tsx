import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type NextEpisodeInfo,
  NextEpisodeOverlay,
} from '@/features/watch/player/ui/overlays/NextEpisodeOverlay';

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    unoptimized?: boolean;
  }) => (
    <img src={src} alt={alt} className={className} data-testid="next-image" />
  ),
}));

describe('NextEpisodeOverlay', () => {
  const mockNextEpisode: NextEpisodeInfo = {
    title: 'The Cat in the Box',
    seriesTitle: 'Breaking Bad',
    seasonNumber: 1,
    episodeNumber: 4,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: 47,
  };

  const defaultProps = {
    isVisible: true,
    nextEpisode: mockNextEpisode,
    onPlayNext: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('visibility', () => {
    it('should render when visible with next episode', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByText('nextEpisode')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <NextEpisodeOverlay {...defaultProps} isVisible={false} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when nextEpisode is null', () => {
      const { container } = render(
        <NextEpisodeOverlay {...defaultProps} nextEpisode={null} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('episode info', () => {
    it('should display episode title', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByText('The Cat in the Box')).toBeInTheDocument();
    });

    it('should display season and episode number', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByText('seasonEpisodeLabel')).toBeInTheDocument();
    });

    it('should display duration', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByText('min')).toBeInTheDocument();
    });

    it('should display thumbnail when available', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    it('should show fallback when no thumbnail', () => {
      const episodeNoThumb = { ...mockNextEpisode, thumbnailUrl: undefined };
      render(
        <NextEpisodeOverlay {...defaultProps} nextEpisode={episodeNoThumb} />,
      );

      expect(screen.getByText('episodeShort')).toBeInTheDocument();
    });
  });

  describe('next season detection', () => {
    it('should show "Next Season" for episode 1', () => {
      const nextSeasonEpisode = {
        ...mockNextEpisode,
        episodeNumber: 1,
        seasonNumber: 2,
      };
      render(
        <NextEpisodeOverlay
          {...defaultProps}
          nextEpisode={nextSeasonEpisode}
        />,
      );

      expect(screen.getByText('nextSeason')).toBeInTheDocument();
    });

    it('should show "Next Episode" for non-first episode', () => {
      render(<NextEpisodeOverlay {...defaultProps} />);

      expect(screen.getByText('nextEpisode')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onPlayNext when play button is clicked', () => {
      const onPlayNext = vi.fn();
      render(<NextEpisodeOverlay {...defaultProps} onPlayNext={onPlayNext} />);

      fireEvent.click(screen.getByText(/play/i));
      expect(onPlayNext).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<NextEpisodeOverlay {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-play countdown', () => {
    it('should show countdown when autoPlayDelay is set', () => {
      render(<NextEpisodeOverlay {...defaultProps} autoPlayDelay={10} />);

      expect(screen.getByText('inCountdown')).toBeInTheDocument();
    });

    it('should not show countdown when autoPlayDelay is 0', () => {
      render(<NextEpisodeOverlay {...defaultProps} autoPlayDelay={0} />);

      expect(screen.queryByText('inCountdown')).not.toBeInTheDocument();
    });

    it('should countdown and call onPlayNext', async () => {
      const onPlayNext = vi.fn();
      render(
        <NextEpisodeOverlay
          {...defaultProps}
          onPlayNext={onPlayNext}
          autoPlayDelay={3}
        />,
      );

      expect(screen.getByText('inCountdown')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('inCountdown')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('inCountdown')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onPlayNext).toHaveBeenCalled();
    });

    it('should stop countdown when cancelled', async () => {
      const onPlayNext = vi.fn();
      const onCancel = vi.fn();
      render(
        <NextEpisodeOverlay
          {...defaultProps}
          onPlayNext={onPlayNext}
          onCancel={onCancel}
          autoPlayDelay={5}
        />,
      );

      expect(screen.getByText('inCountdown')).toBeInTheDocument();

      fireEvent.click(screen.getByText('cancel'));

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onPlayNext).not.toHaveBeenCalled();
    });

    it('should not countdown when loading', () => {
      const onPlayNext = vi.fn();
      render(
        <NextEpisodeOverlay
          {...defaultProps}
          onPlayNext={onPlayNext}
          autoPlayDelay={3}
          isLoading={true}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onPlayNext).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when isLoading', () => {
      const { container } = render(
        <NextEpisodeOverlay {...defaultProps} isLoading={true} />,
      );

      // Should have loading spinner
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('episode without title', () => {
    it('should show fallback title', () => {
      const episodeNoTitle = { ...mockNextEpisode, title: '' };
      render(
        <NextEpisodeOverlay {...defaultProps} nextEpisode={episodeNoTitle} />,
      );

      expect(screen.getByText('episode')).toBeInTheDocument();
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CenterPlayButton,
  PlayPause,
  TapIndicator,
} from '@/features/watch/controls/PlayPause';

describe('PlayPause', () => {
  const defaultProps = {
    isPlaying: false,
    onToggle: vi.fn(),
  };

  describe('rendering', () => {
    it('should render play button when not playing', () => {
      const { container } = render(
        <PlayPause {...defaultProps} isPlaying={false} />,
      );

      // Play icon has ml-0.5 class
      expect(container.querySelector('.ml-0\\.5')).toBeInTheDocument();
    });

    it('should render pause button when playing', () => {
      const { container } = render(
        <PlayPause {...defaultProps} isPlaying={true} />,
      );

      // Pause icon doesn't have ml-0.5
      expect(container.querySelector('.ml-0\\.5')).not.toBeInTheDocument();
    });

    it('should render with small size', () => {
      const { container } = render(<PlayPause {...defaultProps} size="sm" />);

      expect(container.querySelector('.w-10')).toBeInTheDocument();
    });

    it('should render with medium size by default', () => {
      const { container } = render(<PlayPause {...defaultProps} />);

      expect(container.querySelector('.w-12')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      const { container } = render(<PlayPause {...defaultProps} size="lg" />);

      expect(container.querySelector('.w-14')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onToggle when clicked', () => {
      const onToggle = vi.fn();
      render(<PlayPause {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should toggle between play and pause states', () => {
      const onToggle = vi.fn();
      const { rerender, container } = render(
        <PlayPause isPlaying={false} onToggle={onToggle} />,
      );

      // Initially shows play
      expect(container.querySelector('.ml-0\\.5')).toBeInTheDocument();

      // After rerender with playing, shows pause
      rerender(<PlayPause isPlaying={true} onToggle={onToggle} />);
      expect(container.querySelector('.ml-0\\.5')).not.toBeInTheDocument();
    });
  });
});

describe('CenterPlayButton', () => {
  const defaultProps = {
    isPlaying: false,
    onToggle: vi.fn(),
  };

  const mockMetadata = {
    title: 'Breaking Bad',
    type: 'series' as const,
    season: 1,
    episode: 1,
    description: 'A high school chemistry teacher...',
    year: '2008',
    posterUrl: 'https://example.com/poster.jpg',
  };

  describe('rendering', () => {
    it('should render button', () => {
      render(<CenterPlayButton {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with metadata', () => {
      render(<CenterPlayButton {...defaultProps} metadata={mockMetadata} />);

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    });

    it('should show episode info for series', () => {
      render(<CenterPlayButton {...defaultProps} metadata={mockMetadata} />);

      expect(screen.getByText(/S1/)).toBeInTheDocument();
      expect(screen.getByText(/E1/)).toBeInTheDocument();
    });

    it('should show description when available', () => {
      render(<CenterPlayButton {...defaultProps} metadata={mockMetadata} />);

      expect(
        screen.getByText(/A high school chemistry teacher/),
      ).toBeInTheDocument();
    });

    it('should show lock icon when disabled', () => {
      const { container } = render(
        <CenterPlayButton {...defaultProps} disabled={true} />,
      );

      // Lock icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onToggle when clicked', () => {
      const onToggle = vi.fn();
      render(<CenterPlayButton {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should not call onToggle when disabled', () => {
      const onToggle = vi.fn();
      render(
        <CenterPlayButton
          {...defaultProps}
          onToggle={onToggle}
          disabled={true}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should not call onToggle when loading', () => {
      const onToggle = vi.fn();
      render(
        <CenterPlayButton
          {...defaultProps}
          onToggle={onToggle}
          isLoading={true}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('should handle keyboard Enter', () => {
      const onToggle = vi.fn();
      render(<CenterPlayButton {...defaultProps} onToggle={onToggle} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard Space', () => {
      const onToggle = vi.fn();
      render(<CenterPlayButton {...defaultProps} onToggle={onToggle} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('movie vs series', () => {
    it('should show movie metadata without episode info', () => {
      const movieMetadata = {
        title: 'Inception',
        type: 'movie' as const,
        year: '2010',
      };

      render(<CenterPlayButton {...defaultProps} metadata={movieMetadata} />);

      expect(screen.getByText('Inception')).toBeInTheDocument();
      expect(screen.queryByText(/S\d/)).not.toBeInTheDocument();
    });
  });
});

describe('TapIndicator', () => {
  const defaultProps = {
    direction: 'right' as const,
    seconds: 10,
    isVisible: true,
  };

  describe('visibility', () => {
    it('should render when visible', () => {
      render(<TapIndicator {...defaultProps} isVisible={true} />);

      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <TapIndicator {...defaultProps} isVisible={false} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('display', () => {
    it('should show seconds with s suffix', () => {
      render(<TapIndicator {...defaultProps} seconds={15} />);

      expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('should position on right for right direction', () => {
      const { container } = render(
        <TapIndicator {...defaultProps} direction="right" />,
      );

      expect(container.firstChild).toHaveClass('right-1/4');
    });

    it('should position on left for left direction', () => {
      const { container } = render(
        <TapIndicator {...defaultProps} direction="left" />,
      );

      expect(container.firstChild).toHaveClass('left-1/4');
    });
  });
});

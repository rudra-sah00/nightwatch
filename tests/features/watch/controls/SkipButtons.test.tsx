import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  SeekIndicator,
  SkipButton,
} from '@/features/watch/player/ui/controls/SkipButtons';

describe('SkipButton', () => {
  const defaultProps = {
    direction: 'forward' as const,
    onSkip: vi.fn(),
  };

  describe('rendering', () => {
    it('should render forward skip button', () => {
      render(<SkipButton {...defaultProps} direction="forward" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTitle('Skip forward 10s')).toBeInTheDocument();
    });

    it('should render back skip button', () => {
      render(<SkipButton {...defaultProps} direction="back" />);

      expect(screen.getByTitle('Skip back 10s')).toBeInTheDocument();
    });

    it('should show default 10 seconds', () => {
      render(<SkipButton {...defaultProps} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show custom seconds', () => {
      render(<SkipButton {...defaultProps} seconds={30} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByTitle('Skip forward 30s')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onSkip when clicked', () => {
      const onSkip = vi.fn();
      render(<SkipButton {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('should call onSkip for back button', () => {
      const onSkip = vi.fn();
      render(<SkipButton direction="back" onSkip={onSkip} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SeekIndicator', () => {
  const defaultProps = {
    seconds: 10,
    direction: 'forward' as const,
    isVisible: true,
  };

  describe('visibility', () => {
    it('should render when visible', () => {
      render(<SeekIndicator {...defaultProps} isVisible={true} />);

      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <SeekIndicator {...defaultProps} isVisible={false} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('display', () => {
    it('should show seconds with s suffix', () => {
      render(<SeekIndicator {...defaultProps} seconds={15} />);

      expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('should position on right for forward direction', () => {
      const { container } = render(
        <SeekIndicator {...defaultProps} direction="forward" />,
      );

      expect(container.firstChild).toHaveClass('right-1/4');
    });

    it('should position on left for back direction', () => {
      const { container } = render(
        <SeekIndicator {...defaultProps} direction="back" />,
      );

      expect(container.firstChild).toHaveClass('left-1/4');
    });
  });
});

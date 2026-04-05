import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorOverlay } from '@/features/watch/player/ui/overlays/ErrorOverlay';

describe('ErrorOverlay', () => {
  const defaultProps = {
    isVisible: true,
    message: 'Something went wrong',
  };

  describe('visibility', () => {
    it('should render when visible', () => {
      render(<ErrorOverlay {...defaultProps} />);

      expect(screen.getByText('Playback Error')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <ErrorOverlay {...defaultProps} isVisible={false} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('content', () => {
    it('should display error message', () => {
      render(<ErrorOverlay {...defaultProps} message="Video failed to load" />);

      expect(screen.getByText('Video failed to load')).toBeInTheDocument();
    });

    it('should display error icon', () => {
      const { container } = render(<ErrorOverlay {...defaultProps} />);

      // AlertCircle icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should display title', () => {
      render(<ErrorOverlay {...defaultProps} />);

      expect(screen.getByText('Playback Error')).toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('should show retry button when onRetry is provided', () => {
      render(<ErrorOverlay {...defaultProps} onRetry={vi.fn()} />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(<ErrorOverlay {...defaultProps} />);

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<ErrorOverlay {...defaultProps} onRetry={onRetry} />);

      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('back button', () => {
    it('should show back button when onBack is provided', () => {
      render(<ErrorOverlay {...defaultProps} onBack={vi.fn()} />);

      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('should not show back button when onBack is not provided', () => {
      render(<ErrorOverlay {...defaultProps} />);

      expect(screen.queryByText('Go Back')).not.toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<ErrorOverlay {...defaultProps} onBack={onBack} />);

      fireEvent.click(screen.getByText('Go Back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('both buttons', () => {
    it('should show both buttons when both callbacks provided', () => {
      render(
        <ErrorOverlay {...defaultProps} onRetry={vi.fn()} onBack={vi.fn()} />,
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });
});

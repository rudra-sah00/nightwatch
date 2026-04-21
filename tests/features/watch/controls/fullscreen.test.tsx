import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Fullscreen } from '@/features/watch/player/ui/controls/Fullscreen';

describe('Fullscreen', () => {
  const defaultProps = {
    isFullscreen: false,
    onToggle: vi.fn(),
  };

  describe('rendering', () => {
    it('should render fullscreen button', () => {
      render(<Fullscreen {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show maximize icon when not fullscreen', () => {
      const { container } = render(
        <Fullscreen {...defaultProps} isFullscreen={false} />,
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show minimize icon when fullscreen', () => {
      const { container } = render(
        <Fullscreen {...defaultProps} isFullscreen={true} />,
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have "Enter fullscreen" aria-label when not fullscreen', () => {
      render(<Fullscreen {...defaultProps} isFullscreen={false} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'enterFullscreen',
      );
    });

    it('should have "Exit fullscreen" aria-label when fullscreen', () => {
      render(<Fullscreen {...defaultProps} isFullscreen={true} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'exitFullscreen',
      );
    });

    it('should use custom label when provided', () => {
      render(<Fullscreen {...defaultProps} label="Exit theater mode" />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Exit theater mode',
      );
    });
  });

  describe('interactions', () => {
    it('should call onToggle when clicked', () => {
      const onToggle = vi.fn();
      render(<Fullscreen {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on mouseDown to avoid focus steal', () => {
      render(<Fullscreen {...defaultProps} />);
      const button = screen.getByRole('button');

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      button.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should toggle between states', () => {
      const onToggle = vi.fn();
      const { rerender, container } = render(
        <Fullscreen isFullscreen={false} onToggle={onToggle} />,
      );

      // Click to toggle
      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalled();

      // Rerender as fullscreen
      rerender(<Fullscreen isFullscreen={true} onToggle={onToggle} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});

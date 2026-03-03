import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Volume } from '@/features/watch/player/ui/controls/Volume';

describe('Volume', () => {
  const defaultProps = {
    volume: 0.5,
    isMuted: false,
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render volume button', () => {
      render(<Volume {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render volume slider', () => {
      render(<Volume {...defaultProps} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should have correct aria attributes on slider', () => {
      render(<Volume {...defaultProps} volume={0.7} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '70');
      expect(slider).toHaveAttribute('aria-label', 'Volume');
    });
  });

  describe('volume icon states', () => {
    it('should show muted icon when muted', () => {
      const { container } = render(<Volume {...defaultProps} isMuted={true} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show muted icon when volume is 0', () => {
      const { container } = render(<Volume {...defaultProps} volume={0} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show low volume icon when volume < 0.5', () => {
      const { container } = render(<Volume {...defaultProps} volume={0.3} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show high volume icon when volume >= 0.5', () => {
      const { container } = render(<Volume {...defaultProps} volume={0.8} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('mute button interactions', () => {
    it('should call onMuteToggle when button is clicked', () => {
      const onMuteToggle = vi.fn();
      render(<Volume {...defaultProps} onMuteToggle={onMuteToggle} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onMuteToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('slider hover behavior', () => {
    it('should expand slider on hover', () => {
      const { container } = render(<Volume {...defaultProps} />);

      const fieldset = container.querySelector('fieldset');
      fireEvent.mouseEnter(fieldset!);

      // Should have expanded class
      const sliderContainer = container.querySelector('.w-24');
      expect(sliderContainer).toBeInTheDocument();
    });

    it('should collapse slider on mouse leave when not dragging', () => {
      const { container } = render(<Volume {...defaultProps} />);

      const fieldset = container.querySelector('fieldset');
      fireEvent.mouseEnter(fieldset!);
      fireEvent.mouseLeave(fieldset!);

      expect(fieldset).toBeInTheDocument();
    });
  });

  describe('slider drag interactions', () => {
    it('should call onVolumeChange on mouse down', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');

      // Simulate mouse down with position
      Object.defineProperty(slider, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 100 }),
      });

      fireEvent.mouseDown(slider, { clientX: 50 });
      expect(onVolumeChange).toHaveBeenCalled();
    });

    it('should handle mouse move during drag', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');

      Object.defineProperty(slider, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 100 }),
      });

      // Start dragging
      fireEvent.mouseDown(slider, { clientX: 50 });

      // Move mouse
      fireEvent.mouseMove(document, { clientX: 75 });

      // Stop dragging
      fireEvent.mouseUp(document);
    });
  });

  describe('keyboard navigation', () => {
    it('should increase volume on ArrowRight', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onVolumeChange).toHaveBeenCalledWith(0.6);
    });

    it('should increase volume on ArrowUp', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowUp' });

      expect(onVolumeChange).toHaveBeenCalledWith(0.6);
    });

    it('should decrease volume on ArrowLeft', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });

      expect(onVolumeChange).toHaveBeenCalledWith(0.4);
    });

    it('should decrease volume on ArrowDown', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowDown' });

      expect(onVolumeChange).toHaveBeenCalledWith(0.4);
    });

    it('should not go above 1', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.95}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onVolumeChange).toHaveBeenCalledWith(1);
    });

    it('should not go below 0', () => {
      const onVolumeChange = vi.fn();
      render(
        <Volume
          {...defaultProps}
          volume={0.05}
          onVolumeChange={onVolumeChange}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });

      expect(onVolumeChange).toHaveBeenCalledWith(0);
    });
  });

  describe('accessibility', () => {
    it('should have aria-label for volume control', () => {
      const { container } = render(<Volume {...defaultProps} />);

      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toHaveAttribute('aria-label', 'Volume control');
    });

    it('should update aria-valuenow based on volume', () => {
      const { rerender } = render(<Volume {...defaultProps} volume={0.3} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '30');

      rerender(<Volume {...defaultProps} volume={0.8} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '80');
    });
  });

  describe('display volume when muted', () => {
    it('should show 0 volume in slider when muted', () => {
      render(<Volume {...defaultProps} volume={0.8} isMuted={true} />);

      // aria-valuenow should reflect display volume (0 when muted)
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show actual volume when not muted', () => {
      render(<Volume {...defaultProps} volume={0.7} isMuted={false} />);

      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '70');
    });
  });
});

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
      expect(slider).toHaveAttribute('aria-label', 'volume');
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
    /**
     * Pointer Events, not mouse: the slider used `mousedown` plus global
     * `mousemove`/`mouseup`, and touch never synthesises those during a drag, so on any
     * touch device the volume could only be tapped — it jumped, and fine adjustment was
     * impossible (PLAYER_AUDIT H9).
     */
    function stubWidth(slider: HTMLElement) {
      Object.defineProperty(slider, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 100 }),
      });
      slider.setPointerCapture = vi.fn();
      slider.releasePointerCapture = vi.fn();
    }

    it('sets the volume on pointer down', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');
      stubWidth(slider);

      fireEvent.pointerDown(slider, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 50,
      });

      expect(onVolumeChange).toHaveBeenCalledWith(0.5);
    });

    it('tracks the volume while dragging', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');
      stubWidth(slider);

      fireEvent.pointerDown(slider, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 50,
      });
      fireEvent.pointerMove(slider, {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 75,
      });
      fireEvent.pointerUp(slider, {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 75,
      });

      expect(onVolumeChange).toHaveBeenLastCalledWith(0.75);
    });

    /** The defect: dragging by touch did nothing at all. */
    it('can be dragged by touch', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');
      stubWidth(slider);

      fireEvent.pointerDown(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 20,
      });
      fireEvent.pointerMove(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 60,
      });

      expect(onVolumeChange).toHaveBeenLastCalledWith(0.6);
    });

    /** Capture means a drag that strays off the slider still tracks. */
    it('keeps tracking after the pointer leaves the slider', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');
      stubWidth(slider);

      fireEvent.pointerDown(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 20,
      });
      fireEvent.pointerLeave(slider, { pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerMove(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 90,
      });

      expect(onVolumeChange).toHaveBeenLastCalledWith(0.9);
    });

    it('stops tracking once the pointer is released', () => {
      const onVolumeChange = vi.fn();
      render(<Volume {...defaultProps} onVolumeChange={onVolumeChange} />);

      const slider = screen.getByRole('slider');
      stubWidth(slider);

      fireEvent.pointerDown(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 20,
      });
      fireEvent.pointerUp(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 20,
      });
      onVolumeChange.mockClear();
      fireEvent.pointerMove(slider, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 90,
      });

      expect(onVolumeChange).not.toHaveBeenCalled();
    });

    it('sets touch-action none so the page does not scroll instead', () => {
      render(<Volume {...defaultProps} />);

      expect(
        (screen.getByRole('slider') as HTMLElement).style.touchAction,
      ).toBe('none');
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
      expect(fieldset).toHaveAttribute('aria-label', 'volumeControl');
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

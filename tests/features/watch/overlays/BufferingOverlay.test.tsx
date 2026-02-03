import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BufferingOverlay } from '@/features/watch/overlays/BufferingOverlay';

describe('BufferingOverlay', () => {
  describe('visibility', () => {
    it('should be visible when isVisible is true', () => {
      const { container } = render(<BufferingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('opacity-100');
    });

    it('should be hidden when isVisible is false', () => {
      const { container } = render(<BufferingOverlay isVisible={false} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('opacity-0');
    });
  });

  describe('rendering', () => {
    it('should render spinner', () => {
      const { container } = render(<BufferingOverlay isVisible={true} />);

      // Loader2 icon should be present with animate-spin
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have pointer-events-none', () => {
      const { container } = render(<BufferingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('pointer-events-none');
    });

    it('should be centered', () => {
      const { container } = render(<BufferingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('flex');
      expect(overlay).toHaveClass('items-center');
      expect(overlay).toHaveClass('justify-center');
    });

    it('should have absolute positioning', () => {
      const { container } = render(<BufferingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('absolute');
      expect(overlay).toHaveClass('inset-0');
    });
  });
});

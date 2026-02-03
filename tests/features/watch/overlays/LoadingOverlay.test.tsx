import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingOverlay } from '@/features/watch/overlays/LoadingOverlay';

describe('LoadingOverlay', () => {
  describe('visibility', () => {
    it('should be visible when isVisible is true', () => {
      const { container } = render(<LoadingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('opacity-100');
    });

    it('should be hidden when isVisible is false', () => {
      const { container } = render(<LoadingOverlay isVisible={false} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('opacity-0');
      expect(overlay).toHaveClass('pointer-events-none');
    });
  });

  describe('rendering', () => {
    it('should render loading text', () => {
      render(<LoadingOverlay isVisible={true} />);

      expect(
        screen.getByText(/Initializing secure connection/),
      ).toBeInTheDocument();
    });

    it('should render spinner', () => {
      const { container } = render(<LoadingOverlay isVisible={true} />);

      // Spinner has animate-spin class pattern
      expect(
        container.querySelector('[class*="animate-"]'),
      ).toBeInTheDocument();
    });

    it('should be centered', () => {
      const { container } = render(<LoadingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('flex');
      expect(overlay).toHaveClass('items-center');
      expect(overlay).toHaveClass('justify-center');
    });

    it('should have absolute positioning', () => {
      const { container } = render(<LoadingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('absolute');
      expect(overlay).toHaveClass('inset-0');
    });

    it('should have high z-index', () => {
      const { container } = render(<LoadingOverlay isVisible={true} />);

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('z-40');
    });
  });
});

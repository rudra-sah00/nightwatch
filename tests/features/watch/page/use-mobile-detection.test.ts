import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobileDetection } from '@/features/watch/page/useMobileDetection';

interface WindowWithTouch {
  ontouchstart?: unknown;
}

describe('useMobileDetection', () => {
  beforeEach(() => {
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Delete ontouchstart if it exists
    if ('ontouchstart' in window) {
      delete (window as WindowWithTouch).ontouchstart;
    }

    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial detection', () => {
    it('should detect desktop by default (width >= 768, no touch)', () => {
      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);
    });

    it('should detect mobile when width < 768', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);
    });

    it('should detect mobile when ontouchstart is present', () => {
      (window as WindowWithTouch).ontouchstart = {};

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);

      // Cleanup
      delete (window as WindowWithTouch).ontouchstart;
    });

    it('should detect mobile when maxTouchPoints > 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);
    });
  });

  describe('Resize detection', () => {
    it('should update on window resize from desktop to mobile', () => {
      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 500,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);
    });

    it('should update on window resize from mobile to desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(false);
    });

    it('should handle rapid resize events', () => {
      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 500,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(false);
    });
  });

  describe('Multiple detection criteria', () => {
    it('should return true if any mobile criterion is met', () => {
      // Width is desktop, but touch is present
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      (window as WindowWithTouch).ontouchstart = {};

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);

      // Cleanup
      delete (window as WindowWithTouch).ontouchstart;
    });

    it('should return false only when all criteria indicate desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      if ('ontouchstart' in window)
        delete (window as WindowWithTouch).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 0,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should remove resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useMobileDetection());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle exactly 768px width as desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);
    });

    it('should handle 767px width as mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(true);
    });
  });
});

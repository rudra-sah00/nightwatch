import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock electron-bridge so checkIsDesktop returns false (simulating non-Electron env)
vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  checkIsMobile: () => false,
  isDesktop: false,
  isMobile: false,
  desktopBridge: {},
}));

import { useMobileDetection } from '@/features/watch/player/hooks/useMobileDetection';

interface WindowWithTouch {
  ontouchstart?: unknown;
}

/**
 * Stub `matchMedia` so `(pointer: coarse)` / `(hover: none)` are deterministic.
 * Defaults to a mouse-driven desktop (fine pointer, hover capable).
 */
function mockPointer({ coarse = false, hover = true } = {}) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('pointer: coarse')
        ? coarse
        : query.includes('hover: none')
          ? !hover
          : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('useMobileDetection', () => {
  beforeEach(() => {
    mockPointer();

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

    it('should stay desktop when ontouchstart is present but pointer is fine', () => {
      (window as WindowWithTouch).ontouchstart = {};

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);

      // Cleanup
      delete (window as WindowWithTouch).ontouchstart;
    });

    it('should stay desktop when maxTouchPoints > 0 but pointer is fine', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1,
      });

      const { result } = renderHook(() => useMobileDetection());
      expect(result.current).toBe(false);
    });

    it('should detect mobile when touch is paired with no hover capability', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
      mockPointer({ coarse: false, hover: false });

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
    it('should require touch to be paired with a coarse pointer, not touch alone', () => {
      // Desktop width + touch APIs but a fine pointer => still desktop.
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      (window as WindowWithTouch).ontouchstart = {};

      const { result: laptop } = renderHook(() => useMobileDetection());
      expect(laptop.current).toBe(false);

      // Same device signals, but now the primary pointer is coarse => mobile.
      mockPointer({ coarse: true, hover: false });

      const { result: tablet } = renderHook(() => useMobileDetection());
      expect(tablet.current).toBe(true);

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

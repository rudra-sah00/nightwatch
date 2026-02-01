import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobileDetection } from '@/features/watch/page/useMobileDetection';

describe('useMobileDetection', () => {
  beforeEach(() => {
    // Reset window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });

    // Remove touch support
    delete (window as { ontouchstart?: unknown }).ontouchstart;
  });

  it('should return false for desktop viewport (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(false);
  });

  it('should return true for mobile viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  it('should return true for tablet viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  it('should return true when touch support is detected', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    (window as { ontouchstart?: unknown }).ontouchstart = null;

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  it('should return true when maxTouchPoints > 0', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 1 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  it('should update on window resize from desktop to mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(false);

    // Resize to mobile
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should update on window resize from mobile to desktop', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);

    // Resize to desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should cleanup resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useMobileDetection());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('should detect iPad with touch support', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  it('should handle edge case of exactly 768px as mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(false);
  });

  it('should handle edge case of 767px as mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767 });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current).toBe(true);
  });

  describe('Multiple resize events', () => {
    it('should handle rapid resize events', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useMobileDetection());

      // Rapid resizes
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      window.dispatchEvent(new Event('resize'));

      Object.defineProperty(window, 'innerWidth', { value: 600 });
      window.dispatchEvent(new Event('resize'));

      Object.defineProperty(window, 'innerWidth', { value: 400 });
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });
});

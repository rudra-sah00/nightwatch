import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheaterMode } from '@/features/watch/player/useTheaterMode';

describe('useTheaterMode', () => {
  let containerDiv: HTMLDivElement;
  let dispatch: React.Dispatch<{
    type: 'SET_FULLSCREEN';
    isFullscreen: boolean;
  }>;

  beforeEach(() => {
    containerDiv = document.createElement('div');
    document.body.appendChild(containerDiv);
    dispatch = vi.fn() as unknown as typeof dispatch;
  });

  afterEach(() => {
    document.body.removeChild(containerDiv);
    document.body.style.overflow = '';
    document.body.style.position = '';
  });

  function renderTheaterMode(
    overrides: Partial<Parameters<typeof useTheaterMode>[0]> = {},
  ) {
    const containerRef = { current: containerDiv };
    return renderHook(() =>
      useTheaterMode({
        containerRef,
        dispatch,
        ...overrides,
      }),
    );
  }

  describe('initial state', () => {
    it('should start with theater mode disabled', () => {
      const { result } = renderTheaterMode();
      expect(result.current.isTheaterMode).toBe(false);
    });
  });

  describe('enterTheaterMode', () => {
    it('should activate theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(result.current.isTheaterMode).toBe(true);
    });

    it('should add theater-mode class to container', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(containerDiv.classList.contains('theater-mode')).toBe(true);
    });

    it('should lock body scroll', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should dispatch SET_FULLSCREEN with true', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_FULLSCREEN',
        isFullscreen: true,
      });
    });

    it('should call onToggle callback with true', () => {
      const onToggle = vi.fn();
      const { result } = renderTheaterMode({ onToggle });

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should not re-enter if already in theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      vi.mocked(dispatch).mockClear();

      act(() => {
        result.current.enterTheaterMode();
      });

      // Dispatch should not have been called again
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('exitTheaterMode', () => {
    it('should deactivate theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });
      act(() => {
        result.current.exitTheaterMode();
      });

      expect(result.current.isTheaterMode).toBe(false);
    });

    it('should remove theater-mode class from container', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });
      act(() => {
        result.current.exitTheaterMode();
      });

      expect(containerDiv.classList.contains('theater-mode')).toBe(false);
    });

    it('should restore body scroll', () => {
      document.body.style.overflow = 'auto';
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        result.current.exitTheaterMode();
      });

      expect(document.body.style.overflow).toBe('auto');
    });

    it('should dispatch SET_FULLSCREEN with false', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      vi.mocked(dispatch).mockClear();

      act(() => {
        result.current.exitTheaterMode();
      });

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_FULLSCREEN',
        isFullscreen: false,
      });
    });

    it('should call onToggle callback with false', () => {
      const onToggle = vi.fn();
      const { result } = renderTheaterMode({ onToggle });

      act(() => {
        result.current.enterTheaterMode();
      });

      onToggle.mockClear();

      act(() => {
        result.current.exitTheaterMode();
      });

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('should not exit if not in theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.exitTheaterMode();
      });

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('toggleTheaterMode', () => {
    it('should enter theater mode when inactive', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.toggleTheaterMode();
      });

      expect(result.current.isTheaterMode).toBe(true);
    });

    it('should exit theater mode when active', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.toggleTheaterMode();
      });
      act(() => {
        result.current.toggleTheaterMode();
      });

      expect(result.current.isTheaterMode).toBe(false);
    });
  });

  describe('Escape key handling', () => {
    it('should exit theater mode on Escape key press', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(result.current.isTheaterMode).toBe(true);

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isTheaterMode).toBe(false);
    });

    it('should not react to Escape when not in theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isTheaterMode).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should not react to other keys in theater mode', () => {
      const { result } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      vi.mocked(dispatch).mockClear();

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isTheaterMode).toBe(true);
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should restore body styles when unmounted while in theater mode', () => {
      document.body.style.overflow = 'scroll';
      const { result, unmount } = renderTheaterMode();

      act(() => {
        result.current.enterTheaterMode();
      });

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('scroll');
    });

    it('should not change body styles when unmounted while not in theater mode', () => {
      document.body.style.overflow = 'auto';
      const { unmount } = renderTheaterMode();

      unmount();

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('null container ref', () => {
    it('should not crash when container ref is null', () => {
      const containerRef = { current: null };
      const { result } = renderHook(() =>
        useTheaterMode({ containerRef, dispatch }),
      );

      expect(() => {
        act(() => {
          result.current.enterTheaterMode();
        });
      }).not.toThrow();

      expect(result.current.isTheaterMode).toBe(false);
    });
  });
});

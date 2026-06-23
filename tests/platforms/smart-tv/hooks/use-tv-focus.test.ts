import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSetFocus = vi.fn();
const mockGetCurrentFocusKey = vi.fn((): string | null => null);
const mockDoesExist = vi.fn((): boolean => true);

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  setFocus: (..._args: unknown[]) => mockSetFocus(..._args),
  getCurrentFocusKey: () => mockGetCurrentFocusKey(),
  doesFocusableExist: () => mockDoesExist(),
}));

import { useTvFocus } from '@/platforms/smart-tv/hooks/use-tv-focus';

describe('useTvFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets focus to default key on mount', () => {
    renderHook(() => useTvFocus('page-home', 'DEFAULT_KEY'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockSetFocus).toHaveBeenCalledWith('DEFAULT_KEY');
  });

  it('does not steal focus when current focus is in sidebar', () => {
    mockGetCurrentFocusKey.mockReturnValue('TV_SIDEBAR');
    renderHook(() => useTvFocus('page-home', 'DEFAULT_KEY'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('restores previously saved focus key', () => {
    // First render to save focus key on unmount
    mockGetCurrentFocusKey.mockReturnValue(null);
    const { unmount } = renderHook(() =>
      useTvFocus('page-browse', 'DEFAULT_KEY'),
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Simulate that on unmount, getCurrentFocusKey returns a saved key
    mockGetCurrentFocusKey.mockReturnValue('SAVED_KEY');
    unmount();

    // Re-render same page — should restore saved key
    mockGetCurrentFocusKey.mockReturnValue(null);
    mockDoesExist.mockReturnValue(true);
    renderHook(() => useTvFocus('page-browse', 'DEFAULT_KEY'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockSetFocus).toHaveBeenCalledWith('SAVED_KEY');
  });
});

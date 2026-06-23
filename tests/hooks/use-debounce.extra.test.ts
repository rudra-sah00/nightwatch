import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce - edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles rapid value changes, only emitting the last', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    rerender({ value: 'abcd' });

    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('abcd');
  });

  it('does not update after unmount', () => {
    const { result, unmount } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } },
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('updates immediately with zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'first' } },
    );

    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('second');
  });

  it('resets timer on each change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'v1' } },
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    rerender({ value: 'v2' });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current).toBe('v1');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('v2');
  });

  it('handles non-string types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { count: 0 } } },
    );

    rerender({ value: { count: 5 } });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual({ count: 5 });
  });
});

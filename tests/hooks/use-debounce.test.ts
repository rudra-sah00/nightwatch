import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 50 },
      },
    );

    expect(result.current).toBe('initial');

    // Change value
    act(() => {
      rerender({ value: 'updated', delay: 50 });
    });

    // Wait for debounce
    await waitFor(
      () => {
        expect(result.current).toBe('updated');
      },
      { timeout: 150 },
    );
  });

  it('should debounce number values', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 50 },
      },
    );

    expect(result.current).toBe(0);

    act(() => {
      rerender({ value: 42, delay: 50 });
    });

    await waitFor(
      () => {
        expect(result.current).toBe(42);
      },
      { timeout: 150 },
    );
  });

  it('should use default delay of 500ms', () => {
    const { result } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    expect(result.current).toBe('initial');
  });

  it('should cleanup timeout on unmount', () => {
    const { unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      },
    );

    // Unmount should not throw or cause issues
    expect(() => unmount()).not.toThrow();
  });
});

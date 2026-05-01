import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSidebarAnimation } from '@/components/layout/sidebar/use-sidebar-animation';

describe('useSidebarAnimation', () => {
  it('should start with visible=false, closing=false', () => {
    const { result } = renderHook(() => useSidebarAnimation(false));
    expect(result.current.visible).toBe(false);
    expect(result.current.closing).toBe(false);
  });

  it('should set visible=true when open becomes true', () => {
    const { result, rerender } = renderHook(
      ({ open }) => useSidebarAnimation(open),
      { initialProps: { open: false } },
    );

    rerender({ open: true });
    expect(result.current.visible).toBe(true);
    expect(result.current.closing).toBe(false);
  });

  it('should set closing=true when open becomes false while visible', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ open }) => useSidebarAnimation(open),
      { initialProps: { open: true } },
    );

    expect(result.current.visible).toBe(true);

    rerender({ open: false });
    expect(result.current.closing).toBe(true);
    expect(result.current.visible).toBe(true); // Still visible during animation

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.visible).toBe(false);
    expect(result.current.closing).toBe(false);
    vi.useRealTimers();
  });
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockSync } from '@/features/watch-party/room/hooks/useClockSync';

describe('useClockSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with zero offset', () => {
    const { result } = renderHook(() => useClockSync());
    expect(result.current.clockOffset).toBe(0);
    expect(result.current.isCalibrated).toBe(false);
  });

  it('calibrates correctly with server time', () => {
    const { result } = renderHook(() => useClockSync());
    const serverTime = 2000;
    const localTime = 1000;

    act(() => {
      result.current.calibrate(serverTime, localTime);
    });

    expect(result.current.clockOffset).toBe(1000);
    expect(result.current.isCalibrated).toBe(true);
  });

  it('getServerTime applies offset to Date.now()', () => {
    const { result } = renderHook(() => useClockSync());
    const now = Date.now();

    act(() => {
      // Server is 500ms ahead
      result.current.calibrate(now + 500, now);
    });

    // We allow a small margin for execution time if not using fake timers
    const synched = result.current.getServerTime();
    expect(synched).toBeGreaterThanOrEqual(now + 500);
  });
});

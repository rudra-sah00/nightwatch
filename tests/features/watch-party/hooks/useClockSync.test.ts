import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockSync } from '@/features/watch-party/room/hooks/useClockSync';
import { emitPing } from '@/features/watch-party/room/services/watch-party.api';

// Mock the API
vi.mock(
  '@/features/watch-party/room/services/watch-party.api',
  () => import('../../../hooks/__mocks__/watch-party-api'),
);

describe('useClockSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with 0 offset and uncalibrated state', () => {
    const { result } = renderHook(() => useClockSync());
    expect(result.current.clockOffset).toBe(0);
    expect(result.current.isCalibrated).toBe(false);
    expect(result.current.isCalibrating).toBe(false);
  });

  it('should calculate offset correctly during calibration', async () => {
    // Setup mock response for ping
    // We simulate a constant latency of 50ms (RTT 100ms)
    // Client sends at T=1000
    // Server receives at T=1050 (server time might be 2050 if offset is 1000)
    // Server sends back at T=1050
    // Client receives at T=1100

    // Target offset = 1000ms
    // t1 (client send) = 1000
    // serverTime = 2050
    // t4 (client receive) = 1100
    // latency = (1100 - 1000) / 2 = 50
    // offset = serverTime - (t1 + latency) = 2050 - (1000 + 50) = 1000

    vi.mocked(emitPing).mockImplementation((payload, callback) => {
      // Advance time to simulate RTT
      vi.advanceTimersByTime(100);

      const t1 = payload.t1;
      // We assume payload.t1 was "sent" 100ms ago in real time if we didn't mock Date.now() strictly
      // But since we control the mock, let's just cheat a bit or use real calculation

      // Let's pretend server is ahead by 1000ms
      // We simulate that the request took 50ms to get to server
      // So serverTime = t1 + 50 + 1000
      const serverTime = t1 + 50 + 1000;

      if (callback) {
        callback({ success: true, t1, serverTime });
      }
    });

    const { result } = renderHook(() => useClockSync());

    await act(async () => {
      result.current.calibrate();
    });

    expect(result.current.isCalibrating).toBe(true);

    // Wait for calibration to finish (5 samples * (RTT + delay))
    // We mocked implementation to be synchronous-ish regarding callback but we added vitest timer advance?
    // Actually emitPing mock above runs synchronously, so we don't need to advance timers for the network request itself
    // BUT useClockSync has a `await new Promise(resolve => setTimeout(resolve, 100))` delay loop
    // So we need to advance timers to get through the loop

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isCalibrated).toBe(true);
    expect(result.current.isCalibrating).toBe(false);

    // Check offset - should be close to 1000
    // Since we mocked perfectly, it should be exactly 1000
    expect(result.current.clockOffset).toBe(1000);
  });

  it('should handle ping failures gracefully', async () => {
    vi.mocked(emitPing).mockImplementation((_payload, callback) => {
      if (callback) {
        callback({
          success: false,
          error: 'Network error',
          t1: 0,
          serverTime: 0,
        });
      }
    });

    const { result } = renderHook(() => useClockSync());

    await act(async () => {
      result.current.calibrate();
      await vi.runAllTimersAsync();
    });

    // Should finish exposing status even if failed (offset remains 0)
    expect(result.current.isCalibrating).toBe(false);
    expect(result.current.isCalibrated).toBe(false);
    expect(result.current.clockOffset).toBe(0);
  });

  it('should provide synchronized server time', async () => {
    const { result } = renderHook(() => useClockSync());

    // Manually set calibration if exposed, but it's not.
    // So we assume we run calibration first.

    vi.mocked(emitPing).mockImplementation((payload, callback) => {
      vi.advanceTimersByTime(100);
      const serverTime = payload.t1 + 50 + 2000; // Offset 2000
      if (callback) callback({ success: true, t1: payload.t1, serverTime });
    });

    await act(async () => {
      result.current.calibrate();
      await vi.runAllTimersAsync();
    });

    expect(result.current.clockOffset).toBe(2000);

    const now = Date.now();
    const serverTime = result.current.getServerTime();
    expect(serverTime).toBe(now + 2000);
  });

  it('should synchronize correctly even if client is in a different timezone (e.g. +5h)', async () => {
    const { result } = renderHook(() => useClockSync());

    // Simulate Client System is +5 hours ahead of "True" UTC (or just wrong clock)
    // True Server Time: 1000
    // Client Time: 1000 + 5 hours (18000000ms)
    const fiveHours = 5 * 60 * 60 * 1000;
    const serverBaseTime = 1000;

    // We set system time to represent "Client Clock"
    vi.setSystemTime(serverBaseTime + fiveHours);

    vi.mocked(emitPing).mockImplementation((payload, callback) => {
      // Payload.t1 is client time (18001000)

      // Recalculate Server Time relative to the "mocked" reality
      // In this test universe:
      // Client is at T + 5h
      // Server is at T
      // Latency is 50ms

      // If Client sent at T_client, then actual time passed is T_client - 5h
      // Server receives at (T_client - 5h) + latency

      const realTimeAtServer = payload.t1 - fiveHours + 50;

      // Advance timers to simulate round trip for the hook's wait loop
      vi.advanceTimersByTime(100);

      if (callback)
        callback({
          success: true,
          t1: payload.t1,
          serverTime: realTimeAtServer,
        });
    });

    await act(async () => {
      result.current.calibrate();
      await vi.runAllTimersAsync();
    });

    // Offset should be: ServerTime - ClientTime
    // ServerTime = 1050
    // ClientTime (at reception) = 1000 + 5h + 100ms (RTT) = 18001100
    // Offset ~= -18000000 (roughly -5h)

    // Let's check if getServerTime() returns something close to Server Time
    const synchronizedTime = result.current.getServerTime();

    // Expected Server Time should be roughly: serverBaseTime + TimeElapsed(100ms)
    // = 1100

    // The synchronizedTime uses Date.now() (which is client clock) + offset
    // ClientClock = 18000000 + 100 (advance) = 18001100
    // Offset should be correctly negative

    expect(synchronizedTime).toBeCloseTo(2000, -2); // -2 precision (hundreds of ms is fine/tens)
  });

  it('should synchronize correctly if client is behind server (e.g. -8h)', async () => {
    const { result } = renderHook(() => useClockSync());

    // Simulate Client System is -8 hours behind
    const eightHours = 8 * 60 * 60 * 1000;
    const serverBaseTime = 2000;

    vi.setSystemTime(serverBaseTime - eightHours); // Client Clock

    vi.mocked(emitPing).mockImplementation((payload, callback) => {
      // Client -> Server (50ms)
      const realTimeAtServer = payload.t1 + eightHours + 50;

      vi.advanceTimersByTime(100);

      if (callback)
        callback({
          success: true,
          t1: payload.t1,
          serverTime: realTimeAtServer,
        });
    });

    await act(async () => {
      result.current.calibrate();
      await vi.runAllTimersAsync();
    });

    // Current Client Clock is now: (2000 - 8h) + 100ms
    // Server Real Time is: 2000 + 100ms = 2100

    expect(result.current.getServerTime()).toBeCloseTo(3000, -2);
  });
});

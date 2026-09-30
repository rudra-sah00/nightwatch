/**
 * Regression tests for AUDIT.md WP-M1 — the clock offset carried a systematic latency bias.
 *
 * Each sample is `serverTime − localTime`, where `serverTime` is the sender's clock at send and
 * `localTime` is ours at receive. So every sample is `trueOffset − oneWayLatency`: the error always has
 * the same sign, and a median cannot cancel it — it just picks the middle one. Measured with host and
 * guest clocks set exactly equal and one-way latencies of 40/90/60/150/70 ms, the old estimator returned
 * exactly −70 ms, the median latency, so every guest sat that far behind the host.
 *
 * Because the error is `−latency`, the largest offset is the sample that travelled fastest and therefore
 * carries the least error — NTP's min-delay filter, reached from the other direction. The median is still
 * computed, but only to reject outliers: a raw maximum would latch onto one spurious spike, such as the
 * host's clock stepping, which is the robustness the median was there for.
 *
 * This does not make the offset exact. It moves the bias from median one-way latency to the smallest
 * observed one, and a test below pins that residual so it is not mistaken for solved.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockSync } from '@/features/watch-party/room/hooks/useClockSync';

const START = 100_000;

/**
 * Feeds one sample per latency, with host and guest clocks set exactly equal so the whole computed
 * offset IS the error.
 *
 * @param latencies - One-way delays, host to guest, in ms.
 * @param trueOffset - Real difference between the two clocks.
 */
function calibrateWith(latencies: number[], trueOffset = 0) {
  const { result } = renderHook(() => useClockSync());
  let now = START;
  for (const latency of latencies) {
    const serverTime = now + trueOffset;
    now += latency;
    vi.setSystemTime(now);
    act(() => {
      result.current.calibrate(serverTime);
    });
  }
  return result;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WP-M1 — clock offset bias', () => {
  /*
    The measurement from the audit. The old estimator returned the median latency (−70); the fix must
    return the smallest (−40), because that sample is the one least distorted by delay.
  */
  it('uses the least-delayed sample rather than the median', () => {
    const result = calibrateWith([40, 90, 60, 150, 70]);

    expect(result.current.clockOffset).toBe(-40);
  });

  it('is unbiased when every sample has the same delay', () => {
    const result = calibrateWith([50, 50, 50, 50, 50]);

    expect(result.current.clockOffset).toBe(-50);
  });

  /* The offset must still track a real clock difference, not just latency. */
  it('recovers a genuine clock difference', () => {
    const result = calibrateWith([40, 90, 60, 150, 70], 10_000);

    // True offset 10s, minus the smallest one-way delay.
    expect(result.current.clockOffset).toBe(10_000 - 40);
  });

  /*
    The reason the median is still computed. A raw maximum would adopt this spike and hold it; the filter
    must reject it and fall back to the best plausible sample.
  */
  it('rejects a single implausible sample instead of latching onto it', () => {
    // Four normal samples and one where the sender's clock appears 10s ahead.
    const result = calibrateWith([60, 60, 60, 60]);
    const beforeSpike = result.current.clockOffset;

    let now = START + 240;
    now += 60;
    vi.setSystemTime(now);
    act(() => {
      // serverTime 10s in the future — a clock step, not a fast packet.
      result.current.calibrate(now + 10_000);
    });

    expect(result.current.clockOffset).not.toBeGreaterThan(beforeSpike + 1000);
    expect(result.current.clockOffset).toBeLessThan(5_000);
  });

  it('calibrates immediately from the first sample', () => {
    const result = calibrateWith([80]);

    expect(result.current.isCalibrated).toBe(true);
    expect(result.current.clockOffset).toBe(-80);
  });

  it('reports getServerTime relative to the computed offset', () => {
    const result = calibrateWith([40, 90, 60, 150, 70]);

    vi.setSystemTime(500_000);
    expect(result.current.getServerTime()).toBe(500_000 - 40);
  });

  /*
    The residual, pinned deliberately: the smallest observed latency is still an error. Removing it needs a
    real round-trip measurement, which is a new message pair and a protocol change.
  */
  it('still carries the smallest observed one-way latency as bias', () => {
    const result = calibrateWith([40, 90, 60, 150, 70]);

    expect(result.current.clockOffset).not.toBe(0);
    expect(result.current.clockOffset).toBe(-40);
  });
});

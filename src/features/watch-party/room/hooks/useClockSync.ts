import { useCallback, useRef, useState } from 'react';

const SAMPLE_COUNT = 5;

/**
 * How far from the median a sample may sit and still be believed, in milliseconds.
 *
 * Guards the estimator below against a single bad sample. Ordinary RTM jitter is well inside a second,
 * while the thing this excludes — the host's `Date.now()` stepping, from an NTP correction or the machine
 * waking — moves the offset by far more than that.
 */
const MAX_SAMPLE_DEVIATION_MS = 1000;

/**
 * Hook to synchronize local clock with server time using multi-sample filtering.
 *
 * Collects up to 5 offset samples from incoming RTM messages containing `serverTime`, discards any that
 * sit far from the median, and takes the **largest** of the survivors.
 *
 * ## Why the largest, and not the median
 *
 * Each sample is `serverTime − localTime`, where `serverTime` is the sender's clock at send and
 * `localTime` is ours at receive. So every sample is `trueOffset − oneWayLatency`: the error is always the
 * same sign, and a median therefore does not cancel it, it just picks the middle one. Measured with host
 * and guest clocks set exactly equal and one-way latencies of 40/90/60/150/70 ms, the median estimator
 * returned exactly −70 ms — the median latency — so every guest sat that far behind the host.
 *
 * Because the error is `−latency`, the **largest** offset is the sample that travelled fastest, so it
 * carries the least error. This is the min-delay filter NTP uses, arrived at from the opposite direction:
 * NTP can measure delay and picks the smallest, while here delay is not measurable and the largest offset
 * is its proxy.
 *
 * The median is still computed, as the reference point for rejecting outliers. Taking the raw maximum
 * would latch onto a single spurious spike — a host clock step would be adopted and held — which is the
 * robustness the median was presumably chosen for in the first place. Filtering first keeps that property
 * and drops the bias; and because the window slides, even a spike that somehow survived would age out
 * within five messages rather than persisting.
 *
 * This does not make the offset exact. It reduces the bias from the median one-way latency to the
 * smallest observed one-way latency — in the measured case, from 70 ms to 40 ms. Removing it entirely
 * needs a real round-trip measurement, which is a new message pair and a protocol change.
 */
export function useClockSync() {
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const samplesRef = useRef<number[]>([]);

  /**
   * Calibrate using a server time sample (e.g. from an RTM message).
   * Collects multiple samples and computes the median offset.
   */
  const calibrate = useCallback(
    (serverTime: number, localTime: number = Date.now()) => {
      const offset = serverTime - localTime;
      const samples = samplesRef.current;

      if (samples.length < SAMPLE_COUNT) {
        samples.push(offset);
        if (!isCalibrated) setIsCalibrating(true);
      } else {
        // Sliding window: drop oldest, add newest
        samples.shift();
        samples.push(offset);
      }

      if (samples.length >= SAMPLE_COUNT) {
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        /*
          Least-delayed plausible sample. Every sample is `trueOffset − oneWayLatency`, so the largest
          offset is the one that travelled fastest and carries the least error. The median is kept only
          as the reference for rejecting outliers: taking the raw maximum would latch onto a single
          spurious spike, such as the host's clock stepping, and hold it.
        */
        const plausible = sorted.filter(
          (offset) => Math.abs(offset - median) <= MAX_SAMPLE_DEVIATION_MS,
        );
        const best =
          plausible.length > 0 ? plausible[plausible.length - 1] : median;
        setClockOffset(best);
        setIsCalibrated(true);
        setIsCalibrating(false);
      } else if (samples.length === 1) {
        // Use first sample immediately as initial estimate
        setClockOffset(offset);
        setIsCalibrated(true);
        setIsCalibrating(false);
      }
    },
    [isCalibrated],
  );

  const getServerTime = useCallback(() => {
    return Date.now() + clockOffset;
  }, [clockOffset]);

  return {
    clockOffset,
    isCalibrated,
    isCalibrating,
    calibrate,
    getServerTime,
  };
}

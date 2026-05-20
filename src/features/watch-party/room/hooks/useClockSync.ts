import { useCallback, useRef, useState } from 'react';

const SAMPLE_COUNT = 5;

/**
 * Hook to synchronize local clock with server time using multi-sample median filtering.
 *
 * Collects up to 5 offset samples from incoming RTM messages containing `serverTime`,
 * then uses the median to eliminate jitter outliers.
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
        // Median of sorted samples — robust against outliers
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        setClockOffset(median);
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

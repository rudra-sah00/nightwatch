import { useCallback, useState } from 'react';
import { emitPing } from '../services/watch-party.api';

/**
 * Hook to synchronize local clock with server time using NTP-style handshake
 *
 * Algorithm:
 * 1. Client sends ping with t1 (local time)
 * 2. Server responds with serverTime
 * 3. Client receives response at t4 (local time)
 * 4. Latency = (t4 - t1) / 2
 * 5. Clock Offset = serverTime - (t1 + latency)
 *
 * We take multiple samples and use the median to filter out network jitter.
 */
export function useClockSync() {
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Calculate offset from a single sample
  const calculateSample = useCallback(() => {
    const t1 = Date.now();
    return new Promise<number>((resolve, reject) => {
      emitPing({ t1 }, (response) => {
        if (!response.success || !response.serverTime) {
          reject(new Error('Failed to sync clock'));
          return;
        }

        const t4 = Date.now();
        const roundTrip = t4 - t1;
        const latency = roundTrip / 2;

        // serverTime = localTime + offset
        // offset = serverTime - localTime
        // offset = serverTime - (t1 + latency)
        const offset = response.serverTime - (t1 + latency);

        resolve(offset);
      });
    });
  }, []);

  const calibrate = useCallback(async () => {
    if (isCalibrating) return;

    setIsCalibrating(true);
    const samples: number[] = [];

    try {
      // Take 5 samples with a small delay between them
      for (let i = 0; i < 5; i++) {
        try {
          const offset = await calculateSample();
          samples.push(offset);
        } catch (_e) {}
        // Small delay to avoid flooding and allow network buffers to clear
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (samples.length > 0) {
        // Sort to find median
        samples.sort((a, b) => a - b);
        const medianOffset = samples[Math.floor(samples.length / 2)];

        setClockOffset(medianOffset);
        setIsCalibrated(true);
      }
    } finally {
      setIsCalibrating(false);
    }
  }, [isCalibrating, calculateSample]);

  // Get current server time based on local clock and calculated offset
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

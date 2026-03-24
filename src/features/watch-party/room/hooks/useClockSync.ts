import { useCallback, useState } from 'react';

/**
 * Hook to synchronize local clock with server time.
 *
 * Simplified for Agora RTM:
 * - We can calibrate using the `serverTime` provided in RTM messages.
 * - Offset = serverTime - (localTransmitTime + estimatedLatency)
 * - Or more simply for one-way: Offset = serverTime - localReceiveTime
 */
export function useClockSync() {
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isCalibrating, _setIsCalibrating] = useState(false);

  /**
   * Calibrate using a server time sample (e.g. from an RTM message)
   * @param serverTime The timestamp from the server/sender
   * @param localTime The local timestamp when the message was received (optional, defaults to now)
   */
  const calibrate = useCallback(
    (serverTime: number, localTime: number = Date.now()) => {
      // Basic one-way sync: serverTime = localTime + offset
      const offset = serverTime - localTime;

      // We update the offset using a moving average or just replace it for now
      // In a premium implementation, we might filter outliers or use multiple samples
      setClockOffset(offset);
      setIsCalibrated(true);
    },
    [],
  );

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

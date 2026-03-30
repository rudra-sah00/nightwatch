'use client';

import { useEffect, useRef } from 'react';
import { WS_EVENTS } from '@/lib/constants';
import { useSocket } from '@/providers/socket-provider';

interface UseStreamRevocationOptions {
  onRevoked: (reason: string) => void;
  // If true, the hook will ignore revocation events for a short period (e.g. during tab refresh/content switch)
  isReplacingSession?: boolean;
}

/**
 * Unified hook to handle stream revocation events from the backend.
 * Used to enforce single-stream playback (Solo, Watch Party Host, etc.)
 */
export function useStreamRevocation({
  onRevoked,
  isReplacingSession = false,
}: UseStreamRevocationOptions) {
  const { socket } = useSocket();
  const isReplacingRef = useRef(isReplacingSession);

  // Keep ref sync with prop
  useEffect(() => {
    isReplacingRef.current = isReplacingSession;
  }, [isReplacingSession]);

  useEffect(() => {
    if (!socket) return;

    const handleStreamRevoked = (data: {
      reason: string;
      message?: string;
    }) => {
      // If we are currently in the middle of a valid session swap (e.g. switching episodes),
      // ignore the revocation of the *old* session that we just replaced.
      if (isReplacingRef.current) {
        return;
      }

      onRevoked(data.reason);
    };

    socket.on(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    return () => {
      socket.off(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    };
  }, [socket, onRevoked]);
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CastContentPayload,
  REMOTE_EVENTS,
  type TvAvailablePayload,
} from '@/features/remote-control/types';
import { useSocket } from '@/providers/socket-provider';

/**
 * Mobile/Desktop hook that discovers available TVs on the network.
 * Listens for `remote:tv_available` broadcasts and provides a cast function.
 */
export function useAvailableTvs() {
  const { socket } = useSocket();
  const [tvs, setTvs] = useState<Map<string, TvAvailablePayload>>(new Map());
  const cleanupRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!socket) return;

    const onTvAvailable = (data: TvAvailablePayload) => {
      if (data.socketId === socket.id) return;
      setTvs((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, data);
        return next;
      });
    };

    // Remove stale TVs that haven't advertised in 90s
    cleanupRef.current = setInterval(() => {
      // TVs advertise every 60s; if we haven't heard in 90s, remove
      // For simplicity, we clear all and let next broadcast repopulate
      setTvs(new Map());
    }, 90_000);

    socket.on(REMOTE_EVENTS.TV_AVAILABLE, onTvAvailable);

    return () => {
      clearInterval(cleanupRef.current);
      socket.off(REMOTE_EVENTS.TV_AVAILABLE, onTvAvailable);
    };
  }, [socket]);

  const castToTv = useCallback(
    (targetSocketId: string, content: CastContentPayload) => {
      if (!socket?.connected) return;
      socket.emit(REMOTE_EVENTS.CAST_CONTENT, {
        targetSocketId,
        ...content,
      });
    },
    [socket],
  );

  return { tvs: Array.from(tvs.values()), castToTv };
}

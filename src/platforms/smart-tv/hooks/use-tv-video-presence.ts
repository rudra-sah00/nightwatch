'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  type CastContentPayload,
  REMOTE_EVENTS,
} from '@/features/remote-control/types';
import { useSocket } from '@/providers/socket-provider';
import { isTV } from '../lib/detection';

/**
 * Global TV presence hook — always mounted in TvRootLayout.
 * Emits `remote:tv_available` every 60s so mobile/desktop can discover this TV.
 * Listens for `remote:cast_content` to navigate to the cast target.
 */
export function useTvVideoPresence() {
  const { socket } = useSocket();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!socket || !isTV()) return;

    const advertise = () => {
      if (socket.connected) {
        socket.emit(REMOTE_EVENTS.TV_AVAILABLE, {
          socketId: socket.id,
          deviceName: 'Android TV',
        });
      }
    };

    const onCast = (data: CastContentPayload) => {
      if (data.movieId) {
        router.push(`/watch/${data.movieId}`);
      }
    };

    advertise();
    intervalRef.current = setInterval(advertise, 60_000);
    socket.on('connect', advertise);
    socket.on(REMOTE_EVENTS.CAST_CONTENT, onCast);

    return () => {
      clearInterval(intervalRef.current);
      socket.off('connect', advertise);
      socket.off(REMOTE_EVENTS.CAST_CONTENT, onCast);
    };
  }, [socket, router]);
}

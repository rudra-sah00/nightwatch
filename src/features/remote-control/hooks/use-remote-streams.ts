'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import type { RemoteStreamAdvertise, RemoteStreamEnded } from '../types';
import { REMOTE_EVENTS } from '../types';

/**
 * Mobile hook that tracks active streams from other devices (desktop/laptop).
 * Listens for stream_advertise and stream_ended events to maintain a live list.
 */
export function useRemoteStreams() {
  const { socket } = useSocket();
  const [streams, setStreams] = useState<Map<string, RemoteStreamAdvertise>>(
    new Map(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onAdvertise = (data: RemoteStreamAdvertise) => {
      if (!mountedRef.current) return;
      // Don't show our own device
      if (data.socketId === socket.id) return;
      setStreams((prev) => {
        const next = new Map(prev);
        // Remove any stale entry from the same device (reconnect produces new socketId)
        for (const [id, stream] of next) {
          if (stream.deviceName === data.deviceName && id !== data.socketId) {
            next.delete(id);
          }
        }
        next.set(data.socketId, data);
        return next;
      });
    };

    const onEnded = (data: RemoteStreamEnded) => {
      if (!mountedRef.current) return;
      setStreams((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
      setSelectedId((prev) => (prev === data.socketId ? null : prev));
    };

    const requestAdvertise = () => {
      if (socket.connected) {
        socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);
      }
    };

    socket.on(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);
    socket.on(REMOTE_EVENTS.STREAM_ENDED, onEnded);

    // Request with retry: if socket isn't connected yet or desktop is slow to respond,
    // retry a few times with backoff to ensure discovery
    requestAdvertise();
    const t1 = setTimeout(requestAdvertise, 1_000);
    const t2 = setTimeout(requestAdvertise, 3_000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      socket.off(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);
      socket.off(REMOTE_EVENTS.STREAM_ENDED, onEnded);
    };
  }, [socket]);

  // Re-request on reconnect (socket gets new id, need fresh advertise from desktop)
  useEffect(() => {
    if (!socket) return;
    let retryTimeout: NodeJS.Timeout | null = null;
    const onConnect = () => {
      // Clear stale streams from previous connection
      setStreams(new Map());
      setSelectedId(null);
      // Request fresh advertise with retry
      socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);
      retryTimeout = setTimeout(() => {
        if (socket.connected) socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);
      }, 1_500);
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [socket]);

  // Re-request when app comes back to foreground (mobile)
  useEffect(() => {
    if (!checkIsMobile() || !socket) return;
    let unlisten: (() => void) | undefined;
    import('@/lib/mobile-bridge').then(({ mobileBridge }) => {
      unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
        if (isActive && socket.connected) {
          socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);
        }
      });
    });
    return () => unlisten?.();
  }, [socket]);

  const streamList = Array.from(streams.values());
  const activeStream = selectedId
    ? streams.get(selectedId) || streamList[0] || null
    : streamList[0] || null;

  const selectStream = useCallback((socketId: string) => {
    setSelectedId(socketId);
  }, []);

  return { streams: streamList, activeStream, selectStream };
}

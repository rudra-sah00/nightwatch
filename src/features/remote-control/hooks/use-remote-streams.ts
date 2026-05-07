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
      setStreams((prev) => {
        const next = new Map(prev);
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

    socket.on(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);
    socket.on(REMOTE_EVENTS.STREAM_ENDED, onEnded);

    // Ask other devices to advertise on mount
    socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);

    return () => {
      socket.off(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);
      socket.off(REMOTE_EVENTS.STREAM_ENDED, onEnded);
    };
  }, [socket]);

  // Re-request on reconnect
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => socket.emit(REMOTE_EVENTS.REQUEST_ADVERTISE);
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
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

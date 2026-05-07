'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

export interface MusicDevice {
  socketId: string;
  deviceName: string;
  isPlaying: boolean;
  isCurrent: boolean;
}

interface DeviceOnlinePayload {
  socketId: string;
  deviceName: string;
  isPlaying: boolean;
}

interface TransferPayload {
  track: unknown;
  queue: unknown[];
  progress: number;
  isPlaying: boolean;
}

const EVENTS = {
  DEVICE_ONLINE: 'music:device_online',
  DEVICE_OFFLINE: 'music:device_offline',
  TRANSFER_PLAYBACK: 'music:transfer_playback',
  REQUEST_DEVICES: 'music:request_devices',
} as const;

/**
 * Hook that manages music device discovery and playback transfer.
 * Each device advertises itself on mount; other devices appear in the list.
 */
export function useMusicDevices(deviceName: string, isPlaying: boolean) {
  const { socket } = useSocket();
  const [devices, setDevices] = useState<Map<string, MusicDevice>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Advertise this device
  useEffect(() => {
    if (!socket?.connected) return;

    const advertise = () => {
      socket.emit(EVENTS.DEVICE_ONLINE, {
        deviceName,
        isPlaying: isPlayingRef.current,
      });
    };

    advertise();
    heartbeatRef.current = setInterval(advertise, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.emit(EVENTS.DEVICE_OFFLINE);
    };
  }, [socket, deviceName]);

  // Re-advertise when play state changes
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit(EVENTS.DEVICE_ONLINE, { deviceName, isPlaying });
  }, [socket, deviceName, isPlaying]);

  // Listen for other devices
  useEffect(() => {
    if (!socket) return;

    const onOnline = (data: DeviceOnlinePayload) => {
      if (data.socketId === socket.id) return;
      setDevices((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, {
          socketId: data.socketId,
          deviceName: data.deviceName,
          isPlaying: data.isPlaying,
          isCurrent: false,
        });
        return next;
      });
    };

    const onOffline = (data: { socketId: string }) => {
      setDevices((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
    };

    const onRequestDevices = () => {
      socket.emit(EVENTS.DEVICE_ONLINE, { deviceName, isPlaying });
    };

    socket.on(EVENTS.DEVICE_ONLINE, onOnline);
    socket.on(EVENTS.DEVICE_OFFLINE, onOffline);
    socket.on(EVENTS.REQUEST_DEVICES, onRequestDevices);
    socket.on('connect', () => socket.emit(EVENTS.REQUEST_DEVICES));

    // Discover existing devices
    socket.emit(EVENTS.REQUEST_DEVICES);

    return () => {
      socket.off(EVENTS.DEVICE_ONLINE, onOnline);
      socket.off(EVENTS.DEVICE_OFFLINE, onOffline);
      socket.off(EVENTS.REQUEST_DEVICES, onRequestDevices);
    };
  }, [socket, deviceName, isPlaying]);

  const transferTo = useCallback(
    (
      targetSocketId: string,
      track: unknown,
      queue: unknown[],
      progress: number,
      playing: boolean,
    ) => {
      if (!socket) return;
      socket.emit(EVENTS.TRANSFER_PLAYBACK, {
        targetSocketId,
        track,
        queue,
        progress,
        isPlaying: playing,
      });
    },
    [socket],
  );

  const onTransfer = useCallback(
    (handler: (data: TransferPayload) => void) => {
      if (!socket) return () => {};
      socket.on(EVENTS.TRANSFER_PLAYBACK, handler);
      return () => {
        socket.off(EVENTS.TRANSFER_PLAYBACK, handler);
      };
    },
    [socket],
  );

  return {
    devices: Array.from(devices.values()),
    transferTo,
    onTransfer,
  };
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import type { MusicDevice } from '../hooks/use-music-devices';

const BLOCKED_ROUTES = ['/watch/', '/live/', '/watch-party/'];

function getDeviceName(): string {
  if (checkIsDesktop()) return 'Desktop App';
  if (checkIsMobile()) return 'Mobile';
  return 'Web Player';
}

/**
 * Headless component that:
 * 1. Advertises this device globally (heartbeat every 60s)
 * 2. Discovers other devices (listens for device_online/offline)
 * 3. Stores device list in window event for MusicDevicePicker to consume
 *
 * Renders `null` — side-effect only.
 */
export function MusicDeviceSync() {
  const { socket } = useSocket();
  const { isPlaying } = useMusicPlayerContext();
  const pathname = usePathname();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const deviceName = getDeviceName();
  const available = !BLOCKED_ROUTES.some((r) => pathname.startsWith(r));
  const availableRef = useRef(available);
  availableRef.current = available;

  // ─── Advertise this device ──────────────────────────────────────

  useEffect(() => {
    if (!socket?.connected) return;

    const advertise = () => {
      socket.emit('music:device_online', {
        deviceName,
        isPlaying: isPlayingRef.current,
        available: availableRef.current,
      });
    };

    advertise();
    heartbeatRef.current = setInterval(advertise, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.emit('music:device_offline');
    };
  }, [socket, deviceName]);

  // Re-advertise on state/availability change
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('music:device_online', { deviceName, isPlaying, available });
  }, [socket, deviceName, isPlaying, available]);

  // ─── Discover other devices ─────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onOnline = (data: MusicDevice & { socketId: string }) => {
      if (data.socketId === socket.id) return;
      window.dispatchEvent(
        new CustomEvent('music:device-update', {
          detail: { type: 'online', device: data },
        }),
      );
    };

    const onOffline = (data: { socketId: string }) => {
      window.dispatchEvent(
        new CustomEvent('music:device-update', {
          detail: { type: 'offline', socketId: data.socketId },
        }),
      );
    };

    const onRequestDevices = () => {
      socket.emit('music:device_online', {
        deviceName,
        isPlaying: isPlayingRef.current,
        available: availableRef.current,
      });
    };

    socket.on('music:device_online', onOnline);
    socket.on('music:device_offline', onOffline);
    socket.on('music:request_devices', onRequestDevices);

    // Discover existing devices on connect
    socket.emit('music:request_devices');
    socket.on('connect', () => socket.emit('music:request_devices'));

    return () => {
      socket.off('music:device_online', onOnline);
      socket.off('music:device_offline', onOffline);
      socket.off('music:request_devices', onRequestDevices);
    };
  }, [socket, deviceName]);

  return null;
}

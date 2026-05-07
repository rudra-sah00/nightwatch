'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

const BLOCKED_ROUTES = ['/watch/', '/live/', '/watch-party/'];

function getDeviceName(): string {
  if (checkIsDesktop()) return 'Desktop App';
  if (checkIsMobile()) return 'Mobile';
  return 'Web Player';
}

/**
 * Headless component that advertises this device for music playback
 * on every page (not just /music). Ensures other devices can always
 * see this one in the device picker.
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

  return null;
}

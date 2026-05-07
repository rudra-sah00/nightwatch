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
 * 3. Handles single-device playback (stops local when another device starts)
 * 4. Broadcasts local playback start to other devices
 *
 * Renders `null` — side-effect only.
 */
export function MusicDeviceSync() {
  const { socket } = useSocket();
  const { isPlaying, currentTrack, progress, duration, setRemoteControlling } =
    useMusicPlayerContext();
  const pathname = usePathname();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const prevTrackIdRef = useRef<string | null>(null);

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

  // ─── Single-device playback enforcement ─────────────────────────

  // Broadcast when this device starts playing a new track
  useEffect(() => {
    if (!socket?.connected || !currentTrack || !isPlaying) return;
    if (prevTrackIdRef.current === currentTrack.id) return;
    prevTrackIdRef.current = currentTrack.id;

    socket.emit('music:playback_started', {
      deviceName,
      track: currentTrack,
      isPlaying: true,
      progress,
      duration,
    });
    // Clear remote state since we are now the active player
    setRemoteControlling(false);
  }, [
    socket,
    currentTrack,
    isPlaying,
    deviceName,
    progress,
    duration,
    setRemoteControlling,
  ]);

  // Listen for other devices starting playback → set remote state
  useEffect(() => {
    if (!socket) return;

    const onPlaybackStarted = (data: {
      socketId: string;
      deviceName: string;
      track: unknown;
      isPlaying: boolean;
    }) => {
      if (data.socketId === socket.id) return;
      // Another device started playing → we become passive observer
      // Stop local playback if any
      window.dispatchEvent(
        new CustomEvent('music:remote-takeover', { detail: data }),
      );
      setRemoteControlling(
        true,
        data.track as Parameters<typeof setRemoteControlling>[1],
        data.isPlaying,
      );
    };

    socket.on('music:playback_started', onPlaybackStarted);
    return () => {
      socket.off('music:playback_started', onPlaybackStarted);
    };
  }, [socket, setRemoteControlling]);

  return null;
}

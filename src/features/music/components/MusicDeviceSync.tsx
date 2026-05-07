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
 * 5. Throttled state_update broadcast (every 5s, not every 250ms)
 *
 * Renders `null` — side-effect only.
 */
export function MusicDeviceSync() {
  const { socket } = useSocket();
  const {
    isPlaying,
    currentTrack,
    progress,
    duration,
    setRemoteControlling,
    isRemoteControlling,
  } = useMusicPlayerContext();
  const pathname = usePathname();

  const deviceName = getDeviceName();
  const available = !BLOCKED_ROUTES.some((r) => pathname.startsWith(r));

  // Refs for values accessed in intervals/callbacks (avoid stale closures)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const stateUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const availableRef = useRef(available);
  const prevTrackIdRef = useRef<string | null>(null);
  const currentTrackRef = useRef(currentTrack);
  const progressRef = useRef(progress);
  const durationRef = useRef(duration);

  // Keep refs in sync
  isPlayingRef.current = isPlaying;
  availableRef.current = available;
  currentTrackRef.current = currentTrack;
  progressRef.current = progress;
  durationRef.current = duration;

  // ─── 1. Advertise this device (heartbeat 60s) ──────────────────

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

  // Re-advertise on play state or availability change
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('music:device_online', { deviceName, isPlaying, available });
  }, [socket, deviceName, isPlaying, available]);

  // ─── 2. Discover other devices ─────────────────────────────────

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
    socket.emit('music:request_devices');
    socket.on('connect', () => socket.emit('music:request_devices'));

    return () => {
      socket.off('music:device_online', onOnline);
      socket.off('music:device_offline', onOffline);
      socket.off('music:request_devices', onRequestDevices);
    };
  }, [socket, deviceName]);

  // ─── 3. Broadcast playback_started on NEW track only ───────────

  useEffect(() => {
    if (!socket?.connected) return;
    const track = currentTrackRef.current;
    if (!track || !isPlayingRef.current) return;
    if (prevTrackIdRef.current === track.id) return;
    prevTrackIdRef.current = track.id;

    socket.emit('music:playback_started', {
      deviceName,
      track,
      isPlaying: true,
      progress: progressRef.current,
      duration: durationRef.current,
    });
    setRemoteControlling(false);
  }, [socket, deviceName, setRemoteControlling]);

  // ─── 4. Throttled state_update broadcast (every 5s) ────────────

  useEffect(() => {
    if (
      !socket?.connected ||
      !currentTrack ||
      !isPlaying ||
      isRemoteControlling
    ) {
      if (stateUpdateRef.current) {
        clearInterval(stateUpdateRef.current);
        stateUpdateRef.current = null;
      }
      return;
    }

    const emitState = () => {
      socket.emit('music:state_update', {
        track: currentTrackRef.current,
        isPlaying: isPlayingRef.current,
        progress: progressRef.current,
        duration: durationRef.current,
      });
    };

    // Emit immediately on play/pause change
    emitState();
    // Then every 5s for position sync
    stateUpdateRef.current = setInterval(emitState, 5000);

    return () => {
      if (stateUpdateRef.current) {
        clearInterval(stateUpdateRef.current);
        stateUpdateRef.current = null;
      }
    };
  }, [socket, isPlaying, currentTrack?.id, isRemoteControlling, currentTrack]);

  // ─── 5. Listen for other devices starting playback ─────────────

  useEffect(() => {
    if (!socket) return;

    const onPlaybackStarted = (data: {
      socketId: string;
      deviceName: string;
      track: unknown;
      isPlaying: boolean;
    }) => {
      if (data.socketId === socket.id) return;
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

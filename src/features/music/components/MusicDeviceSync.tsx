'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';
import type { MusicDevice } from '../hooks/use-music-devices';
import { getDeviceName } from '../utils';

const BLOCKED_ROUTES = ['/watch/', '/live/', '/watch-party/'];

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
    queue,
    setRemoteControlling,
    isRemoteControlling,
    play,
    seek,
    togglePlay,
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
  const queueRef = useRef(queue);

  // Keep refs in sync
  isPlayingRef.current = isPlaying;
  availableRef.current = available;
  currentTrackRef.current = currentTrack;
  progressRef.current = progress;
  durationRef.current = duration;
  queueRef.current = queue;

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
    socket.emit('music:request_state');
    socket.on('connect', () => {
      socket.emit('music:request_devices');
      socket.emit('music:request_state');
    });

    // Respond to state requests from other devices
    const onRequestState = () => {
      if (currentTrackRef.current && isPlayingRef.current) {
        socket.emit('music:state_update', {
          track: currentTrackRef.current,
          isPlaying: isPlayingRef.current,
          progress: progressRef.current,
          duration: durationRef.current,
          queue: queueRef.current,
        });
      }
    };
    socket.on('music:request_state', onRequestState);

    return () => {
      socket.off('music:device_online', onOnline);
      socket.off('music:device_offline', onOffline);
      socket.off('music:request_devices', onRequestDevices);
      socket.off('music:request_state', onRequestState);
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

  const wasPlayingRef = useRef(false);

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
      // Emit a final state update so remote controllers know we paused/stopped
      if (socket?.connected && wasPlayingRef.current && !isRemoteControlling) {
        socket.emit('music:state_update', {
          track: currentTrackRef.current, // null = stopped, non-null = paused
          isPlaying: false,
          progress: progressRef.current,
          duration: durationRef.current,
          queue: queueRef.current,
        });
      }
      wasPlayingRef.current = false;
      return;
    }

    wasPlayingRef.current = true;

    const emitState = () => {
      socket.emit('music:state_update', {
        track: currentTrackRef.current,
        isPlaying: isPlayingRef.current,
        progress: progressRef.current,
        duration: durationRef.current,
        queue: queueRef.current,
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

  const remoteSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onPlaybackStarted = (data: {
      socketId: string;
      deviceName: string;
      track: unknown;
      isPlaying: boolean;
    }) => {
      if (data.socketId === socket.id) return;
      remoteSourceRef.current = data.socketId;
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

  // ─── 6. Auto-sync: pick up what's playing on other devices on page load ─

  useEffect(() => {
    if (!socket) return;

    const onStateUpdate = (data: {
      socketId: string;
      track: Parameters<typeof setRemoteControlling>[1];
      isPlaying: boolean;
      progress: number;
      duration: number;
      queue?: import('../api').MusicTrack[];
    }) => {
      if (data.socketId === socket.id) return;
      // Only auto-sync if we're not playing locally
      if (currentTrackRef.current && isPlayingRef.current) return;

      // Target fully stopped (no track) — clear remote state
      if (!data.track && remoteSourceRef.current === data.socketId) {
        remoteSourceRef.current = null;
        setRemoteControlling(false);
        return;
      }

      // Target has a track (playing or paused) — sync state
      if (data.track) {
        remoteSourceRef.current = data.socketId;
        setRemoteControlling(
          true,
          data.track,
          data.isPlaying,
          data.progress,
          data.duration,
          data.queue,
        );
      }
    };

    socket.on('music:state_update', onStateUpdate);
    return () => {
      socket.off('music:state_update', onStateUpdate);
    };
  }, [socket, setRemoteControlling]);

  // ─── 6. Handle incoming transfer (receive playback from another device) ─

  useEffect(() => {
    if (!socket) return;

    const onTransfer = (data: {
      track: Parameters<typeof play>[0];
      queue: Parameters<typeof play>[1];
      progress: number;
      isPlaying: boolean;
    }) => {
      if (!availableRef.current) return;
      window.dispatchEvent(new CustomEvent('music:transfer-received'));
      play(data.track, data.queue ?? []);
      setTimeout(() => {
        seek(data.progress);
        if (!data.isPlaying) togglePlay();
      }, 500);
    };

    socket.on('music:transfer_playback', onTransfer);
    return () => {
      socket.off('music:transfer_playback', onTransfer);
    };
  }, [socket, play, seek, togglePlay]);

  // ─── 7. Forward remote commands to the source device ───────────
  // When auto-synced (no explicit activeTarget in useMusicDevices),
  // the FullPlayer/MiniPlayer dispatch 'music:remote-command' events.
  // Forward them directly via socket to the tracked remote source.

  useEffect(() => {
    if (!socket) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const target = remoteSourceRef.current;
      if (!target) return;

      const command = typeof detail === 'string' ? detail : detail?.command;
      const value = typeof detail === 'object' ? detail?.value : undefined;

      socket.emit('music:command', {
        targetSocketId: target,
        command,
        value,
      });
    };

    window.addEventListener('music:remote-command', handler);
    return () => window.removeEventListener('music:remote-command', handler);
  }, [socket]);

  return null;
}

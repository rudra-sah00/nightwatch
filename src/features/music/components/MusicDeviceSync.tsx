'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import {
  useMusicPlaybackProgress,
  useMusicPlayerContext,
} from '../context/MusicPlayerContext';
import type { MusicDevice } from '../hooks/use-music-devices';
import { getDeviceId, getDeviceName } from '../utils';

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
    queue,
    setRemoteControlling,
    isRemoteControlling,
    play,
    togglePlay,
  } = useMusicPlayerContext();
  const { progress, duration } = useMusicPlaybackProgress();
  const pathname = usePathname();

  const deviceName = getDeviceName();
  const deviceId = getDeviceId();
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
        deviceId,
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
  }, [socket, deviceId, deviceName]);

  // Re-advertise on play state or availability change
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('music:device_online', {
      deviceId,
      deviceName,
      isPlaying,
      available,
    });
  }, [socket, deviceId, deviceName, isPlaying, available]);

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
      // Clear remote source if the playing device disconnected
      if (remoteSourceRef.current === data.socketId) {
        remoteSourceRef.current = null;
        setRemoteControlling(false);
      }
    };

    const onRequestDevices = () => {
      socket.emit('music:device_online', {
        deviceId,
        deviceName,
        isPlaying: isPlayingRef.current,
        available: availableRef.current,
      });
    };

    const onConnect = () => {
      socket.emit('music:request_devices');
      socket.emit('music:request_state');
      // Don't clear remote state on reconnect — let the state_update response
      // confirm or deny. Only clear if no response arrives within 10s.
      if (remoteSourceRef.current) {
        const staleSource = remoteSourceRef.current;
        setTimeout(() => {
          // If remoteSourceRef hasn't been updated (no state_update received),
          // the remote device is likely gone
          if (remoteSourceRef.current === staleSource) {
            remoteSourceRef.current = null;
            setRemoteControlling(false);
          }
        }, 10000);
      }
    };

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

    socket.on('music:device_online', onOnline);
    socket.on('music:device_offline', onOffline);
    socket.on('music:request_devices', onRequestDevices);
    socket.on('music:request_state', onRequestState);
    socket.on('connect', onConnect);
    socket.emit('music:request_devices');
    socket.emit('music:request_state');

    return () => {
      socket.off('music:device_online', onOnline);
      socket.off('music:device_offline', onOffline);
      socket.off('music:request_devices', onRequestDevices);
      socket.off('music:request_state', onRequestState);
      socket.off('connect', onConnect);
    };
  }, [socket, deviceId, deviceName, setRemoteControlling]);

  // ─── 3. Broadcast playback_started on NEW track only ───────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentTrack?.id triggers re-run on track change (reads from ref inside)
  useEffect(() => {
    if (!socket?.connected) return;
    const track = currentTrackRef.current;
    if (!track || !isPlayingRef.current) {
      // Reset so replaying the same track after stop still broadcasts
      if (!track) prevTrackIdRef.current = null;
      return;
    }
    if (prevTrackIdRef.current === track.id) return;
    prevTrackIdRef.current = track.id;

    socket.emit('music:playback_started', {
      deviceId,
      deviceName,
      track,
      isPlaying: true,
      progress: progressRef.current,
      duration: durationRef.current,
    });
    setRemoteControlling(false);
  }, [socket, deviceName, setRemoteControlling, currentTrack?.id]);

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

  // Guard: when reclaiming playback, block auto-sync until local playback starts.
  // playTrack is async (fetches stream URL), so isPlayingRef.current may still be
  // false when the next state_update arrives from the other device.
  const reclaimingRef = useRef(false);
  const reclaimTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onReclaim = () => {
      reclaimingRef.current = true;
      // Fallback: clear after 10s if playback never starts (e.g. stream error)
      if (reclaimTimeoutRef.current) clearTimeout(reclaimTimeoutRef.current);
      reclaimTimeoutRef.current = setTimeout(() => {
        reclaimingRef.current = false;
        reclaimTimeoutRef.current = null;
      }, 10000);
    };
    // Clear the guard once local playback actually starts
    const onPlaying = () => {
      reclaimingRef.current = false;
      if (reclaimTimeoutRef.current) {
        clearTimeout(reclaimTimeoutRef.current);
        reclaimTimeoutRef.current = null;
      }
    };
    window.addEventListener('music:reclaim-started', onReclaim);
    window.addEventListener('music:transfer-playing', onPlaying);
    return () => {
      window.removeEventListener('music:reclaim-started', onReclaim);
      window.removeEventListener('music:transfer-playing', onPlaying);
      if (reclaimTimeoutRef.current) clearTimeout(reclaimTimeoutRef.current);
    };
  }, []);

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
      // Block auto-sync if we're playing locally OR reclaiming (playTrack in progress)
      if (currentTrackRef.current && isPlayingRef.current) return;
      if (reclaimingRef.current) return;

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
      setRemoteControlling(false);
      reclaimingRef.current = true;
      // Use startAt parameter for reliable seek after load
      play(
        data.track,
        data.queue ?? [],
        data.progress > 0 ? data.progress : undefined,
      );
      // If transfer was paused, pause once playback actually starts
      if (!data.isPlaying) {
        const onPlaying = () => {
          window.removeEventListener('music:transfer-playing', onPlaying);
          // Small delay ensures engine state is settled before toggling
          setTimeout(() => togglePlay(), 50);
        };
        window.addEventListener('music:transfer-playing', onPlaying);
        // Fallback: if event never fires (e.g. stream error), clean up after 10s
        setTimeout(() => {
          window.removeEventListener('music:transfer-playing', onPlaying);
        }, 10000);
      }
    };

    socket.on('music:transfer_playback', onTransfer);
    return () => {
      socket.off('music:transfer_playback', onTransfer);
    };
  }, [socket, play, togglePlay, setRemoteControlling]);

  // ─── 7. Forward remote commands to the source device ───────────
  // Single command router: handles BOTH auto-synced (remoteSourceRef) and
  // explicit target (sessionStorage) cases. MusicDevicePicker no longer
  // has its own listener — all routing goes through here.

  useEffect(() => {
    if (!socket) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const command = typeof detail === 'string' ? detail : detail?.command;
      const value = typeof detail === 'object' ? detail?.value : undefined;

      // Determine target: explicit target takes priority over auto-synced source
      const explicitTarget = sessionStorage.getItem(
        'nightwatch:music-active-target',
      );
      const target = explicitTarget || remoteSourceRef.current;
      if (!target) return;

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

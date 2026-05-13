'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { MusicTrack } from '../api';

export interface MusicDevice {
  socketId: string;
  deviceId: string;
  deviceName: string;
  isPlaying: boolean;
  available: boolean;
}

/** State of what's playing on the active target device */
export interface RemoteMusicState {
  track: MusicTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: MusicTrack[];
}

interface TransferPayload {
  track: MusicTrack;
  queue: MusicTrack[];
  progress: number;
  isPlaying: boolean;
}

const EVENTS = {
  DEVICE_ONLINE: 'music:device_online',
  DEVICE_OFFLINE: 'music:device_offline',
  TRANSFER_PLAYBACK: 'music:transfer_playback',
  REQUEST_DEVICES: 'music:request_devices',
  STATE_UPDATE: 'music:state_update',
  COMMAND: 'music:command',
} as const;

/**
 * Full Spotify Connect-like hook for music device management.
 *
 * Handles:
 * - Device discovery (advertise self, listen for others)
 * - Playback transfer (send track+queue+position to target)
 * - Remote state sync (receive what's playing on target)
 * - Remote commands (send play/pause/next/prev/seek to target)
 * - Incoming commands (respond to commands from controller)
 */
export function useMusicDevices(
  currentTrack: MusicTrack | null,
  isPlaying: boolean,
  progress: number,
  _duration: number,
) {
  const { socket } = useSocket();
  const [devices, setDevices] = useState<Map<string, MusicDevice>>(new Map());
  const [activeTarget, setActiveTargetRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('nightwatch:music-active-target');
  });
  const activeTargetRef = useRef(activeTarget);
  activeTargetRef.current = activeTarget;

  // Persist target device ID for reconnection matching
  const activeTargetDeviceIdRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('nightwatch:music-active-target-device-id')
      : null,
  );

  const setActiveTarget = useCallback(
    (value: string | null, deviceId?: string) => {
      setActiveTargetRaw(value);
      activeTargetRef.current = value;
      if (value) {
        sessionStorage.setItem('nightwatch:music-active-target', value);
        if (deviceId) {
          sessionStorage.setItem(
            'nightwatch:music-active-target-device-id',
            deviceId,
          );
          activeTargetDeviceIdRef.current = deviceId;
        }
      } else {
        sessionStorage.removeItem('nightwatch:music-active-target');
        sessionStorage.removeItem('nightwatch:music-active-target-device-id');
        activeTargetDeviceIdRef.current = null;
      }
    },
    [],
  );
  const [remoteState, setRemoteState] = useState<RemoteMusicState>({
    track: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    queue: [],
  });

  // ─── Listen for other devices (advertising handled by MusicDeviceSync) ─

  useEffect(() => {
    if (!socket) return;

    // Clear stale activeTarget if no matching device discovered within 10s
    let staleTimer: NodeJS.Timeout | null = null;
    if (activeTargetRef.current) {
      staleTimer = setTimeout(() => {
        setDevices((current) => {
          if (!activeTargetRef.current) return current;
          // Check if target exists by socket ID
          if (current.has(activeTargetRef.current)) return current;
          // Check if target exists by deviceId (reconnected with new socket ID)
          if (activeTargetDeviceIdRef.current) {
            for (const [sid, dev] of current) {
              if (dev.deviceId === activeTargetDeviceIdRef.current) {
                setActiveTarget(sid, dev.deviceId);
                return current;
              }
            }
          }
          // No match found — clear
          setActiveTarget(null);
          return current;
        });
      }, 10000);
    }

    // Listen for device updates from MusicDeviceSync (which runs globally)
    const onDeviceUpdate = (e: Event) => {
      const { type, device, socketId } = (e as CustomEvent).detail;
      if (type === 'online') {
        setDevices((prev) => {
          const next = new Map(prev);
          next.set(device.socketId, device);
          return next;
        });
        // Auto-reconnect: if this device matches our target by deviceId but has a new socket ID
        if (
          activeTargetDeviceIdRef.current &&
          device.deviceId === activeTargetDeviceIdRef.current &&
          activeTargetRef.current !== device.socketId
        ) {
          setActiveTarget(device.socketId, device.deviceId);
        }
      } else if (type === 'offline') {
        setDevices((prev) => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
        // Don't clear activeTarget on offline if we have a deviceId to reconnect with
        if (activeTargetRef.current === socketId) {
          if (!activeTargetDeviceIdRef.current) {
            setActiveTarget(null);
          }
        }
      }
    };

    window.addEventListener('music:device-update', onDeviceUpdate);

    // Also request devices on mount (MusicDeviceSync handles the socket emit)
    socket.emit(EVENTS.REQUEST_DEVICES);

    return () => {
      if (staleTimer) clearTimeout(staleTimer);
      window.removeEventListener('music:device-update', onDeviceUpdate);
    };
  }, [socket, setActiveTarget]);

  // ─── Receive state updates from target device ───────────────────

  useEffect(() => {
    if (!socket || !activeTarget) return;

    const onState = (data: RemoteMusicState & { socketId: string }) => {
      if (data.socketId === activeTarget) {
        setRemoteState({
          track: data.track,
          isPlaying: data.isPlaying,
          progress: data.progress,
          duration: data.duration,
          queue: data.queue ?? [],
        });
      }
    };

    socket.on(EVENTS.STATE_UPDATE, onState);
    return () => {
      socket.off(EVENTS.STATE_UPDATE, onState);
    };
  }, [socket, activeTarget]);

  // State broadcasting is handled by MusicDeviceSync (throttled, includes queue).

  // ─── Handle incoming commands (when this device is the player) ──

  const commandHandlerRef = useRef<
    ((cmd: string, value?: unknown) => void) | null
  >(null);

  useEffect(() => {
    if (!socket) return;

    const onCommand = (data: { command: string; value?: unknown }) => {
      commandHandlerRef.current?.(data.command, data.value);
    };

    socket.on(EVENTS.COMMAND, onCommand);
    return () => {
      socket.off(EVENTS.COMMAND, onCommand);
    };
  }, [socket]);

  // ─── Handle incoming transfer (when this device receives playback) ─

  const transferHandlerRef = useRef<((data: TransferPayload) => void) | null>(
    null,
  );

  useEffect(() => {
    const onTransfer = () => {
      transferHandlerRef.current?.(null as unknown as TransferPayload);
      setActiveTarget(null); // We are now the active player
    };

    window.addEventListener('music:transfer-received', onTransfer);
    return () => {
      window.removeEventListener('music:transfer-received', onTransfer);
    };
  }, [setActiveTarget]);

  // ─── Public API ─────────────────────────────────────────────────

  const transferTo = (
    targetSocketId: string,
    onFail?: () => void,
    deviceId?: string,
  ) => {
    if (!socket || !currentTrack) return;
    socket.emit(
      EVENTS.TRANSFER_PLAYBACK,
      { targetSocketId, track: currentTrack, queue: [], progress, isPlaying },
      (res: { success: boolean }) => {
        if (!res?.success) {
          setActiveTarget(null);
          onFail?.();
        }
      },
    );
    setActiveTarget(targetSocketId, deviceId);
  };

  const transferToWithData = (
    targetSocketId: string,
    track: MusicTrack,
    q: MusicTrack[],
    prog: number,
    playing: boolean,
    onFail?: () => void,
    onSuccess?: () => void,
    deviceId?: string,
  ) => {
    if (!socket) return;
    socket.emit(
      EVENTS.TRANSFER_PLAYBACK,
      { targetSocketId, track, queue: q, progress: prog, isPlaying: playing },
      (res: { success: boolean }) => {
        if (!res?.success) {
          setActiveTarget(null);
          onFail?.();
        } else {
          onSuccess?.();
        }
      },
    );
    setActiveTarget(targetSocketId, deviceId);
  };

  const sendCommand = (command: string, value?: unknown) => {
    if (!socket || !activeTarget) return;
    socket.emit(EVENTS.COMMAND, {
      targetSocketId: activeTarget,
      command,
      value,
    });
    // Optimistic updates for responsive UI (state_update confirms within 5s)
    switch (command) {
      case 'toggle_play':
        setRemoteState((s) => ({ ...s, isPlaying: !s.isPlaying }));
        break;
      case 'next':
        setRemoteState((s) => ({ ...s, isPlaying: true, progress: 0 }));
        break;
      case 'prev':
        setRemoteState((s) => ({ ...s, isPlaying: true, progress: 0 }));
        break;
      case 'seek':
        if (typeof value === 'number')
          setRemoteState((s) => ({ ...s, progress: value }));
        break;
      case 'volume':
        // Volume is local state — no remote state to update
        break;
    }
    // Request immediate state confirmation from target
    socket.emit('music:request_state');
  };

  const reclaimPlayback = () => {
    setActiveTarget(null);
    setRemoteState({
      track: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      queue: [],
    });
  };

  return {
    devices: Array.from(devices.values()),
    activeTarget,
    remoteState,
    transferTo,
    transferToWithData,
    sendCommand,
    reclaimPlayback,
    setOnCommand: (fn: (cmd: string, value?: unknown) => void) => {
      commandHandlerRef.current = fn;
    },
    setOnTransfer: (fn: (data: TransferPayload) => void) => {
      transferHandlerRef.current = fn;
    },
  };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { MusicTrack } from '../api';

export interface MusicDevice {
  socketId: string;
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

  // Persist target device name for reconnection matching
  const activeTargetNameRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('nightwatch:music-active-target-name')
      : null,
  );

  const setActiveTarget = useCallback(
    (value: string | null, deviceName?: string) => {
      setActiveTargetRaw(value);
      activeTargetRef.current = value;
      if (value) {
        sessionStorage.setItem('nightwatch:music-active-target', value);
        if (deviceName) {
          sessionStorage.setItem(
            'nightwatch:music-active-target-name',
            deviceName,
          );
          activeTargetNameRef.current = deviceName;
        }
      } else {
        sessionStorage.removeItem('nightwatch:music-active-target');
        sessionStorage.removeItem('nightwatch:music-active-target-name');
        activeTargetNameRef.current = null;
      }
    },
    [],
  );
  const [remoteState, setRemoteState] = useState<RemoteMusicState>({
    track: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
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
          // Check if target exists by device name (reconnected with new ID)
          if (activeTargetNameRef.current) {
            for (const [sid, dev] of current) {
              if (dev.deviceName === activeTargetNameRef.current) {
                setActiveTarget(sid, dev.deviceName);
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
        // Auto-reconnect: if this device matches our target by name but has a new socket ID
        if (
          activeTargetNameRef.current &&
          device.deviceName === activeTargetNameRef.current &&
          activeTargetRef.current !== device.socketId
        ) {
          setActiveTarget(device.socketId, device.deviceName);
        }
      } else if (type === 'offline') {
        setDevices((prev) => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
        // Don't clear activeTarget on offline if we have a name to reconnect with
        if (activeTargetRef.current === socketId) {
          if (!activeTargetNameRef.current) {
            setActiveTarget(null);
          }
          // If we have a name, keep activeTarget stale briefly — auto-reconnect
          // will update it when the device comes back online with a new socket ID
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
    deviceName?: string,
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
    setActiveTarget(targetSocketId, deviceName);
  };

  const transferToWithData = (
    targetSocketId: string,
    track: MusicTrack,
    q: MusicTrack[],
    prog: number,
    playing: boolean,
    onFail?: () => void,
    onSuccess?: () => void,
    deviceName?: string,
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
    setActiveTarget(targetSocketId, deviceName);
  };

  const sendCommand = (command: string, value?: unknown) => {
    if (!socket || !activeTarget) return;
    socket.emit(EVENTS.COMMAND, {
      targetSocketId: activeTarget,
      command,
      value,
    });
    // Optimistic update
    if (command === 'toggle_play') {
      setRemoteState((s) => ({ ...s, isPlaying: !s.isPlaying }));
    }
  };

  const reclaimPlayback = () => {
    setActiveTarget(null);
    setRemoteState({ track: null, isPlaying: false, progress: 0, duration: 0 });
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

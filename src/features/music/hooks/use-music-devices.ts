'use client';

import { useEffect, useRef, useState } from 'react';
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
  deviceName: string,
  isPlaying: boolean,
  available: boolean,
  currentTrack: MusicTrack | null,
  progress: number,
  duration: number,
) {
  const { socket } = useSocket();
  const [devices, setDevices] = useState<Map<string, MusicDevice>>(new Map());
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [remoteState, setRemoteState] = useState<RemoteMusicState>({
    track: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
  });

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const availableRef = useRef(available);
  availableRef.current = available;

  // ─── Advertise this device ──────────────────────────────────────

  useEffect(() => {
    if (!socket?.connected) return;

    const advertise = () => {
      socket.emit(EVENTS.DEVICE_ONLINE, {
        deviceName,
        isPlaying: isPlayingRef.current,
        available: availableRef.current,
      });
    };

    advertise();
    heartbeatRef.current = setInterval(advertise, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.emit(EVENTS.DEVICE_OFFLINE);
    };
  }, [socket, deviceName]);

  // Re-advertise on state/availability change
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit(EVENTS.DEVICE_ONLINE, { deviceName, isPlaying, available });
  }, [socket, deviceName, isPlaying, available]);

  // ─── Listen for other devices ───────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onOnline = (data: MusicDevice & { socketId: string }) => {
      if (data.socketId === socket.id) return;
      setDevices((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, data);
        return next;
      });
    };

    const onOffline = (data: { socketId: string }) => {
      setDevices((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
      setActiveTarget((t) => (t === data.socketId ? null : t));
    };

    const onRequestDevices = () => {
      socket.emit(EVENTS.DEVICE_ONLINE, { deviceName, isPlaying, available });
    };

    socket.on(EVENTS.DEVICE_ONLINE, onOnline);
    socket.on(EVENTS.DEVICE_OFFLINE, onOffline);
    socket.on(EVENTS.REQUEST_DEVICES, onRequestDevices);
    socket.on('connect', () => socket.emit(EVENTS.REQUEST_DEVICES));
    socket.emit(EVENTS.REQUEST_DEVICES);

    return () => {
      socket.off(EVENTS.DEVICE_ONLINE, onOnline);
      socket.off(EVENTS.DEVICE_OFFLINE, onOffline);
      socket.off(EVENTS.REQUEST_DEVICES, onRequestDevices);
    };
  }, [socket, deviceName, isPlaying, available]);

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

  // ─── Broadcast state when this device is playing (for controllers) ─

  useEffect(() => {
    if (!socket?.connected || !currentTrack) return;
    // Only broadcast if no active target (we are the player)
    if (activeTarget) return;

    socket.emit(EVENTS.STATE_UPDATE, {
      track: currentTrack,
      isPlaying,
      progress,
      duration,
    });
  }, [socket, currentTrack, isPlaying, progress, duration, activeTarget]);

  // ─── Handle incoming commands (when this device is the player) ──

  const commandHandlerRef = useRef<
    ((cmd: string, value?: number) => void) | null
  >(null);

  useEffect(() => {
    if (!socket) return;

    const onCommand = (data: { command: string; value?: number }) => {
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
    if (!socket) return;

    const onTransfer = (data: TransferPayload) => {
      transferHandlerRef.current?.(data);
      setActiveTarget(null); // We are now the active player
    };

    socket.on(EVENTS.TRANSFER_PLAYBACK, onTransfer);
    return () => {
      socket.off(EVENTS.TRANSFER_PLAYBACK, onTransfer);
    };
  }, [socket]);

  // ─── Public API ─────────────────────────────────────────────────

  const transferTo = (targetSocketId: string) => {
    if (!socket || !currentTrack) return;
    socket.emit(EVENTS.TRANSFER_PLAYBACK, {
      targetSocketId,
      track: currentTrack,
      queue: [],
      progress,
      isPlaying,
    });
    setActiveTarget(targetSocketId);
  };

  const transferToWithData = (
    targetSocketId: string,
    track: MusicTrack,
    q: MusicTrack[],
    prog: number,
    playing: boolean,
  ) => {
    if (!socket) return;
    socket.emit(EVENTS.TRANSFER_PLAYBACK, {
      targetSocketId,
      track,
      queue: q,
      progress: prog,
      isPlaying: playing,
    });
    setActiveTarget(targetSocketId);
  };

  const sendCommand = (command: string, value?: number) => {
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
    setOnCommand: (fn: (cmd: string, value?: number) => void) => {
      commandHandlerRef.current = fn;
    },
    setOnTransfer: (fn: (data: TransferPayload) => void) => {
      transferHandlerRef.current = fn;
    },
  };
}

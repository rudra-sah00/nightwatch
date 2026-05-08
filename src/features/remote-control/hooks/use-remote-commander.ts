'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type {
  RemoteCommandType,
  RemoteStateUpdate,
  RemoteStreamAdvertise,
} from '../types';
import { REMOTE_EVENTS } from '../types';

interface RemoteState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

/**
 * Mobile hook that sends commands to a target desktop device
 * and receives state updates from it.
 */
export function useRemoteCommander(activeStream: RemoteStreamAdvertise | null) {
  const { socket } = useSocket();
  const targetSocketId = activeStream?.socketId ?? null;
  const [state, setState] = useState<RemoteState>({
    isPlaying: activeStream?.isPlaying ?? false,
    currentTime: activeStream?.currentTime ?? 0,
    duration: activeStream?.duration ?? 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync initial state when target changes
  useEffect(() => {
    if (activeStream) {
      setState({
        isPlaying: activeStream.isPlaying,
        currentTime: activeStream.currentTime,
        duration: activeStream.duration,
      });
    }
  }, [activeStream]);

  // Local interpolation: increment currentTime every second while playing
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!state.isPlaying || state.duration <= 0) return;
    intervalRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        currentTime: Math.min(prev.currentTime + 1, prev.duration),
      }));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying, state.duration]);

  // Listen for state updates from the target device
  const lastCommandRef = useRef(0);

  useEffect(() => {
    if (!socket || !targetSocketId) return;

    const onStateUpdate = (data: RemoteStateUpdate) => {
      if (data.socketId === targetSocketId) {
        // Ignore stale updates within 2s of sending a command
        if (Date.now() - lastCommandRef.current < 2000) return;
        setState({
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
          duration: data.duration,
        });
      }
    };

    const onAdvertise = (data: RemoteStreamAdvertise) => {
      if (data.socketId === targetSocketId) {
        if (Date.now() - lastCommandRef.current < 2000) return;
        setState({
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
          duration: data.duration,
        });
      }
    };

    socket.on(REMOTE_EVENTS.STATE_UPDATE, onStateUpdate);
    socket.on(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);

    return () => {
      socket.off(REMOTE_EVENTS.STATE_UPDATE, onStateUpdate);
      socket.off(REMOTE_EVENTS.STREAM_ADVERTISE, onAdvertise);
    };
  }, [socket, targetSocketId]);

  const sendCommand = useCallback(
    (
      command: RemoteCommandType,
      extra?: { seekSeconds?: number; seekTo?: number },
    ) => {
      if (!socket || !targetSocketId) return;
      lastCommandRef.current = Date.now();
      socket.emit(REMOTE_EVENTS.COMMAND, {
        targetSocketId,
        command,
        ...extra,
      });

      // Optimistic UI update
      setState((prev) => {
        switch (command) {
          case 'play':
            return { ...prev, isPlaying: true };
          case 'pause':
            return { ...prev, isPlaying: false };
          case 'toggle_play':
            return { ...prev, isPlaying: !prev.isPlaying };
          case 'seek_forward':
            return {
              ...prev,
              currentTime: Math.min(
                prev.duration,
                prev.currentTime + (extra?.seekSeconds || 10),
              ),
            };
          case 'seek_backward':
            return {
              ...prev,
              currentTime: Math.max(
                0,
                prev.currentTime - (extra?.seekSeconds || 10),
              ),
            };
          default:
            return prev;
        }
      });
    },
    [socket, targetSocketId],
  );

  return { state, sendCommand };
}

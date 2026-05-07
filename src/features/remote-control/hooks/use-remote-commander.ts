'use client';

import { useCallback, useEffect, useState } from 'react';
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

  // Listen for state updates from the target device
  useEffect(() => {
    if (!socket || !targetSocketId) return;

    const onStateUpdate = (data: RemoteStateUpdate) => {
      if (data.socketId === targetSocketId) {
        setState({
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
          duration: data.duration,
        });
      }
    };

    const onAdvertise = (data: RemoteStreamAdvertise) => {
      if (data.socketId === targetSocketId) {
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

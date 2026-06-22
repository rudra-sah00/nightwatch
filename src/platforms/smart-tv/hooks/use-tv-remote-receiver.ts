'use client';

import { useEffect, useRef } from 'react';
import { REMOTE_EVENTS } from '@/features/remote-control/types';
import { useSocket } from '@/providers/socket-provider';
import { isTV } from '../lib/detection';

interface UseTvRemoteReceiverOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title: string;
  type: 'movie' | 'series' | 'livestream';
  movieId?: string;
  season?: number;
  episode?: number;
  onNextEpisode?: () => void;
}

/**
 * TV Remote Control Receiver.
 * Advertises the current stream to the user's mobile devices
 * and responds to remote commands (play, pause, seek, next).
 * Same protocol as desktop `useRemoteControlListener` but for TV.
 */
export function useTvRemoteReceiver({
  videoRef,
  title,
  type,
  movieId,
  season,
  episode,
  onNextEpisode,
}: UseTvRemoteReceiverOptions) {
  const { socket } = useSocket();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!socket || !isTV()) return;

    const getPayload = () => {
      const v = videoRef.current;
      return {
        deviceName: 'Android TV',
        type,
        title,
        posterUrl: null,
        movieId: movieId || '',
        season,
        episode,
        isPlaying: v ? !v.paused : false,
        currentTime: v?.currentTime || 0,
        duration: v?.duration || 0,
      };
    };

    const advertise = () => {
      if (socket.connected)
        socket.emit(REMOTE_EVENTS.STREAM_ADVERTISE, getPayload());
    };

    // Advertise on mount + heartbeat
    advertise();
    heartbeatRef.current = setInterval(advertise, 30_000);
    socket.on('connect', advertise);

    // Handle commands from mobile
    const handleCommand = (data: Record<string, unknown>) => {
      const v = videoRef.current;
      if (!v) return;
      const cmd = data.command as string;
      switch (cmd) {
        case 'play':
          if (v.paused) v.play();
          break;
        case 'pause':
          if (!v.paused) v.pause();
          break;
        case 'toggle_play':
          v.paused ? v.play() : v.pause();
          break;
        case 'seek_forward':
          v.currentTime += (data.seekSeconds as number) || 10;
          break;
        case 'seek_backward':
          v.currentTime -= (data.seekSeconds as number) || 10;
          break;
        case 'seek_to':
          if (typeof data.seekTo === 'number') v.currentTime = data.seekTo;
          break;
        case 'next_episode':
          onNextEpisode?.();
          break;
      }
      // Emit fresh state after command
      setTimeout(() => {
        if (socket.connected) {
          socket.emit(REMOTE_EVENTS.STATE_UPDATE, {
            isPlaying: !v.paused,
            currentTime: v.currentTime,
            duration: v.duration,
          });
        }
      }, 100);
    };

    socket.on(REMOTE_EVENTS.COMMAND, handleCommand);

    // State updates on play/pause
    const emitState = () => {
      if (socket.connected && videoRef.current) {
        socket.emit(REMOTE_EVENTS.STATE_UPDATE, {
          isPlaying: !videoRef.current.paused,
          currentTime: videoRef.current.currentTime,
          duration: videoRef.current.duration,
        });
      }
    };
    const v = videoRef.current;
    v?.addEventListener('play', emitState);
    v?.addEventListener('pause', emitState);
    v?.addEventListener('seeked', emitState);

    return () => {
      clearInterval(heartbeatRef.current);
      socket.off('connect', advertise);
      socket.off(REMOTE_EVENTS.COMMAND, handleCommand);
      v?.removeEventListener('play', emitState);
      v?.removeEventListener('pause', emitState);
      v?.removeEventListener('seeked', emitState);
      if (socket.connected) socket.emit(REMOTE_EVENTS.STREAM_ENDED);
    };
  }, [socket, title, type, movieId, season, episode, videoRef, onNextEpisode]);
}

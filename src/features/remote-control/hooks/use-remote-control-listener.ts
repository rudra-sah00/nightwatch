'use client';

import { useEffect, useRef } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import type { VideoMetadata } from '../../watch/player/context/types';
import { REMOTE_EVENTS } from '../types';

interface UseRemoteControlListenerOptions {
  metadata: VideoMetadata;
  state: { isPlaying: boolean; currentTime: number; duration: number };
  playerHandlers: {
    togglePlay: () => void;
    seek: (time: number) => void;
    skip: (seconds: number) => void;
  };
  onNextEpisode?: () => void;
}

/**
 * Desktop-only hook that advertises the active stream to other devices
 * and responds to remote commands from mobile.
 */
export function useRemoteControlListener({
  metadata,
  state,
  playerHandlers,
  onNextEpisode,
}: UseRemoteControlListenerOptions) {
  const { socket } = useSocket();
  const lastStateRef = useRef({ isPlaying: false, currentTime: 0 });
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const stateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Don't run on mobile — mobile is the controller, not the listener
  const isMobile =
    checkIsMobile() ||
    (typeof window !== 'undefined' && window.innerWidth < 768);

  // Use a ref for the advertise payload so the heartbeat always reads fresh state
  // without causing the effect to re-run (which would emit STREAM_ENDED on every state change)
  const payloadRef = useRef({
    deviceName: 'Browser',
    type: metadata.type,
    title: metadata.title,
    posterUrl: metadata.posterUrl || null,
    movieId: metadata.movieId,
    seriesId: metadata.seriesId,
    season: metadata.season,
    episode: metadata.episode,
    episodeTitle: metadata.episodeTitle,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
  });

  // Keep the ref in sync with latest values
  payloadRef.current = {
    deviceName:
      typeof window !== 'undefined' && 'electronAPI' in window
        ? 'Desktop App'
        : 'Browser',
    type: metadata.type,
    title: metadata.title,
    posterUrl: metadata.posterUrl || null,
    movieId: metadata.movieId,
    seriesId: metadata.seriesId,
    season: metadata.season,
    episode: metadata.episode,
    episodeTitle: metadata.episodeTitle,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
  };

  // Advertise stream on mount + heartbeat (stable deps — only re-runs on socket/mount change)
  useEffect(() => {
    if (isMobile || !socket?.connected) return;

    const advertise = () => {
      socket.emit(REMOTE_EVENTS.STREAM_ADVERTISE, payloadRef.current);
    };

    advertise();
    heartbeatRef.current = setInterval(advertise, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.emit(REMOTE_EVENTS.STREAM_ENDED);
    };
  }, [isMobile, socket]);

  // Emit state updates on play/pause change (instant) and time (throttled 5s)
  useEffect(() => {
    if (isMobile || !socket?.connected) return;

    const prev = lastStateRef.current;
    const playChanged = prev.isPlaying !== state.isPlaying;
    const timeDelta = Math.abs(prev.currentTime - state.currentTime);

    if (playChanged) {
      socket.emit(REMOTE_EVENTS.STATE_UPDATE, {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        duration: state.duration,
      });
      lastStateRef.current = {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
      };
    } else if (timeDelta >= 5 && !stateThrottleRef.current) {
      stateThrottleRef.current = setTimeout(() => {
        socket.emit(REMOTE_EVENTS.STATE_UPDATE, {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          duration: state.duration,
        });
        lastStateRef.current = {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
        };
        stateThrottleRef.current = null;
      }, 5000);
    }
  }, [isMobile, socket, state.isPlaying, state.currentTime, state.duration]);

  // Listen for remote commands
  useEffect(() => {
    if (isMobile || !socket) return;

    const handleCommand = (data: Record<string, unknown>) => {
      const cmd = data.command as string;
      switch (cmd) {
        case 'play':
          if (!state.isPlaying) playerHandlers.togglePlay();
          break;
        case 'pause':
          if (state.isPlaying) playerHandlers.togglePlay();
          break;
        case 'toggle_play':
          playerHandlers.togglePlay();
          break;
        case 'seek_forward':
          playerHandlers.skip((data.seekSeconds as number) || 10);
          break;
        case 'seek_backward':
          playerHandlers.skip(-((data.seekSeconds as number) || 10));
          break;
        case 'seek_to':
          if (typeof data.seekTo === 'number') playerHandlers.seek(data.seekTo);
          break;
        case 'next_episode':
          onNextEpisode?.();
          break;
      }
    };

    const handleRequestAdvertise = () => {
      socket.emit(REMOTE_EVENTS.STREAM_ADVERTISE, payloadRef.current);
    };

    socket.on(REMOTE_EVENTS.COMMAND, handleCommand);
    socket.on(REMOTE_EVENTS.REQUEST_ADVERTISE, handleRequestAdvertise);

    return () => {
      socket.off(REMOTE_EVENTS.COMMAND, handleCommand);
      socket.off(REMOTE_EVENTS.REQUEST_ADVERTISE, handleRequestAdvertise);
      if (stateThrottleRef.current) clearTimeout(stateThrottleRef.current);
    };
  }, [isMobile, socket, state.isPlaying, playerHandlers, onNextEpisode]);
}

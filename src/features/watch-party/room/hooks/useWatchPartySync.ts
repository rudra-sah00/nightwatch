'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  getPartyStreamToken,
  syncPartyState,
  updatePartyContent,
} from '../services/watch-party.api';
import type { PartyEvent, PartyStateUpdate, WatchPartyRoom } from '../types';

interface UseWatchPartySyncProps {
  room: WatchPartyRoom | null;
  setRoom: React.Dispatch<React.SetStateAction<WatchPartyRoom | null>>;
  userId?: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  onStateUpdate?: (state: PartyStateUpdate) => void;
  normalizeRoomUrls: (
    room: WatchPartyRoom,
    token: string,
    options?: { injectStream?: boolean },
  ) => WatchPartyRoom;
}

export function useWatchPartySync({
  room,
  setRoom,
  rtmSendMessage,
  onStateUpdate,
  normalizeRoomUrls,
}: UseWatchPartySyncProps) {
  const [hostDisconnected, setHostDisconnected] = useState(false);

  const emitEvent = useCallback(
    (event: PartyEvent) => {
      if (!room?.id) return;
      // Host broadcasts the event to all peers via RTM
      rtmSendMessage?.({
        type:
          event.eventType === 'play'
            ? 'PLAY_EVENT'
            : event.eventType === 'pause'
              ? 'PAUSE_EVENT'
              : event.eventType === 'seek'
                ? 'SEEK_EVENT'
                : 'RATE_EVENT',
        videoTime: event.videoTime,
        playbackRate: event.playbackRate || room.state.playbackRate,
        wasPlaying: event.wasPlaying,
        serverTime: Date.now(),
      } as unknown as RTMMessage);

      // Also persist to backend so new joiners/reconnects get latest state
      syncPartyState(room.id, {
        currentTime: event.videoTime,
        isPlaying:
          event.eventType === 'play' ||
          (event.eventType !== 'pause' && room.state.isPlaying),
        playbackRate: event.playbackRate || room.state.playbackRate,
      });
    },
    [room?.id, room?.state.isPlaying, room?.state.playbackRate, rtmSendMessage],
  );

  const updateContent = useCallback(
    async (contentPayload: Parameters<typeof updatePartyContent>[1]) => {
      if (!room?.id) return;
      const response = await updatePartyContent(room.id, contentPayload);
      if (response.room) {
        setRoom(response.room);
        // Broadcast content update to everyone in the room
        rtmSendMessage?.({
          type: 'CONTENT_UPDATED',
          room: response.room,
        });
      } else {
        toast.error(response.error || 'Failed to update content');
      }
    },
    [room?.id, setRoom, rtmSendMessage],
  );

  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'PLAY_EVENT':
        case 'PAUSE_EVENT':
        case 'SEEK_EVENT':
        case 'RATE_EVENT':
        case 'SYNC': {
          let videoTime = 0;
          if (msg.type === 'SYNC') {
            videoTime = msg.videoTime;
          } else {
            videoTime = msg.videoTime;
          }

          const isPlaying =
            msg.type === 'PLAY_EVENT'
              ? true
              : msg.type === 'PAUSE_EVENT'
                ? false
                : msg.type === 'SYNC'
                  ? msg.isPlaying
                  : undefined;

          const playbackRate =
            msg.type === 'SYNC' ||
            msg.type === 'PLAY_EVENT' ||
            msg.type === 'RATE_EVENT'
              ? msg.playbackRate
              : undefined;

          const state: PartyStateUpdate = {
            currentTime: videoTime,
            isPlaying: isPlaying as boolean,
            playbackRate,
            timestamp: msg.serverTime,
            serverTime: msg.serverTime,
            eventType:
              msg.type === 'PLAY_EVENT'
                ? 'play'
                : msg.type === 'PAUSE_EVENT'
                  ? 'pause'
                  : msg.type === 'SEEK_EVENT'
                    ? 'seek'
                    : msg.type === 'RATE_EVENT'
                      ? 'rate'
                      : 'init',
          };

          setRoom((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              state: {
                ...prev.state,
                currentTime: state.currentTime,
                isPlaying: state.isPlaying ?? prev.state.isPlaying,
                playbackRate: state.playbackRate ?? prev.state.playbackRate,
                lastUpdated: state.timestamp,
              },
            };
          });
          onStateUpdate?.(state);
          break;
        }

        case 'CONTENT_UPDATED': {
          const { room: newRoom } = msg;
          toast.info(`Content changed to: ${newRoom.title}`);
          getPartyStreamToken(newRoom.id).then((response) => {
            const token = response.token || '';
            const normalizedRoom = normalizeRoomUrls(newRoom, token, {
              injectStream: true,
            });
            setRoom(normalizedRoom);
          });
          break;
        }

        case 'HOST_DISCONNECTED': {
          setHostDisconnected(true);
          toast.warning(
            `Host disconnected. Party will close in ${msg.graceSeconds}s if they don't return.`,
            { id: 'host-disconnected', duration: msg.graceSeconds * 1000 },
          );
          break;
        }

        case 'HOST_RECONNECTED': {
          setHostDisconnected(false);
          toast.success('Host reconnected!', { id: 'host-disconnected' });
          break;
        }

        case 'STREAM_TOKEN': {
          setRoom((prev) => {
            if (!prev) return null;
            // When token changes, we re-normalize URLs
            return normalizeRoomUrls(prev, msg.token, { injectStream: true });
          });
          break;
        }
      }
    },
    [onStateUpdate, normalizeRoomUrls, setRoom],
  );

  return {
    hostDisconnected,
    emitEvent,
    updateContent,
    handleIncomingRtmMessage,
  };
}

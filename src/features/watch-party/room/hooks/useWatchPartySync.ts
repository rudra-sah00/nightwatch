'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import {
  getPartyStreamToken,
  syncPartyState,
  updatePartyContent,
} from '../services/watch-party.api';
import type { PartyEvent, PartyStateUpdate, WatchPartyRoom } from '../types';

/** Props for {@link useWatchPartySync}. */
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
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  isHost?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Handles playback state synchronisation between the host and guests.
 *
 * - Host: emits play/pause/seek/rate events via RTM and persists to backend.
 * - Guest: processes incoming RTM events, applies state updates, and handles
 *   host disconnect/reconnect with a configurable grace period.
 * - Both: handles content updates, stream token refreshes, and sync requests.
 *
 * @returns `emitEvent`, `updateContent`, RTM message handler, and presence handler.
 */
export function useWatchPartySync({
  room,
  setRoom,
  rtmSendMessage,
  onStateUpdate,
  normalizeRoomUrls,
  rtmSendMessageToPeer: _rtmSendMessageToPeer,
  isHost,
  videoRef,
}: UseWatchPartySyncProps) {
  const t = useTranslations('common.toasts');
  const tp = useTranslations('party.toasts');
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const hostDisconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLiveRoom = room?.type === 'livestream';

  const handlePresenceEvent = useCallback(
    (event: { action: 'JOIN' | 'LEAVE'; userId: string }) => {
      // Host: proactively sync when a new guest joins
      if (isHost) {
        if (event.action === 'JOIN' && event.userId !== room?.hostId) {
          if (room?.id) {
            rtmSendMessage?.({
              type: 'SYNC',
              currentTime: isLiveRoom
                ? 0
                : (videoRef?.current?.currentTime ?? room.state.currentTime),
              videoTime: isLiveRoom
                ? 0
                : (videoRef?.current?.currentTime ?? room.state.currentTime),
              isPlaying: videoRef?.current
                ? !videoRef.current.paused
                : room.state.isPlaying,
              playbackRate:
                videoRef?.current?.playbackRate ?? room.state.playbackRate,
              serverTime: Date.now(),
              fromHost: true,
            });
          }
        }
        return;
      }

      // Guest: handle host disconnection/reconnection
      if (event.userId !== room?.hostId) return;

      if (event.action === 'LEAVE') {
        setHostDisconnected(true);
        const graceSeconds = 30;
        toast.warning(tp('hostDisconnected', { seconds: graceSeconds }), {
          id: 'host-disconnected',
          duration: graceSeconds * 1000,
        });

        if (hostDisconnectTimerRef.current)
          clearTimeout(hostDisconnectTimerRef.current);
        hostDisconnectTimerRef.current = setTimeout(() => {
          toast.error(t('hostTimeout'));
          window.location.href = '/home';
        }, graceSeconds * 1000);
      } else if (event.action === 'JOIN') {
        setHostDisconnected(false);
        if (hostDisconnectTimerRef.current) {
          clearTimeout(hostDisconnectTimerRef.current);
          hostDisconnectTimerRef.current = null;
        }
        toast.success(tp('hostReconnected'), { id: 'host-disconnected' });
      }
    },
    [
      isHost,
      isLiveRoom,
      room?.hostId,
      room?.id,
      room?.state.isPlaying,
      room?.state.playbackRate,
      rtmSendMessage,
      videoRef,
      room?.state.currentTime,
      t,
      tp,
    ],
  );

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (hostDisconnectTimerRef.current)
        clearTimeout(hostDisconnectTimerRef.current);
    };
  }, []);

  const emitEvent = useCallback(
    (event: PartyEvent) => {
      if (!room?.id) return;
      const normalizedEventType =
        isLiveRoom && event.eventType === 'seek'
          ? event.wasPlaying
            ? 'play'
            : 'pause'
          : isLiveRoom && event.eventType === 'rate'
            ? room.state.isPlaying
              ? 'play'
              : 'pause'
            : event.eventType;

      const normalizedVideoTime = isLiveRoom ? 0 : event.videoTime;

      // Host broadcasts the event to all peers via RTM
      rtmSendMessage?.({
        type:
          normalizedEventType === 'play'
            ? 'PLAY_EVENT'
            : normalizedEventType === 'pause'
              ? 'PAUSE_EVENT'
              : normalizedEventType === 'seek'
                ? 'SEEK_EVENT'
                : 'RATE_EVENT',
        videoTime: normalizedVideoTime,
        playbackRate: event.playbackRate || room.state.playbackRate,
        wasPlaying: event.wasPlaying,
        serverTime: Date.now(),
      } as unknown as RTMMessage);

      // Also persist to backend so new joiners/reconnects get latest state
      syncPartyState(room.id, {
        currentTime: normalizedVideoTime,
        isPlaying:
          normalizedEventType === 'play' ||
          (normalizedEventType !== 'pause' && room.state.isPlaying),
        playbackRate: event.playbackRate || room.state.playbackRate,
      });
    },
    [
      room?.id,
      room?.state.isPlaying,
      room?.state.playbackRate,
      rtmSendMessage,
      isLiveRoom,
    ],
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
        toast.error(response.error || tp('failedUpdateContent'));
      }
    },
    [room?.id, setRoom, rtmSendMessage, tp],
  );

  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'PLAY_EVENT':
        case 'PAUSE_EVENT':
        case 'SEEK_EVENT':
        case 'RATE_EVENT':
        case 'SYNC': {
          if (
            isLiveRoom &&
            (msg.type === 'SEEK_EVENT' || msg.type === 'RATE_EVENT')
          ) {
            break;
          }

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
                  : msg.type === 'SEEK_EVENT' || msg.type === 'RATE_EVENT'
                    ? msg.wasPlaying
                    : undefined;

          const playbackRate =
            msg.type === 'SYNC' ||
            msg.type === 'PLAY_EVENT' ||
            msg.type === 'RATE_EVENT' ||
            msg.type === 'SEEK_EVENT'
              ? msg.playbackRate
              : undefined;

          const state: PartyStateUpdate = {
            currentTime: isLiveRoom ? 0 : videoTime,
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
                currentTime: isLiveRoom
                  ? prev.state.currentTime
                  : state.currentTime,
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
          toast.info(tp('contentChanged', { title: newRoom.title }));
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
          toast.warning(tp('hostDisconnected', { seconds: msg.graceSeconds }), {
            id: 'host-disconnected',
            duration: msg.graceSeconds * 1000,
          });
          break;
        }

        case 'HOST_RECONNECTED': {
          setHostDisconnected(false);
          toast.success(tp('hostReconnected'), { id: 'host-disconnected' });
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
        case 'SYNC_REQUEST': {
          if (isHost) {
            // Host responds to sync request by broadcasting current state
            // We use emitEvent which broadcasts to everyone - this is simplest
            // and ensures everyone is on the same page.
            // A more advanced version would use rtmSendMessageToPeer.
            if (room?.id) {
              // We trigger a "SYNC" type message which is more authoritative than just PLAY/PAUSE
              rtmSendMessage?.({
                type: 'SYNC',
                currentTime: isLiveRoom
                  ? 0
                  : (videoRef?.current?.currentTime ?? room.state.currentTime),
                videoTime: isLiveRoom
                  ? 0
                  : (videoRef?.current?.currentTime ?? room.state.currentTime),
                isPlaying: videoRef?.current
                  ? !videoRef.current.paused
                  : room.state.isPlaying,
                playbackRate:
                  videoRef?.current?.playbackRate ?? room.state.playbackRate,
                serverTime: Date.now(),
                fromHost: true,
              });
            }
          }
          break;
        }
      }
    },
    [
      onStateUpdate,
      normalizeRoomUrls,
      setRoom,
      isLiveRoom,
      isHost,
      rtmSendMessage,
      room,
      videoRef?.current?.paused,
      videoRef?.current?.currentTime,
      videoRef?.current,
      tp,
    ],
  );

  return {
    hostDisconnected,
    emitEvent,
    updateContent,
    handleIncomingRtmMessage,
    handlePresenceEvent,
  };
}

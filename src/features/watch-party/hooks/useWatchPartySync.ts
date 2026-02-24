'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  emitPartyEvent,
  getPartyStreamToken,
  onPartyContentUpdated,
  onPartyHostDisconnected,
  onPartyHostReconnected,
  onPartyStateUpdate,
  updatePartyContent,
} from '../api';
import type { PartyStateUpdate, WatchPartyRoom } from '../types';

interface UseWatchPartySyncProps {
  room: WatchPartyRoom | null;
  setRoom: React.Dispatch<React.SetStateAction<WatchPartyRoom | null>>;
  onStateUpdate?: (state: PartyStateUpdate) => void;
  normalizeRoomUrls: (
    room: WatchPartyRoom,
    token: string,
    options?: { injectStream?: boolean },
  ) => WatchPartyRoom;
}

export function useWatchPartySync({
  room: _room,
  setRoom,
  onStateUpdate,
  normalizeRoomUrls,
}: UseWatchPartySyncProps) {
  const [hostDisconnected, setHostDisconnected] = useState(false);

  const emitEvent = useCallback(
    (event: Parameters<typeof emitPartyEvent>[0]) => {
      emitPartyEvent(event);
    },
    [],
  );

  const updateContent = useCallback(
    (contentPayload: Parameters<typeof updatePartyContent>[0]) => {
      updatePartyContent(contentPayload, (response) => {
        if (response.success && response.room) {
          setRoom(response.room);
        } else {
          toast.error(response.error || 'Failed to update content');
        }
      });
    },
    [setRoom],
  );

  useEffect(() => {
    const cleanupStateUpdate = onPartyStateUpdate((state) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: {
            ...prev.state,
            ...state,
          },
        };
      });
      onStateUpdate?.(state);
    });

    const cleanupContentUpdated = onPartyContentUpdated(({ room: newRoom }) => {
      toast.info(`Content changed to: ${newRoom.title}`);
      getPartyStreamToken((response) => {
        const token = response.success && response.token ? response.token : '';
        const normalizedRoom = normalizeRoomUrls(newRoom, token, {
          injectStream: true,
        });
        setRoom(normalizedRoom);
      });
    });

    const cleanupHostDisconnected = onPartyHostDisconnected(
      ({ graceSeconds }) => {
        setHostDisconnected(true);
        toast.warning(
          `Host disconnected. Party will close in ${graceSeconds}s if they don't return.`,
          { id: 'host-disconnected', duration: graceSeconds * 1000 },
        );
      },
    );

    const cleanupHostReconnected = onPartyHostReconnected(() => {
      setHostDisconnected((prev) => {
        prev
          ? toast.success('Host reconnected!', { id: 'host-disconnected' })
          : null;
        return false;
      });
    });

    return () => {
      cleanupStateUpdate();
      cleanupContentUpdated();
      cleanupHostDisconnected();
      cleanupHostReconnected();
    };
  }, [onStateUpdate, normalizeRoomUrls, setRoom]);

  return {
    hostDisconnected,
    emitEvent,
    updateContent,
  };
}

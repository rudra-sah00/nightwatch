'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { MusicPartyMember, MusicPartyRoom, MusicPartyTrack } from './api';

export type RTMMessage =
  | { type: 'play'; trackId: string; progress: number }
  | { type: 'pause'; progress: number }
  | { type: 'seek'; progress: number }
  | { type: 'skip'; trackId: string }
  | { type: 'queue_add'; track: MusicPartyTrack }
  | { type: 'member_join'; member: MusicPartyMember }
  | { type: 'member_leave'; memberId: string }
  | { type: 'sync_request' }
  | { type: 'sync_state'; room: MusicPartyRoom };

interface MusicPartyContextValue {
  room: MusicPartyRoom | null;
  setRoom: (room: MusicPartyRoom) => void;
  isHost: boolean;
  userId: string | null;
  setUserId: (id: string) => void;
  rtmChannel: unknown;
  setRtmChannel: (ch: unknown) => void;
  sendMessage: (msg: RTMMessage) => void;
  onMessage: (handler: (msg: RTMMessage) => void) => () => void;
}

const MusicPartyContext = createContext<MusicPartyContextValue | null>(null);

export function MusicPartyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [room, setRoom] = useState<MusicPartyRoom | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rtmChannel, setRtmChannel] = useState<unknown>(null);
  const handlersRef = useRef<Set<(msg: RTMMessage) => void>>(new Set());

  const isHost = !!(room && userId && room.hostId === userId);

  const sendMessage = useCallback(
    (msg: RTMMessage) => {
      const ch = rtmChannel as {
        sendMessage?: (m: { text: string }) => Promise<void>;
      } | null;
      if (ch?.sendMessage) {
        ch.sendMessage({ text: JSON.stringify(msg) }).catch(() => {});
      }
    },
    [rtmChannel],
  );

  const onMessage = useCallback((handler: (msg: RTMMessage) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  // Listen for RTM channel messages
  useEffect(() => {
    const ch = rtmChannel as {
      on?: (event: string, cb: (msg: { text: string }) => void) => void;
      off?: (event: string, cb: (msg: { text: string }) => void) => void;
    } | null;
    if (!ch?.on) return;
    const handler = (msg: { text: string }) => {
      try {
        const parsed = JSON.parse(msg.text) as RTMMessage;
        for (const h of handlersRef.current) h(parsed);
      } catch {
        /* ignore */
      }
    };
    ch.on('ChannelMessage', handler);
    return () => {
      ch.off?.('ChannelMessage', handler);
    };
  }, [rtmChannel]);

  return (
    <MusicPartyContext.Provider
      value={{
        room,
        setRoom,
        isHost,
        userId,
        setUserId,
        rtmChannel,
        setRtmChannel,
        sendMessage,
        onMessage,
      }}
    >
      {children}
    </MusicPartyContext.Provider>
  );
}

export function useMusicParty() {
  const ctx = useContext(MusicPartyContext);
  if (!ctx)
    throw new Error('useMusicParty must be used within MusicPartyProvider');
  return ctx;
}

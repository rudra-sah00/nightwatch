'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  createMessageDedupe,
  createPlaybackOrderGuard,
  createTrailingThrottle,
  HIGH_FREQUENCY_TYPES,
  newMessageId,
  routeMessage,
  type WireMessage,
} from '../lib/transport';
import type { RTMMessage } from '../types/rtm-messages';

interface UseWatchPartyTransportOptions {
  socket: Socket | null;
  /** Party room code, once joined. */
  roomId: string | undefined;
  /** This client's party user id. Guest ids start with `guest`. */
  userId: string | undefined;
  /** Whether Agora RTM is connected right now. */
  rtmConnected: boolean;
  rtmSend: (msg: RTMMessage) => Promise<void>;
  rtmSendToPeer: (peerId: string, msg: RTMMessage) => Promise<void>;
  /**
   * Receives every message relayed through our server. Called with the
   * server-stamped sender id, which plays the same role as the Agora publisher
   * id, so the caller's permission gate applies unchanged.
   */
  onRelayMessage: (msg: RTMMessage, senderId: string) => void;
  /** Server presence: one member became reachable / unreachable on the socket. */
  onSocketPresence?: (userId: string, online: boolean) => void;
  /** Server presence: everyone currently in the room, delivered on every (re)join. */
  onSocketPresenceSnapshot?: (userIds: string[]) => void;
}

/** Ack shape for `watch-party:join_room` and `watch-party:guest_auth`. */
interface Ack {
  success?: boolean;
  error?: string;
  /** `join_room` only: user ids the server sees in the room. Absent on older backends. */
  online?: unknown;
}

/**
 * One send path for the whole party: Agora RTM, plus our Socket.IO relay as backup.
 *
 * Owns three things:
 *
 *  1. **Membership of `room:<id>` on the server.** Authenticated members join
 *     directly. A guest first presents its guest token on the shared socket
 *     (`watch-party:guest_auth`), because that socket was opened in the lobby
 *     before the guest had one. Both are redone on every reconnect — a reconnect
 *     is a fresh handshake and forgets both.
 *  2. **Outbound routing** (`send`, `sendToPeer`), per {@link routeMessage}.
 *  3. **Inbound filtering** (`accept`): the de-duplication and playback ordering
 *     that dual delivery needs. RTM and relay inbound both pass through it.
 *
 * `send` changes identity when connectivity changes, exactly as the raw RTM
 * `sendMessage` used to. Consumers rely on that: the 3D theatre re-announces its
 * pose when its send function changes, which is what makes a peer reappear the
 * moment a connection comes back rather than at the next heartbeat.
 */
export function useWatchPartyTransport({
  socket,
  roomId,
  userId,
  rtmConnected,
  rtmSend,
  rtmSendToPeer,
  onRelayMessage,
  onSocketPresence,
  onSocketPresenceSnapshot,
}: UseWatchPartyTransportOptions) {
  const [relayReady, setRelayReady] = useState(false);

  // Latest values for callbacks that must not be rebuilt on every render.
  const socketRef = useRef(socket);
  socketRef.current = socket;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const rtmConnectedRef = useRef(rtmConnected);
  rtmConnectedRef.current = rtmConnected;
  const relayReadyRef = useRef(relayReady);
  relayReadyRef.current = relayReady;
  const rtmSendRef = useRef(rtmSend);
  rtmSendRef.current = rtmSend;
  const rtmSendToPeerRef = useRef(rtmSendToPeer);
  rtmSendToPeerRef.current = rtmSendToPeer;
  const onRelayRef = useRef(onRelayMessage);
  onRelayRef.current = onRelayMessage;
  const onPresenceRef = useRef(onSocketPresence);
  onPresenceRef.current = onSocketPresence;
  const onSnapshotRef = useRef(onSocketPresenceSnapshot);
  onSnapshotRef.current = onSocketPresenceSnapshot;

  const dedupeRef = useRef(createMessageDedupe());
  const orderRef = useRef(createPlaybackOrderGuard());

  const relayEmit = useCallback((msg: WireMessage, to?: string) => {
    const s = socketRef.current;
    const room = roomIdRef.current;
    if (!(s && room)) return;
    s.emit(
      'watch-party:relay',
      to ? { roomId: room, msg, to } : { roomId: room, msg },
    );
  }, []);

  const throttleRef = useRef<ReturnType<typeof createTrailingThrottle> | null>(
    null,
  );
  if (!throttleRef.current) {
    throttleRef.current = createTrailingThrottle((msg) => relayEmit(msg));
  }

  // ---- server room membership ----
  useEffect(() => {
    if (!(socket && roomId && userId)) return;
    let active = true;
    const isGuest = userId.startsWith('guest');

    const join = () => {
      socket.emit('watch-party:join_room', roomId, (res?: Ack) => {
        if (!active) return;
        setRelayReady(res?.success === true);
        if (res?.success && Array.isArray(res.online)) {
          onSnapshotRef.current?.(
            res.online.filter((id): id is string => typeof id === 'string'),
          );
        }
      });
    };

    const authAndJoin = () => {
      setRelayReady(false);
      if (!isGuest) {
        join();
        return;
      }
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('guest_token')
          : null;
      // No token means no way to prove membership. RTM remains the only path.
      if (!token) return;
      socket.emit('watch-party:guest_auth', token, (res?: Ack) => {
        if (active && res?.success) join();
      });
    };

    const onDisconnect = () => {
      if (active) setRelayReady(false);
    };

    // Emitting while disconnected would be buffered AND repeated by the
    // `connect` handler, so only run now when there is a live connection.
    if (socket.connected) authAndJoin();
    socket.on('connect', authAndJoin);
    socket.on('disconnect', onDisconnect);

    return () => {
      active = false;
      socket.off('connect', authAndJoin);
      socket.off('disconnect', onDisconnect);
      socket.emit('watch-party:leave_room', roomId);
      setRelayReady(false);
    };
  }, [socket, roomId, userId]);

  // ---- inbound relay ----
  useEffect(() => {
    if (!(socket && roomId)) return;
    const onRelay = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const {
        roomId: r,
        from,
        msg,
      } = payload as {
        roomId?: unknown;
        from?: unknown;
        msg?: unknown;
      };
      if (typeof r !== 'string' || r.toUpperCase() !== roomId.toUpperCase()) {
        return;
      }
      if (typeof from !== 'string' || from.length === 0) return;
      if (!msg || typeof msg !== 'object') return;
      // The server excludes the sending socket; this covers any other socket of ours.
      if (from === userIdRef.current) return;
      onRelayRef.current(msg as RTMMessage, from);
    };
    const onPresence = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const {
        roomId: r,
        userId: u,
        online,
      } = payload as {
        roomId?: unknown;
        userId?: unknown;
        online?: unknown;
      };
      if (typeof r !== 'string' || r.toUpperCase() !== roomId.toUpperCase()) {
        return;
      }
      if (
        typeof u !== 'string' ||
        u.length === 0 ||
        typeof online !== 'boolean'
      ) {
        return;
      }
      onPresenceRef.current?.(u, online);
    };
    socket.on('watch-party:relay', onRelay);
    socket.on('watch-party:presence', onPresence);
    return () => {
      socket.off('watch-party:relay', onRelay);
      socket.off('watch-party:presence', onPresence);
    };
  }, [socket, roomId]);

  // A new party starts with a clean slate of seen ids and playback order.
  // biome-ignore lint/correctness/useExhaustiveDependencies: roomId is the reset trigger
  useEffect(() => {
    dedupeRef.current.clear();
    orderRef.current.reset();
  }, [roomId]);

  // Withheld high-frequency relay sends are moot once RTM is back, or once the relay is gone.
  useEffect(() => {
    if (rtmConnected || !relayReady) throttleRef.current?.cancel();
  }, [rtmConnected, relayReady]);

  useEffect(() => () => throttleRef.current?.cancel(), []);

  /**
   * Whether an inbound message should be processed. Call AFTER the permission
   * gate, so a message the gate refuses does not use up its id.
   */
  const accept = useCallback(
    (msg: RTMMessage): boolean =>
      dedupeRef.current.accept(msg as WireMessage) &&
      orderRef.current.accept(msg),
    [],
  );

  // Identity tracks connectivity on purpose — see the hook docblock.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when connectivity changes
  const send = useCallback(
    async (message: RTMMessage): Promise<void> => {
      const wire = { ...message, _mid: newMessageId() } as WireMessage;
      const route = routeMessage(
        wire.type,
        rtmConnectedRef.current,
        relayReadyRef.current,
      );
      if (route.relay) {
        if (HIGH_FREQUENCY_TYPES.has(wire.type)) {
          throttleRef.current?.send(wire);
        } else {
          relayEmit(wire);
        }
      }
      if (route.rtm) await rtmSendRef.current(wire);
    },
    [rtmConnected, relayReady, relayEmit],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when connectivity changes
  const sendToPeer = useCallback(
    async (peerId: string, message: RTMMessage): Promise<void> => {
      const wire = { ...message, _mid: newMessageId() } as WireMessage;
      const route = routeMessage(
        wire.type,
        rtmConnectedRef.current,
        relayReadyRef.current,
      );
      if (route.relay) relayEmit(wire, peerId);
      if (route.rtm) await rtmSendToPeerRef.current(peerId, wire);
    },
    [rtmConnected, relayReady, relayEmit],
  );

  return {
    send,
    sendToPeer,
    accept,
    /** True while this socket is in the party's server room and can relay. */
    relayReady,
  };
}

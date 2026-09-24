'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { env } from '@/lib/env';
import { getRelayToken } from '../../room/services/rest/relay.api';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { ServerClock } from '../lib/clock';
import {
  decodePoseBatch,
  encodeCursor,
  encodePose,
  type WirePose,
  type WirePoseRecord,
} from '../lib/codec';
import { SlotTable } from '../lib/slots';
import type {
  RelayCursor,
  RelayError,
  RelayGoaway,
  RelayHello,
  RelayRosterUpdate,
  RelayRung,
  RelaySeatClaim,
  RosterEntry,
} from '../lib/types';

/**
 * The watch-party relay connection.
 *
 * One connection per party, owned by this hook. It carries three kinds of traffic on
 * one ordered Socket.IO channel:
 *
 *  - **binary poses**, batched by the relay at its tick rate and stamped with one
 *    server time, which is what removes the clock-skew bug in `SnapshotBuffer`.
 *  - **JSON control messages**, reusing the existing `RTMMessage` union so
 *    `rtm-events.ts` and every `on*` subscriber keep working unchanged.
 *  - **presence**, derived from connection state rather than reconciled from three
 *    separate signals.
 *
 * ---- WHY A SECOND SOCKET RATHER THAN THE GLOBAL ONE ----
 *
 * `lib/socket.ts` already holds an app-lifetime Socket.IO singleton to the API. This
 * cannot ride it: the relay is a different process on a different port, and one TCP
 * connection cannot address two servers. Socket.IO namespaces would not help either —
 * a namespace multiplexes over one connection to one server.
 *
 * So it is a separate connection with its own lifetime, tied to the party rather than
 * to the app. Deliberately mirroring `lib/socket.ts`'s shape: lazy `import()` so the
 * client is not in the initial bundle, `transports: ['websocket']` so it never rides
 * HTTP long-polling, and reconnection left to the library.
 *
 * ---- WHAT THIS HOOK DOES NOT DO ----
 *
 * No simulation, no prediction, no reconciliation. Movement stays
 * client-authoritative and seat claims converge by the deterministic rule in
 * `theatre/lib/seat-claims.ts`. The relay is a fan-out point with a clock.
 *
 * @packageDocumentation
 */

/** How often to probe the clock once calibrated. */
const CLOCK_PROBE_INTERVAL_MS = 30_000;
/** Probes fired back-to-back on connect, to calibrate before the first avatar moves. */
const CLOCK_PROBE_BURST = 5;
const CLOCK_PROBE_BURST_SPACING_MS = 120;
/** Refresh the token this long before it expires. */
const TOKEN_REFRESH_LEAD_MS = 150_000;

export interface UseRelayOptions {
  /** Room code. The connection is scoped to it by the token. */
  roomId: string | undefined;
  /** Local user id, used to filter self out of the peer list. */
  userId: string | undefined;
  /** Avatar body, announced once on the roster rather than on every pose. */
  character?: 'm' | 'w';
  /** Only connect while this is true, so 2D-only parties pay nothing. */
  enabled: boolean;
  /** A remote pose landed. Called once per peer per batch. */
  onPose?: (userId: string, pose: WirePose, serverTick: number) => void;
  /** A control message arrived. Hand straight to `dispatchRtmMessage`. */
  onMessage?: (message: RTMMessage, senderUserId: string) => void;
  /** A seat claim arrived, or was replayed on join. */
  onSeatClaim?: (claim: RelaySeatClaim) => void;
  /** A remote sketch cursor moved. Coordinates are normalised 0..1. */
  onCursor?: (userId: string, x: number, y: number) => void;
}

export interface RelayStats {
  /** Best round-trip time in the window, ms. */
  bestRttMs: number | null;
  /** p99 minus p50 of RTT — the figure that should size the interpolation buffer. */
  jitterMs: number | null;
  /** Offset from this machine's monotonic clock to the relay's, ms. */
  clockOffsetMs: number;
  clockSamples: number;
}

export function useRelay(options: UseRelayOptions) {
  const { roomId, userId, character, enabled } = options;

  /** Callbacks in a ref so the socket listeners never need re-registering. */
  const handlers = useRef(options);
  handlers.current = options;

  /**
   * Chosen avatar body, in a ref.
   *
   * Read at connect time only. A state dependency here would tear down and rebuild the
   * socket every time somebody switched body — losing their slot, their seat and their
   * clock calibration to change one field that is broadcast separately by
   * `announceCharacter`.
   */
  const characterRef = useRef(character);
  characterRef.current = character;

  const socketRef = useRef<Socket | null>(null);
  const clockRef = useRef(new ServerClock());
  const slotsRef = useRef(new SlotTable());
  const seqRef = useRef(0);
  const cursorSeqRef = useRef(0);

  const [rung, setRung] = useState<RelayRung>('offline');
  const [selfSlot, setSelfSlot] = useState<number | null>(null);
  const [roster, setRoster] = useState<readonly RosterEntry[]>([]);
  /**
   * Interpolation delay the relay asked for.
   *
   * Server-supplied rather than compiled in, so it can be retuned from measured jitter
   * without shipping a frontend release. Null until `hello`.
   */
  const [interpDelayMs, setInterpDelayMs] = useState<number | null>(null);
  const [stats, setStats] = useState<RelayStats>({
    bestRttMs: null,
    jitterMs: null,
    clockOffsetMs: 0,
    clockSamples: 0,
  });

  /**
   * Server time now.
   *
   * `performance.now()` is the base, never `Date.now()`. It is monotonic, so an NTP
   * correction or a user changing their system clock mid-party cannot make every remote
   * avatar jump at once.
   */
  const serverNow = useCallback(
    () => clockRef.current.now(performance.now()),
    [],
  );

  const sendPose = useCallback((pose: WirePose) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }
    seqRef.current = (seqRef.current + 1) & 0xffff;
    socket.emit('p', encodePose(seqRef.current, pose));
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }
    cursorSeqRef.current = (cursorSeqRef.current + 1) & 0xffff;
    socket.emit('p', encodeCursor(cursorSeqRef.current, x, y));
  }, []);

  /** Broadcast a control message. Same payload shape the RTM path used. */
  const sendMessage = useCallback((message: RTMMessage) => {
    socketRef.current?.emit('m', message);
  }, []);

  /** Send a control message to one member. Authorised server-side by sender. */
  const sendMessageToPeer = useCallback(
    (targetUserId: string, message: RTMMessage) => {
      const slot = slotsRef.current.slotFor(targetUserId);
      if (slot === null) {
        return;
      }
      socketRef.current?.emit('d', { toSlot: slot, inner: message });
    },
    [],
  );

  /**
   * Claim a seat, or stand up with null.
   *
   * `at` is stamped in SERVER time, so the deterministic tie-break in `incomingWins`
   * compares one clock rather than ten. With wall clocks, two people could each believe
   * they claimed first.
   */
  const claimSeat = useCallback(
    (seatId: string | null) => {
      const at = serverNow();
      socketRef.current?.emit('seat', { seatId, at });
      return at;
    },
    [serverNow],
  );

  const announceCharacter = useCallback((next: 'm' | 'w') => {
    socketRef.current?.emit('character', { character: next });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !userId) {
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let probeTimer: ReturnType<typeof setInterval> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const clock = clockRef.current;
    const slots = slotsRef.current;
    /** Probe id -> monotonic send time, so a late reply is still usable. */
    const inFlightProbes = new Map<number, number>();
    let probeId = 0;

    const publishStats = () => {
      setStats({
        bestRttMs: clock.bestRtt,
        jitterMs: clock.jitter,
        clockOffsetMs: clock.offset,
        clockSamples: clock.sampleCount,
      });
    };

    const probe = () => {
      if (!socket?.connected) {
        return;
      }
      probeId += 1;
      const id = probeId;
      inFlightProbes.set(id, performance.now());
      socket.emit('ts', { id, clientMono: performance.now() });
    };

    /** Refresh the token and rebind it without dropping the connection. */
    const scheduleRefresh = (ttlSeconds: number | undefined) => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      // Counted from a local duration rather than from the server's absolute expiry, so
      // a skewed local clock cannot schedule the refresh after the token has died.
      const ttlMs = (ttlSeconds ?? 900) * 1000;
      const delay = Math.max(15_000, ttlMs - TOKEN_REFRESH_LEAD_MS);
      refreshTimer = setTimeout(() => {
        void (async () => {
          if (cancelled || !roomId) {
            return;
          }
          const next = await getRelayToken(roomId);
          if (cancelled || !next.token) {
            // Nothing to do but try again shortly; the relay's own grace period covers
            // a brief failure, and its expiry sweep closes the socket if it persists.
            scheduleRefresh(60);
            return;
          }
          socket?.emit('renew', { token: next.token });
          scheduleRefresh(next.ttlSeconds);
        })();
      }, delay);
    };

    const connect = async () => {
      const minted = await getRelayToken(roomId);
      if (cancelled || !minted.token) {
        setRung('offline');
        return;
      }

      const { io } = await import('socket.io-client');
      if (cancelled) {
        return;
      }

      socket = io(env.WS_RELAY_URL, {
        transports: ['websocket'],
        auth: {
          token: minted.token,
          room: roomId,
          character: characterRef.current,
        },
        reconnection: true,
        reconnectionAttempts: Number.POSITIVE_INFINITY,
        reconnectionDelay: 250,
        reconnectionDelayMax: 8000,
        timeout: 10_000,
      });
      socketRef.current = socket;

      socket.on('connect', () => setRung('relay'));

      socket.on('disconnect', () => {
        setRung('reconnecting');
        // RTTs measured across different connections are not comparable, and the slot
        // table is only valid for the connection that issued it.
        clock.reset();
        slots.reset();
        setSelfSlot(null);
        publishStats();
      });

      socket.on('connect_error', () => setRung('reconnecting'));

      socket.on('hello', (hello: RelayHello) => {
        slots.apply(hello.rosterGen, hello.roster);
        setSelfSlot(hello.selfSlot);
        setRoster(slots.roster());
        setInterpDelayMs(hello.interpDelayMs);
        setRung('relay');

        // Calibrate before anyone moves: a burst of probes converges the clock in a few
        // hundred milliseconds, and the minimum-RTT filter means more samples can only
        // improve it.
        for (let i = 0; i < CLOCK_PROBE_BURST; i += 1) {
          timers.push(setTimeout(probe, i * CLOCK_PROBE_BURST_SPACING_MS));
        }

        // Replayed claims, so a late joiner does not start with every seat apparently
        // free. Each is handed over individually and the caller applies its own rule.
        for (const claim of hello.seats ?? []) {
          handlers.current.onSeatClaim?.(claim);
        }

        scheduleRefresh(undefined);
      });

      socket.on('roster', (update: RelayRosterUpdate) => {
        slots.apply(update.rosterGen, update.roster);
        setRoster(slots.roster());
      });

      socket.on('ts', (reply: { id?: number; serverTime?: number }) => {
        const sentMono =
          reply?.id === undefined ? undefined : inFlightProbes.get(reply.id);
        if (sentMono === undefined || typeof reply.serverTime !== 'number') {
          return;
        }
        inFlightProbes.delete(reply.id as number);
        clock.addSample(sentMono, reply.serverTime, performance.now());
        publishStats();
      });

      socket.on('P', (payload: ArrayBuffer) => {
        const batch = decodePoseBatch(payload);
        if (!batch) {
          return;
        }
        // A batch numbered against a roster we do not hold would draw a newcomer's pose
        // onto whoever previously held that slot. Dropping a tick is invisible at 20 Hz.
        if (!slots.accepts(batch.rosterGen)) {
          return;
        }
        for (const record of batch.poses as WirePoseRecord[]) {
          const peerId = slots.userIdFor(record.slot);
          if (!peerId || peerId === userId) {
            continue;
          }
          handlers.current.onPose?.(peerId, record, batch.tick);
        }
      });

      socket.on('m', (envelope: { from?: string; inner?: RTMMessage }) => {
        if (!envelope?.inner || !envelope.from) {
          return;
        }
        handlers.current.onMessage?.(envelope.inner, envelope.from);
      });

      socket.on('seat', (claim: RelaySeatClaim) => {
        handlers.current.onSeatClaim?.(claim);
      });

      socket.on('c', (cursor: RelayCursor) => {
        const peerId = slots.userIdFor(cursor.slot);
        if (!peerId || peerId === userId) {
          return;
        }
        handlers.current.onCursor?.(peerId, cursor.x, cursor.y);
      });

      socket.on('err', (error: RelayError) => {
        // AUTH_EXPIRING is the relay asking for a refresh, not a failure.
        if (error?.code === 'AUTH_EXPIRING' && roomId) {
          void (async () => {
            const next = await getRelayToken(roomId);
            if (!cancelled && next.token) {
              socket?.emit('renew', { token: next.token });
            }
          })();
        }
      });

      socket.on('goaway', (payload: RelayGoaway) => {
        // A drain, not a failure. Let the library reconnect after the delay rather than
        // treating it as an error the user should see.
        setRung('reconnecting');
        const delay = Math.max(250, payload?.reconnectAfterMs ?? 1000);
        timers.push(setTimeout(() => socket?.connect(), delay));
      });

      probeTimer = setInterval(probe, CLOCK_PROBE_INTERVAL_MS);
    };

    void connect();

    return () => {
      cancelled = true;
      for (const timer of timers) {
        clearTimeout(timer);
      }
      if (probeTimer) {
        clearInterval(probeTimer);
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      socket?.removeAllListeners();
      socket?.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      clock.reset();
      slots.reset();
      setRung('offline');
      setSelfSlot(null);
      setRoster([]);
      setInterpDelayMs(null);
    };
  }, [enabled, roomId, userId]);

  /** Announce a character change without reconnecting. */
  useEffect(() => {
    if (!enabled || !character) {
      return;
    }
    announceCharacter(character);
  }, [enabled, character, announceCharacter]);

  return {
    /** Whether the relay is carrying traffic right now. */
    rung,
    isConnected: rung === 'relay',
    selfSlot,
    roster,
    /** Present peers, excluding the local user. */
    peerIds: userId ? slotsRef.current.peerIds(userId) : [],
    /** Interpolation delay the relay asked for, or null before `hello`. */
    interpDelayMs,
    serverNow,
    sendPose,
    sendCursor,
    sendMessage,
    sendMessageToPeer,
    claimSeat,
    announceCharacter,
    /** Avatar body a peer chose, from the roster rather than from pose traffic. */
    characterFor: (peerId: string) => slotsRef.current.characterFor(peerId),
    /** RTT, jitter and clock offset — the Stage 0 instrumentation. */
    stats,
  };
}

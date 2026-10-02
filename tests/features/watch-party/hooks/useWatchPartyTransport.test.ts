import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyTransport } from '@/features/watch-party/room/hooks/useWatchPartyTransport';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

type Ack = (res: { success: boolean; error?: string }) => void;

/** Socket.IO stand-in. `acks` decides how the server answers each event. */
function makeSocket(acks: Record<string, { success: boolean }> = {}) {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  const emit = vi.fn((event: string, ...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function' && acks[event]) (cb as Ack)(acks[event]);
  });
  return {
    connected: true,
    id: 's1',
    on: (e: string, cb: (...a: unknown[]) => void) => {
      if (!handlers.has(e)) handlers.set(e, new Set());
      handlers.get(e)?.add(cb);
    },
    off: (e: string, cb: (...a: unknown[]) => void) =>
      handlers.get(e)?.delete(cb),
    emit,
    fire(e: string, payload?: unknown) {
      for (const cb of handlers.get(e) ?? []) cb(payload);
    },
  };
}

const JOINED = { 'watch-party:join_room': { success: true } };

function setup(
  socket: ReturnType<typeof makeSocket>,
  opts: { userId?: string; rtmConnected?: boolean } = {},
) {
  const rtmSend = vi.fn().mockResolvedValue(undefined);
  const rtmSendToPeer = vi.fn().mockResolvedValue(undefined);
  const onRelayMessage = vi.fn();
  const hook = renderHook(
    (props: { rtmConnected: boolean }) =>
      useWatchPartyTransport({
        socket: socket as never,
        roomId: 'R1',
        userId: opts.userId ?? 'U1',
        rtmConnected: props.rtmConnected,
        rtmSend,
        rtmSendToPeer,
        onRelayMessage,
      }),
    { initialProps: { rtmConnected: opts.rtmConnected ?? true } },
  );
  return { hook, rtmSend, rtmSendToPeer, onRelayMessage };
}

const relayEmits = (socket: ReturnType<typeof makeSocket>) =>
  socket.emit.mock.calls
    .filter((c) => c[0] === 'watch-party:relay')
    .map((c) => c[1]);

beforeEach(() => {
  sessionStorage.clear();
});

describe('useWatchPartyTransport — server room membership', () => {
  it('joins the server room for an authenticated member and reports ready', () => {
    const socket = makeSocket(JOINED);
    const { hook } = setup(socket);
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:join_room',
      'R1',
      expect.any(Function),
    );
    expect(hook.result.current.relayReady).toBe(true);
  });

  it('is not ready when the server refuses the join', () => {
    const socket = makeSocket({ 'watch-party:join_room': { success: false } });
    const { hook } = setup(socket);
    expect(hook.result.current.relayReady).toBe(false);
  });

  /* A guest's lobby socket has no identity until it presents its token. */
  it('authenticates a guest with its token before joining', () => {
    sessionStorage.setItem('guest_token', 'gt');
    const socket = makeSocket({
      'watch-party:guest_auth': { success: true },
      ...JOINED,
    });
    const { hook } = setup(socket, { userId: 'guest_abc' });
    const events = socket.emit.mock.calls.map((c) => c[0]);
    expect(events.indexOf('watch-party:guest_auth')).toBeLessThan(
      events.indexOf('watch-party:join_room'),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:guest_auth',
      'gt',
      expect.any(Function),
    );
    expect(hook.result.current.relayReady).toBe(true);
  });

  it('does not join as a guest whose auth is refused', () => {
    sessionStorage.setItem('guest_token', 'gt');
    const socket = makeSocket({
      'watch-party:guest_auth': { success: false },
      ...JOINED,
    });
    setup(socket, { userId: 'guest_abc' });
    expect(socket.emit).not.toHaveBeenCalledWith(
      'watch-party:join_room',
      'R1',
      expect.any(Function),
    );
  });

  it('re-authenticates and re-joins on reconnect, and is not ready while disconnected', () => {
    const socket = makeSocket(JOINED);
    const { hook } = setup(socket);
    act(() => socket.fire('disconnect'));
    expect(hook.result.current.relayReady).toBe(false);
    socket.emit.mockClear();
    act(() => socket.fire('connect'));
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:join_room',
      'R1',
      expect.any(Function),
    );
    expect(hook.result.current.relayReady).toBe(true);
  });

  it('leaves the server room on unmount', () => {
    const socket = makeSocket(JOINED);
    const { hook } = setup(socket);
    hook.unmount();
    expect(socket.emit).toHaveBeenCalledWith('watch-party:leave_room', 'R1');
  });
});

describe('useWatchPartyTransport — sending', () => {
  it('sends a control message on both paths with one shared id', async () => {
    const socket = makeSocket(JOINED);
    const { hook, rtmSend } = setup(socket);
    await act(() =>
      hook.result.current.send({
        type: 'PAUSE_EVENT',
        videoTime: 3,
        serverTime: 1,
      }),
    );
    const viaRtm = rtmSend.mock.calls[0][0];
    const [viaRelay] = relayEmits(socket) as {
      roomId: string;
      msg: { _mid: string };
    }[];
    expect(viaRtm._mid).toEqual(expect.any(String));
    expect(viaRelay).toEqual({ roomId: 'R1', msg: viaRtm });
  });

  /* The bug this exists for: host playback reached nobody when RTM was down. */
  it('relays control messages when RTM is down', async () => {
    const socket = makeSocket(JOINED);
    const { hook, rtmSend } = setup(socket, { rtmConnected: false });
    await act(() =>
      hook.result.current.send({
        type: 'PLAY_EVENT',
        videoTime: 0,
        playbackRate: 1,
        serverTime: 1,
      }),
    );
    expect(rtmSend).not.toHaveBeenCalled();
    expect(relayEmits(socket)).toHaveLength(1);
  });

  it('keeps avatar poses off the server while RTM is up, relays them when it is down', async () => {
    const socket = makeSocket(JOINED);
    const { hook, rtmSend } = setup(socket);
    const pose = {
      type: 'AVATAR_TRANSFORM',
      userId: 'U1',
      x: 0,
      y: 0,
      z: 0,
      r: 0,
      s: 'idle',
      t: 1,
    } as RTMMessage;

    await act(() => hook.result.current.send(pose));
    expect(rtmSend).toHaveBeenCalledTimes(1);
    expect(relayEmits(socket)).toHaveLength(0);

    hook.rerender({ rtmConnected: false });
    await act(() => hook.result.current.send(pose));
    expect(relayEmits(socket)).toHaveLength(1);
  });

  it('addresses a peer message to one member over the relay', async () => {
    const socket = makeSocket(JOINED);
    const { hook, rtmSendToPeer } = setup(socket);
    await act(() =>
      hook.result.current.sendToPeer('G1', {
        type: 'SKETCH_SYNC_STATE',
        elements: [],
        targetId: 'G1',
      }),
    );
    expect(rtmSendToPeer).toHaveBeenCalledWith(
      'G1',
      expect.objectContaining({ type: 'SKETCH_SYNC_STATE' }),
    );
    expect(relayEmits(socket)[0]).toMatchObject({ roomId: 'R1', to: 'G1' });
  });

  it('never relays the join handshake', async () => {
    const socket = makeSocket(JOINED);
    const { hook } = setup(socket);
    await act(() =>
      hook.result.current.sendToPeer('G1', {
        type: 'JOIN_REJECTED',
        reason: 'no',
      }),
    );
    expect(relayEmits(socket)).toHaveLength(0);
  });
});

describe('useWatchPartyTransport — receiving', () => {
  it('hands relayed messages to the caller with the server-stamped sender', () => {
    const socket = makeSocket(JOINED);
    const { onRelayMessage } = setup(socket);
    const msg = { type: 'CHAT', userId: 'H1' };
    act(() =>
      socket.fire('watch-party:relay', { roomId: 'r1', from: 'H1', msg }),
    );
    expect(onRelayMessage).toHaveBeenCalledWith(msg, 'H1');
  });

  it('ignores another room, a missing sender, and its own messages', () => {
    const socket = makeSocket(JOINED);
    const { onRelayMessage } = setup(socket);
    act(() => {
      socket.fire('watch-party:relay', {
        roomId: 'R2',
        from: 'H1',
        msg: { type: 'CHAT' },
      });
      socket.fire('watch-party:relay', { roomId: 'R1', msg: { type: 'CHAT' } });
      socket.fire('watch-party:relay', {
        roomId: 'R1',
        from: 'U1',
        msg: { type: 'CHAT' },
      });
      socket.fire('watch-party:relay', null);
    });
    expect(onRelayMessage).not.toHaveBeenCalled();
  });

  it('accepts each message id once', () => {
    const socket = makeSocket(JOINED);
    const { hook } = setup(socket);
    const msg = { type: 'CHAT', _mid: 'x1' } as unknown as RTMMessage;
    expect(hook.result.current.accept(msg)).toBe(true);
    expect(hook.result.current.accept({ ...msg })).toBe(false);
  });
});

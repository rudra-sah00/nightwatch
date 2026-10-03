/**
 * The Socket.IO relay as a real backup for Agora RTM, driven through `useWatchParty`.
 *
 * Before the relay, a guest whose RTM was down received nothing: no playback, no
 * kick, no closure. These tests stand RTM down entirely and check the party still
 * works over the server, that the receiver-side permission gate still applies, and
 * that a message arriving on both paths is processed once.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  checkRoomExists: vi.fn(),
  getRoomDetails: vi.fn(),
  createPartyRoom: vi.fn(),
  requestJoinPartyRoom: vi.fn(),
  leavePartyRoom: vi.fn().mockResolvedValue({ success: true }),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
  kickMember: vi.fn(),
  fetchPendingRequests: vi.fn().mockResolvedValue({ pendingMembers: [] }),
  dispatchRtmMessage: vi.fn(),
  getPartyMessages: vi.fn().mockResolvedValue({ messages: [] }),
  // Chat persists each sent message after relaying it; without this the
  // 'sends its own control messages' test throws an unhandled rejection.
  sendPartyMessage: vi.fn().mockResolvedValue({}),
  getPartyStreamToken: vi.fn().mockResolvedValue({ token: 't' }),
  syncPartyState: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()),
}));
vi.mock('sonner', () => import('../__mocks__/sonner'));
vi.mock('@/features/watch', () => import('../__mocks__/watch-utils'));
vi.mock('@/features/watch-party/media/hooks/useAgoraRtmToken', () => ({
  useAgoraRtmToken: vi.fn(() => ({
    appId: 'app',
    token: 'tok',
    channel: 'R1',
    uid: 'G1',
    isLoading: false,
  })),
}));

const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
/** Who the server reports in the room when this client joins. */
let joinOnline: string[] = [];
const emit = vi.fn((event: string, ...args: unknown[]) => {
  const cb = args[args.length - 1];
  if (event === 'watch-party:join_room' && typeof cb === 'function')
    cb({ success: true, online: joinOnline });
});
const mockSocket = {
  connected: true,
  id: 's1',
  on: (e: string, cb: (...a: unknown[]) => void) => {
    if (!handlers.has(e)) handlers.set(e, new Set());
    handlers.get(e)?.add(cb);
  },
  off: (e: string, cb: (...a: unknown[]) => void) =>
    handlers.get(e)?.delete(cb),
  emit,
};
vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

/** RTM is DOWN for this whole file unless a test says otherwise. */
let rtmConnected = false;
let rtmOnMessage: ((msg: RTMMessage, senderId: string) => void) | undefined;
let rtmOnPresence:
  | ((e: { action: 'JOIN' | 'LEAVE'; userId: string }) => void)
  | undefined;
const rtmSend = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/watch-party/media/hooks/useAgoraRtm', () => ({
  useAgoraRtm: vi.fn((opts) => {
    rtmOnMessage = opts.onMessage;
    rtmOnPresence = opts.onPresence;
    return {
      isConnected: rtmConnected,
      sendMessage: rtmSend,
      sendMessageToPeer: vi.fn(),
    };
  }),
}));

function room(): WatchPartyRoom {
  return {
    id: 'R1',
    hostId: 'H1',
    contentId: 'c1',
    title: 'T',
    type: 'movie',
    streamUrl: 'https://cdn/x.m3u8',
    members: [
      { id: 'H1', name: 'Host', isHost: true, joinedAt: 1 },
      { id: 'G1', name: 'Guest', isHost: false, joinedAt: 2 },
      { id: 'G2', name: 'Other', isHost: false, joinedAt: 3 },
    ],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
      lastUpdated: 0,
    },
    permissions: {
      canGuestsDraw: false,
      canGuestsPlaySounds: true,
      canGuestsChat: true,
    },
    createdAt: 0,
  } as WatchPartyRoom;
}

async function joined(onStateUpdate = vi.fn()) {
  vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
    room: room(),
    guestToken: 'gt',
  } as never);
  const hook = renderHook(() =>
    useWatchParty({ userId: 'G1', roomId: 'R1', onStateUpdate }),
  );
  await act(async () => {
    await hook.result.current.requestJoin('R1');
  });
  return hook;
}

function relay(from: string, msg: Record<string, unknown>) {
  for (const cb of handlers.get('watch-party:relay') ?? [])
    cb({ roomId: 'R1', from, msg });
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  rtmConnected = false;
  rtmOnMessage = undefined;
  rtmOnPresence = undefined;
  joinOnline = [];
  sessionStorage.clear();
});

describe('watch party over the Socket.IO relay, with RTM down', () => {
  it('applies host playback that arrives only via the relay', async () => {
    const onStateUpdate = vi.fn();
    const hook = await joined(onStateUpdate);

    await act(async () => {
      relay('H1', {
        type: 'PAUSE_EVENT',
        videoTime: 42,
        serverTime: Date.now(),
        _mid: 'p1',
      });
    });

    expect(onStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ isPlaying: false, currentTime: 42 }),
    );
    hook.unmount();
  });

  it('is kicked by a KICK that arrives only via the relay', async () => {
    const hook = await joined();
    await act(async () => {
      relay('H1', {
        type: 'KICK',
        targetUserId: 'G1',
        reason: 'bye',
        _mid: 'k1',
      });
    });
    expect(hook.result.current.room).toBeNull();
    expect(hook.result.current.isConnected).toBe(false);
    hook.unmount();
  });

  /* The relay delivers the server-stamped sender; the client gate must still apply to it. */
  it('refuses host-only messages relayed from a non-host', async () => {
    const hook = await joined();
    await act(async () => {
      relay('G2', {
        type: 'KICK',
        targetUserId: 'G1',
        reason: 'spoof',
        _mid: 'k2',
      });
    });
    expect(hook.result.current.room).not.toBeNull();
    hook.unmount();
  });

  it('sends its own control messages through the relay', async () => {
    const hook = await joined();
    emit.mockClear();
    await act(async () => {
      hook.result.current.sendMessage('hello');
    });
    const relayed = emit.mock.calls.filter((c) => c[0] === 'watch-party:relay');
    expect(relayed[0][1]).toMatchObject({
      roomId: 'R1',
      msg: { type: 'CHAT', content: 'hello' },
    });
    expect(rtmSend).not.toHaveBeenCalled();
    hook.unmount();
  });
});

describe('dual delivery', () => {
  it('processes a message once when it arrives on both paths', async () => {
    rtmConnected = true;
    const onStateUpdate = vi.fn();
    const hook = await joined(onStateUpdate);
    const msg = {
      type: 'SEEK_EVENT',
      videoTime: 10,
      playbackRate: 1,
      wasPlaying: true,
      serverTime: Date.now(),
      _mid: 's1',
    };

    await act(async () => {
      relay('H1', msg);
      rtmOnMessage?.({ ...msg } as unknown as RTMMessage, 'H1');
    });

    const seeks = onStateUpdate.mock.calls.filter(
      ([s]) => s.eventType === 'seek',
    );
    expect(seeks).toHaveLength(1);
    hook.unmount();
  });

  /* Two paths can reorder; a straggling older PLAY must not undo a newer SEEK. */
  it('drops an older playback event that lands after a newer one', async () => {
    rtmConnected = true;
    const onStateUpdate = vi.fn();
    const hook = await joined(onStateUpdate);
    const now = Date.now();

    await act(async () => {
      relay('H1', {
        type: 'SEEK_EVENT',
        videoTime: 90,
        playbackRate: 1,
        wasPlaying: true,
        serverTime: now,
        _mid: 'n',
      });
      rtmOnMessage?.(
        {
          type: 'PLAY_EVENT',
          videoTime: 5,
          playbackRate: 1,
          serverTime: now - 500,
          _mid: 'o',
        } as unknown as RTMMessage,
        'H1',
      );
    });

    expect(onStateUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ currentTime: 5 }),
    );
    expect(onStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ currentTime: 90 }),
    );
    hook.unmount();
  });
});

describe('presence with mixed transports', () => {
  /*
    The host's RTM drops but the host is still on the server. RTM presence alone used to
    start the guest's 60 s "host disconnected" countdown and then send them home, ending
    a party that was still running over the relay.
  */
  it('does not treat the host as gone while the server still sees them', async () => {
    rtmConnected = true;
    joinOnline = ['H1', 'G1', 'G2'];
    const hook = await joined();

    await act(async () => {
      rtmOnPresence?.({ action: 'JOIN', userId: 'H1' });
      rtmOnPresence?.({ action: 'LEAVE', userId: 'H1' });
    });
    expect(hook.result.current.hostDisconnected).toBe(false);

    await act(async () => {
      for (const cb of handlers.get('watch-party:presence') ?? []) {
        cb({ roomId: 'R1', userId: 'H1', online: false });
      }
    });
    expect(hook.result.current.hostDisconnected).toBe(true);
    hook.unmount();
  });

  it('does not flag a relay-only member disconnected when their RTM drops', async () => {
    rtmConnected = true;
    joinOnline = ['H1', 'G1', 'G2'];
    const hook = await joined();
    await act(async () => {
      rtmOnPresence?.({ action: 'LEAVE', userId: 'G2' });
    });
    const g2 = hook.result.current.room?.members.find((m) => m.id === 'G2');
    expect(g2?.disconnected).not.toBe(true);
    hook.unmount();
  });

  it('still uses RTM presence alone against a backend without socket presence', async () => {
    rtmConnected = true;
    const hook = await joined();
    await act(async () => {
      rtmOnPresence?.({ action: 'LEAVE', userId: 'G2' });
    });
    const g2 = hook.result.current.room?.members.find((m) => m.id === 'G2');
    expect(g2?.disconnected).toBe(true);
    hook.unmount();
  });
});

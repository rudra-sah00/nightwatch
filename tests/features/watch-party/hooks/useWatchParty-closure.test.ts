import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
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

/** A minimal Socket.IO stand-in whose events can be driven from a test. */
const socketHandlers = new Map<string, Set<(...args: unknown[]) => void>>();
const socketEmit = vi.fn();
const mockSocket = {
  on: (event: string, cb: (...args: unknown[]) => void) => {
    if (!socketHandlers.has(event)) socketHandlers.set(event, new Set());
    socketHandlers.get(event)?.add(cb);
  },
  off: (event: string, cb: (...args: unknown[]) => void) => {
    socketHandlers.get(event)?.delete(cb);
  },
  emit: socketEmit,
  connected: true,
  id: 's1',
};

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

let capturedOnMessage:
  | ((msg: RTMMessage, senderId?: string) => void)
  | undefined;

vi.mock('@/features/watch-party/media/hooks/useAgoraRtm', () => ({
  useAgoraRtm: vi.fn((opts) => {
    capturedOnMessage = opts.onMessage;
    return {
      isConnected: true,
      sendMessage: vi.fn(),
      sendMessageToPeer: vi.fn(),
    };
  }),
}));

/** A room where the viewer G1 is a guest, not the host. */
function guestRoom(
  permissions?: Partial<WatchPartyRoom['permissions']>,
): WatchPartyRoom {
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
      ...permissions,
    },
    createdAt: 0,
  } as WatchPartyRoom;
}

/** Drive the hook into a joined party as guest `G1`. */
async function joinedAsGuest(
  permissions?: Partial<WatchPartyRoom['permissions']>,
) {
  vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
    room: guestRoom(permissions),
    guestToken: 'gt',
  } as never);

  const hook = renderHook(() => useWatchParty({ userId: 'G1', roomId: 'R1' }));
  await act(async () => {
    await hook.result.current.requestJoin('R1');
  });
  return hook;
}

function fire(event: string, payload?: unknown) {
  for (const cb of socketHandlers.get(event) ?? []) cb(payload);
}

describe('useWatchParty — server-authoritative party closure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    capturedOnMessage = undefined;
    sessionStorage.clear();
  });

  /*
    The only place that ever emitted `watch-party:join_room` for an active party
    was a host-gated effect in `useWatchPartyMembers`, so no other member was in
    the server's `room:<id>` broadcast room and none of the server's party events
    could reach them.
  */
  it('puts a non-host member in the server broadcast room', async () => {
    const hook = await joinedAsGuest();

    expect(socketEmit).toHaveBeenCalledWith('watch-party:join_room', 'R1');

    hook.unmount();
  });

  it('leaves the broadcast room on teardown', async () => {
    const hook = await joinedAsGuest();
    socketEmit.mockClear();

    hook.unmount();

    expect(socketEmit).toHaveBeenCalledWith('watch-party:leave_room', 'R1');
  });

  /*
    RTM `PARTY_CLOSED` is one fire-and-forget channel message sent moments before
    the host's own client navigates away. A guest whose RTM subscription was
    mid-reconnect never saw it and sat in a party whose Redis room was gone.
    `watch-party:closed` is the server's own statement, and Socket.IO redelivers
    it on reconnect.
  */
  it('tears the party down on the server closure event', async () => {
    const hook = await joinedAsGuest();
    expect(hook.result.current.room).not.toBeNull();

    await act(async () => {
      fire('watch-party:closed', { reason: 'HOST_LEFT' });
    });

    expect(hook.result.current.room).toBeNull();
    expect(hook.result.current.isConnected).toBe(false);
    expect(hook.result.current.requestStatus).toBe('idle');
    expect(mockRouterPush).toHaveBeenCalled();

    hook.unmount();
  });

  it('re-joins the broadcast room after a socket reconnect', async () => {
    const hook = await joinedAsGuest();
    socketEmit.mockClear();

    await act(async () => {
      fire('connect');
    });

    expect(socketEmit).toHaveBeenCalledWith('watch-party:join_room', 'R1');

    hook.unmount();
  });
});

describe('useWatchParty — inbound RTM permission gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    capturedOnMessage = undefined;
    sessionStorage.clear();
  });

  const sketchClear: RTMMessage = {
    type: 'SKETCH_CLEAR',
    mode: 'all',
    userId: 'H1',
  };

  /*
    Sketch traffic never reaches our backend, so the only thing enforcing
    `canGuestsDraw` used to be whether the sender's own UI offered the control. A
    guest with drawing switched off could publish `SKETCH_CLEAR mode:'all'` by hand
    and wipe the host's canvas for the whole party.
  */
  it('does not dispatch sketch traffic from a guest who may not draw', async () => {
    const hook = await joinedAsGuest({ canGuestsDraw: false });

    await act(async () => {
      capturedOnMessage?.(sketchClear, 'G1');
    });

    expect(api.dispatchRtmMessage).not.toHaveBeenCalled();

    hook.unmount();
  });

  it('dispatches the same message once drawing is granted', async () => {
    const hook = await joinedAsGuest({ canGuestsDraw: true });

    await act(async () => {
      capturedOnMessage?.(sketchClear, 'G1');
    });

    expect(api.dispatchRtmMessage).toHaveBeenCalledWith(sketchClear);

    hook.unmount();
  });

  it('always dispatches sketch traffic published by the host', async () => {
    const hook = await joinedAsGuest({ canGuestsDraw: false });

    await act(async () => {
      capturedOnMessage?.(sketchClear, 'H1');
    });

    expect(api.dispatchRtmMessage).toHaveBeenCalledWith(sketchClear);

    hook.unmount();
  });
});

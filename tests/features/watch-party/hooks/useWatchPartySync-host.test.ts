/**
 * Regression tests for two host-side sync defects.
 *
 * 1. On a guest JOIN the host broadcast `video.currentTime`, which is 0 when the element
 *    is absent or still loading — resetting everyone already watching back to the start.
 * 2. `emitEvent` derived the persisted `isPlaying` from `room.state`, which is stale on
 *    the host (RTM does not echo a sender its own messages), so seeking while paused told
 *    the backend the party was playing and the next joiner played against a paused host.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartySync } from '@/features/watch-party/room/hooks/useWatchPartySync';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  syncPartyState: vi.fn(),
  updatePartyContent: vi.fn(),
  getPartyStreamToken: vi.fn().mockResolvedValue({ token: 'abc' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Room mid-playback at 45:00, currently paused by the host. */
function makeRoom(over: Partial<WatchPartyRoom['state']> = {}) {
  return {
    id: 'room-1',
    title: 'Movie',
    hostId: 'host-1',
    type: 'movie',
    state: {
      currentTime: 2700,
      isPlaying: false,
      lastUpdated: Date.now(),
      playbackRate: 1,
      ...over,
    },
  } as unknown as WatchPartyRoom;
}

type FakeVideo = {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  readyState: number;
};

function setup(opts: {
  video?: FakeVideo | null;
  isHost?: boolean;
  room?: WatchPartyRoom;
}) {
  const rtmSendMessage = vi.fn();
  const room = opts.room ?? makeRoom();
  const { result } = renderHook(() =>
    useWatchPartySync({
      room,
      setRoom: vi.fn(),
      userId: opts.isHost ? 'host-1' : 'guest-1',
      rtmSendMessage,
      normalizeRoomUrls: vi.fn((r) => r),
      isHost: opts.isHost ?? true,
      videoRef: {
        current: (opts.video ?? null) as unknown as HTMLVideoElement | null,
      },
    }),
  );
  return { result, rtmSendMessage, room };
}

const join = (result: { current: ReturnType<typeof useWatchPartySync> }) =>
  act(() => {
    result.current.handlePresenceEvent({ action: 'JOIN', userId: 'guest-2' });
  });

describe('host sync on guest join', () => {
  beforeEach(() => vi.clearAllMocks());

  it('broadcasts the live video position when the element is ready', () => {
    const { result, rtmSendMessage } = setup({
      video: {
        currentTime: 1234,
        paused: false,
        playbackRate: 1.5,
        readyState: 2,
      },
    });

    join(result);

    expect(rtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SYNC',
        videoTime: 1234,
        currentTime: 1234,
        isPlaying: true,
        playbackRate: 1.5,
      }),
    );
  });

  it('falls back to room state when the video element is absent', () => {
    const { result, rtmSendMessage } = setup({ video: null });

    join(result);

    // Must NOT publish 0 — that would reset every existing member to the start.
    expect(rtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SYNC',
        videoTime: 2700,
        currentTime: 2700,
        isPlaying: false,
        playbackRate: 1,
      }),
    );
  });

  it('falls back to room state while the video is still loading', () => {
    const { result, rtmSendMessage } = setup({
      // readyState 0 = HAVE_NOTHING; currentTime reads 0 even though the host is at 45:00
      video: { currentTime: 0, paused: true, playbackRate: 1, readyState: 0 },
    });

    join(result);

    expect(rtmSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ videoTime: 2700, currentTime: 2700 }),
    );
  });

  it('guests do not broadcast sync on join', () => {
    const { result, rtmSendMessage } = setup({
      isHost: false,
      video: { currentTime: 10, paused: false, playbackRate: 1, readyState: 2 },
    });

    join(result);

    expect(rtmSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SYNC' }),
    );
  });
});

describe('persisted isPlaying reflects the event, not stale room state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a seek while paused persists isPlaying false even if room state says playing', () => {
    // room.state is stale and claims the party is playing.
    const { result } = setup({ room: makeRoom({ isPlaying: true }) });

    act(() => {
      result.current.emitEvent({
        eventType: 'seek',
        videoTime: 600,
        wasPlaying: false,
      });
    });

    expect(api.syncPartyState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ currentTime: 600, isPlaying: false }),
    );
  });

  it('a seek while playing persists isPlaying true', () => {
    const { result } = setup({ room: makeRoom({ isPlaying: false }) });

    act(() => {
      result.current.emitEvent({
        eventType: 'seek',
        videoTime: 600,
        wasPlaying: true,
      });
    });

    expect(api.syncPartyState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ isPlaying: true }),
    );
  });

  it('play and pause still win outright', () => {
    const { result } = setup({ room: makeRoom({ isPlaying: false }) });

    act(() => {
      result.current.emitEvent({ eventType: 'play', videoTime: 10 });
    });
    expect(api.syncPartyState).toHaveBeenLastCalledWith(
      'room-1',
      expect.objectContaining({ isPlaying: true }),
    );

    act(() => {
      result.current.emitEvent({ eventType: 'pause', videoTime: 10 });
    });
    expect(api.syncPartyState).toHaveBeenLastCalledWith(
      'room-1',
      expect.objectContaining({ isPlaying: false }),
    );
  });

  it('falls back to room state when the event says nothing about playback', () => {
    const { result } = setup({ room: makeRoom({ isPlaying: true }) });

    act(() => {
      result.current.emitEvent({
        eventType: 'rate',
        videoTime: 10,
        playbackRate: 2,
      });
    });

    expect(api.syncPartyState).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ isPlaying: true, playbackRate: 2 }),
    );
  });
});

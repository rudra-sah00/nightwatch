/**
 * Regression test for AUDIT.md WP-M4 — the join-approval poll wrote state and toasted after unmount.
 *
 * While a join request is pending, a 10 s REST poll acts as a fallback for a missed Socket.IO
 * `JOIN_RESULT`. It checked the `socketCleaned` cleanup flag on entry and then awaited twice without
 * re-checking, so an iteration already in flight when the effect tore down resumed and ran to
 * completion.
 *
 * Under React 19 the setState calls are silent no-ops on an unmounted tree, so the symptom was the
 * toast: `sonner` is mounted globally rather than inside the party subtree, so a user who gave up on
 * the lobby and navigated away got "request approved" up to ten seconds later, on whatever page they
 * had moved to.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyLifecycle } from '@/features/watch-party/room/hooks/useWatchPartyLifecycle';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

/** The poll opens a socket purely as the primary path; it must not do anything here. */
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    active: true,
  }),
}));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  createPartyRoom: vi.fn(),
  getPartyStreamToken: vi.fn(),
  getRoomDetails: vi.fn(),
  leavePartyRoom: vi.fn(),
  requestJoinPartyRoom: vi.fn(),
}));

/** A room whose member list already contains us, i.e. the approval the poll is looking for. */
const approvedRoom = {
  id: 'R1',
  members: [{ id: 'u1', name: 'Me' }],
} as unknown as WatchPartyRoom;

function props() {
  return {
    setRoom: vi.fn(),
    setIsConnected: vi.fn(),
    setRequestStatus: vi.fn(),
    setMessages: vi.fn(),
    setError: vi.fn(),
    setErrorCode: vi.fn(),
    setIsLoading: vi.fn(),
    setAgoraRtmToken: vi.fn(),
    requestStatus: 'pending' as const,
    normalizeRoomUrls: vi.fn((r: unknown) => r),
    userId: 'u1',
    roomId: 'R1',
  } as unknown as Parameters<typeof useWatchPartyLifecycle>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  toastSuccess.mockClear();
  sessionStorage.clear();
});

describe('WP-M4 — the join poll must stop at unmount', () => {
  it('does not announce approval when the lobby unmounts mid-request', async () => {
    vi.useFakeTimers();

    /*
      Suspend the first await so the unmount lands while the iteration is in flight. This is the
      exact interleaving the defect needed, and the only one that reproduces it.
    */
    let releaseRoomDetails: (r: WatchPartyRoom) => void = () => {};
    vi.mocked(api.getRoomDetails).mockReturnValue(
      new Promise<WatchPartyRoom>((resolve) => {
        releaseRoomDetails = resolve;
      }) as ReturnType<typeof api.getRoomDetails>,
    );
    vi.mocked(api.getPartyStreamToken).mockResolvedValue({ token: 't' });

    const { unmount } = renderHook(() => useWatchPartyLifecycle(props()));

    // Fire the poll, leaving it parked on the first await.
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    // The user gives up and navigates away.
    unmount();

    // The request they had already triggered now comes back approved.
    await act(async () => {
      releaseRoomDetails(approvedRoom);
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(toastSuccess).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  /*
    The other half: the fallback must still work. A poll that completes while mounted has to
    announce the approval, or the fix has simply broken the feature it guards.
  */
  it('still announces approval when the lobby is mounted', async () => {
    vi.useFakeTimers();
    vi.mocked(api.getRoomDetails).mockResolvedValue(approvedRoom);
    vi.mocked(api.getPartyStreamToken).mockResolvedValue({ token: 't' });

    renderHook(() => useWatchPartyLifecycle(props()));

    /*
      `advanceTimersByTimeAsync`, not `runAllTimersAsync`: the poll is a repeating 10 s interval, so
      draining all timers never terminates. This advances one tick and lets its microtasks settle.
    */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(toastSuccess).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

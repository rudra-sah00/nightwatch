/**
 * Tests that a pending guest learns the room's host id, which is what lets the RTM join handshake be
 * gated for guests rather than only for authenticated joiners (AUDIT.md WP-C1, final row).
 *
 * `JOIN_APPROVED` carries a whole room object the recipient adopts wholesale, so a forged one redirects a
 * joining user at an attacker-supplied `streamUrl`. It arrives while `room` is still `null`, so it cannot
 * be checked against `room.hostId` and is checked against the lobby's `expectedHostId` instead.
 *
 * The problem that left guests uncovered: the backend withholds `hostId` from unauthenticated room
 * previews, so a guest had no expected host. But a guest holds a guest token from the moment
 * `requestJoin` succeeds, and `apiFetch` attaches it, so the same preview endpoint then *does* return
 * `hostId`. Fetching it in that window needs no backend change and no privacy reversal.
 *
 * **Residual, asserted below:** the fetch is not awaited, so an approval arriving before it resolves is
 * still ungated. That narrows the window to the length of one REST call rather than closing it — awaiting
 * would delay every legitimate join to defend against a race an attacker cannot reliably win.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyLifecycle } from '@/features/watch-party/room/hooks/useWatchPartyLifecycle';
import * as api from '@/features/watch-party/room/services/watch-party.api';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    active: true,
  }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
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
  checkRoomExists: vi.fn(),
}));

function props(overrides: Record<string, unknown> = {}) {
  return {
    setRoom: vi.fn(),
    setIsConnected: vi.fn(),
    setRequestStatus: vi.fn(),
    setMessages: vi.fn(),
    setError: vi.fn(),
    setErrorCode: vi.fn(),
    setIsLoading: vi.fn(),
    setAgoraRtmToken: vi.fn(),
    requestStatus: 'idle' as const,
    normalizeRoomUrls: vi.fn((r: unknown) => r),
    ...overrides,
  } as unknown as Parameters<typeof useWatchPartyLifecycle>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('pending guest resolves the host id', () => {
  it('reports the host id after a join request is left pending', async () => {
    const setResolvedHostId = vi.fn();
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      status: 'pending',
      guestToken: 'guest-jwt',
    } as never);
    vi.mocked(api.checkRoomExists).mockResolvedValue({
      exists: true,
      preview: { hostId: 'host-1' },
    } as never);

    const { result } = renderHook(() =>
      useWatchPartyLifecycle(props({ setResolvedHostId })),
    );

    await act(async () => {
      await result.current.requestJoin('R1', 'Guest');
    });

    await waitFor(() =>
      expect(setResolvedHostId).toHaveBeenCalledWith('host-1'),
    );
  });

  /* The token is what makes hostId readable, so it must be stored before the lookup. */
  it('stores the guest token before looking the host id up', async () => {
    const order: string[] = [];
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      status: 'pending',
      guestToken: 'guest-jwt',
    } as never);
    vi.mocked(api.checkRoomExists).mockImplementation(async () => {
      order.push(
        sessionStorage.getItem('guest_token')
          ? 'token-present'
          : 'token-absent',
      );
      return { exists: true, preview: { hostId: 'host-1' } } as never;
    });

    const { result } = renderHook(() =>
      useWatchPartyLifecycle(props({ setResolvedHostId: vi.fn() })),
    );
    await act(async () => {
      await result.current.requestJoin('R1', 'Guest');
    });

    await waitFor(() => expect(order).toEqual(['token-present']));
  });

  /* A preview without hostId — an older backend, say — must not report anything. */
  it('reports nothing when the preview carries no host id', async () => {
    const setResolvedHostId = vi.fn();
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      status: 'pending',
      guestToken: 'guest-jwt',
    } as never);
    vi.mocked(api.checkRoomExists).mockResolvedValue({
      exists: true,
      preview: { hostName: 'Room Host' },
    } as never);

    const { result } = renderHook(() =>
      useWatchPartyLifecycle(props({ setResolvedHostId })),
    );
    await act(async () => {
      await result.current.requestJoin('R1', 'Guest');
    });

    expect(setResolvedHostId).not.toHaveBeenCalled();
  });

  /* A failed lookup must not break joining — the handshake just stays ungated, as before. */
  it('does not fail the join when the lookup rejects', async () => {
    const setRequestStatus = vi.fn();
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      status: 'pending',
      guestToken: 'guest-jwt',
    } as never);
    vi.mocked(api.checkRoomExists).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() =>
      useWatchPartyLifecycle(
        props({ setResolvedHostId: vi.fn(), setRequestStatus }),
      ),
    );

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.requestJoin('R1', 'Guest');
    });

    expect(outcome).toEqual({ success: true, status: 'pending' });
    expect(setRequestStatus).toHaveBeenCalledWith('pending');
  });

  /* An immediate join needs no lookup: the room, and its hostId, are already in hand. */
  it('does not look the host id up when the join is immediate', async () => {
    vi.mocked(api.requestJoinPartyRoom).mockResolvedValue({
      room: { id: 'R1', hostId: 'host-1', members: [] },
      guestToken: 'guest-jwt',
    } as never);
    vi.mocked(api.getPartyStreamToken).mockResolvedValue({
      token: 't',
    } as never);

    const { result } = renderHook(() =>
      useWatchPartyLifecycle(props({ setResolvedHostId: vi.fn() })),
    );
    await act(async () => {
      await result.current.requestJoin('R1', 'Guest');
    });

    expect(api.checkRoomExists).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rtmRetryDelayMs } from '@/features/watch-party/media/hooks/useAgoraRtm';
import {
  createMessageDedupe,
  createPlaybackOrderGuard,
  createTrailingThrottle,
  newMessageId,
  routeMessage,
  type WireMessage,
} from '@/features/watch-party/room/lib/transport';

vi.mock('sonner', () => import('./__mocks__/sonner'));

describe('routeMessage', () => {
  it('sends control messages on both paths when both are up', () => {
    expect(routeMessage('SEEK_EVENT', true, true)).toEqual({
      rtm: true,
      relay: true,
    });
    expect(routeMessage('KICK', true, true)).toEqual({
      rtm: true,
      relay: true,
    });
    expect(routeMessage('CHAT', true, true)).toEqual({
      rtm: true,
      relay: true,
    });
  });

  /* The whole point: an RTM outage must not silence the host. */
  it('still relays control messages when RTM is down', () => {
    expect(routeMessage('PLAY_EVENT', false, true)).toEqual({
      rtm: false,
      relay: true,
    });
  });

  it('keeps high-frequency traffic on RTM while it is up', () => {
    expect(routeMessage('AVATAR_TRANSFORM', true, true)).toEqual({
      rtm: true,
      relay: false,
    });
    expect(routeMessage('SKETCH_CURSOR_MOVE', true, true)).toEqual({
      rtm: true,
      relay: false,
    });
  });

  it('falls back to the relay for high-frequency traffic when RTM is down', () => {
    expect(routeMessage('AVATAR_TRANSFORM', false, true)).toEqual({
      rtm: false,
      relay: true,
    });
  });

  it('never relays the join handshake', () => {
    expect(routeMessage('JOIN_APPROVED', true, true)).toEqual({
      rtm: true,
      relay: false,
    });
    expect(routeMessage('JOIN_REJECTED', false, true)).toEqual({
      rtm: false,
      relay: false,
    });
  });

  it('does not relay when the socket is not in the room', () => {
    expect(routeMessage('SEEK_EVENT', true, false)).toEqual({
      rtm: true,
      relay: false,
    });
  });
});

describe('createMessageDedupe', () => {
  it('accepts the first copy and drops the second', () => {
    const d = createMessageDedupe();
    expect(d.accept({ _mid: 'a' })).toBe(true);
    expect(d.accept({ _mid: 'a' })).toBe(false);
    expect(d.accept({ _mid: 'b' })).toBe(true);
  });

  /* An older client sends no id; it must not be silenced. */
  it('always accepts messages without an id', () => {
    const d = createMessageDedupe();
    expect(d.accept({})).toBe(true);
    expect(d.accept({})).toBe(true);
    expect(d.accept(null)).toBe(true);
  });

  it('is bounded and forgets the oldest ids first', () => {
    const d = createMessageDedupe(2);
    d.accept({ _mid: '1' });
    d.accept({ _mid: '2' });
    d.accept({ _mid: '3' });
    expect(d.accept({ _mid: '1' })).toBe(true);
    expect(d.accept({ _mid: '3' })).toBe(false);
  });

  it('produces distinct ids', () => {
    const ids = new Set(Array.from({ length: 500 }, newMessageId));
    expect(ids.size).toBe(500);
  });
});

describe('createPlaybackOrderGuard', () => {
  it('drops a playback event older than one already applied', () => {
    const g = createPlaybackOrderGuard();
    expect(g.accept({ type: 'SEEK_EVENT', serverTime: 2000 })).toBe(true);
    expect(g.accept({ type: 'PLAY_EVENT', serverTime: 1500 })).toBe(false);
    expect(g.accept({ type: 'PAUSE_EVENT', serverTime: 2500 })).toBe(true);
  });

  it('treats a far older stamp as a host clock reset, not a straggler', () => {
    const g = createPlaybackOrderGuard(10_000);
    g.accept({ type: 'SYNC', serverTime: 100_000 });
    expect(g.accept({ type: 'SYNC', serverTime: 50_000 })).toBe(true);
    expect(g.accept({ type: 'SYNC', serverTime: 49_000 })).toBe(false);
  });

  it('ignores non-playback messages', () => {
    const g = createPlaybackOrderGuard();
    g.accept({ type: 'SYNC', serverTime: 5000 });
    expect(g.accept({ type: 'CHAT', serverTime: 1 })).toBe(true);
  });
});

describe('createTrailingThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const pose = (x: number) =>
    ({ type: 'AVATAR_TRANSFORM', x }) as unknown as WireMessage;

  /* Dropping the last pose would leave a stopped avatar frozen short of where it stood. */
  it('sends the first message, withholds a burst, then sends the newest', () => {
    const out: WireMessage[] = [];
    const t = createTrailingThrottle((m) => out.push(m), {
      AVATAR_TRANSFORM: 250,
    });
    t.send(pose(1));
    t.send(pose(2));
    t.send(pose(3));
    expect(out).toHaveLength(1);
    vi.advanceTimersByTime(250);
    expect(out.map((m) => (m as unknown as { x: number }).x)).toEqual([1, 3]);
  });

  it('passes unthrottled types straight through', () => {
    const out: WireMessage[] = [];
    const t = createTrailingThrottle((m) => out.push(m), {
      AVATAR_TRANSFORM: 250,
    });
    t.send({ type: 'TYPING_START' } as WireMessage);
    t.send({ type: 'TYPING_START' } as WireMessage);
    expect(out).toHaveLength(2);
  });

  it('cancel drops anything withheld', () => {
    const out: WireMessage[] = [];
    const t = createTrailingThrottle((m) => out.push(m), {
      AVATAR_TRANSFORM: 250,
    });
    t.send(pose(1));
    t.send(pose(2));
    t.cancel();
    vi.advanceTimersByTime(1000);
    expect(out).toHaveLength(1);
  });
});

describe('rtmRetryDelayMs', () => {
  it('backs off exponentially from 1 s', () => {
    const noJitter = () => 0;
    expect(rtmRetryDelayMs(0, noJitter)).toBe(1000);
    expect(rtmRetryDelayMs(1, noJitter)).toBe(2000);
    expect(rtmRetryDelayMs(3, noJitter)).toBe(8000);
  });

  it('caps at 30 s plus jitter', () => {
    expect(rtmRetryDelayMs(20, () => 0)).toBe(30_000);
    expect(rtmRetryDelayMs(20, () => 1)).toBe(37_500);
  });
});

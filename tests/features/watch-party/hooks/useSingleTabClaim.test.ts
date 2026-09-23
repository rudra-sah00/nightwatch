import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSingleTabClaim } from '@/features/watch-party/hooks/use-single-tab-claim';

/**
 * Multi-tab ownership of a watch party room.
 *
 * Regression cover for two defects in the original two-line protocol (post
 * `TAB_ACTIVE` on mount, block on any inbound message):
 *
 * 1. It blocked the wrong tab. `BroadcastChannel` does not echo to the sender, so
 *    only the already-mounted tab heard a newcomer — opening a second tab blocked
 *    the first, the one actually playing.
 * 2. It never recovered. Nothing was posted after mount, so closing the winning
 *    tab left the other stuck on "open in another tab" for good.
 *
 * Uses the real `BroadcastChannel`, which in one Node process gives exactly the
 * semantics the browser does: instances sharing a name see each other's messages
 * and never their own. Each `renderHook` is a simulated tab.
 */
describe('useSingleTabClaim', () => {
  const ROOM = 'ROOM01';
  let now = 1_000;

  beforeEach(() => {
    now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Let queued BroadcastChannel deliveries run. */
  const settle = () =>
    act(async () => void (await new Promise((r) => setTimeout(r, 20))));

  it('lets a lone tab own the room', async () => {
    const tab = renderHook(() => useSingleTabClaim(ROOM));
    await settle();

    expect(tab.result.current).toBe(false);
    tab.unmount();
    await settle();
  });

  it('blocks the newcomer and leaves the incumbent playing', async () => {
    const first = renderHook(() => useSingleTabClaim(ROOM));
    await settle();

    now = 2_000;
    const second = renderHook(() => useSingleTabClaim(ROOM));
    await settle();

    // The tab that was already playing keeps the room.
    expect(first.result.current).toBe(false);
    expect(second.result.current).toBe(true);

    first.unmount();
    second.unmount();
    await settle();
  });

  it('hands the room to the blocked tab when the owner closes', async () => {
    const first = renderHook(() => useSingleTabClaim(ROOM));
    await settle();

    now = 2_000;
    const second = renderHook(() => useSingleTabClaim(ROOM));
    await settle();
    expect(second.result.current).toBe(true);

    // The whole point: closing the tab you did not want must not cost you the
    // party in the tab you did.
    first.unmount();
    await settle();

    expect(second.result.current).toBe(false);

    second.unmount();
    await settle();
  });

  it('settles on exactly one owner when three tabs contend', async () => {
    const tabs = [renderHook(() => useSingleTabClaim(ROOM))];
    await settle();
    now = 2_000;
    tabs.push(renderHook(() => useSingleTabClaim(ROOM)));
    await settle();
    now = 3_000;
    tabs.push(renderHook(() => useSingleTabClaim(ROOM)));
    await settle();

    expect(tabs.map((t) => t.result.current)).toEqual([false, true, true]);

    // Oldest leaves — the next-oldest of the two survivors takes over, alone.
    tabs[0].unmount();
    await settle();
    expect(tabs.slice(1).map((t) => t.result.current)).toEqual([false, true]);

    for (const t of tabs.slice(1)) t.unmount();
    await settle();
  });

  /*
    `Date.now()` cannot separate two tabs opened in the same millisecond. Without
    the random tie-break each would find the other "not older" and both would
    claim the room — the exact duplicate-RTM-client failure this hook prevents.
  */
  it('still picks one owner when two tabs claim in the same millisecond', async () => {
    const a = renderHook(() => useSingleTabClaim(ROOM));
    const b = renderHook(() => useSingleTabClaim(ROOM));
    await settle();

    const blocked = [a, b].filter((t) => t.result.current).length;
    expect(blocked).toBe(1);

    a.unmount();
    b.unmount();
    await settle();
  });

  it('does not contend across different rooms', async () => {
    const inRoomA = renderHook(() => useSingleTabClaim('AAAAAA'));
    await settle();
    now = 2_000;
    const inRoomB = renderHook(() => useSingleTabClaim('BBBBBB'));
    await settle();

    expect(inRoomA.result.current).toBe(false);
    expect(inRoomB.result.current).toBe(false);

    inRoomA.unmount();
    inRoomB.unmount();
    await settle();
  });
});

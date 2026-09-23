'use client';

import { useEffect, useState } from 'react';

/**
 * Single-tab ownership of one watch party room.
 *
 * Two tabs on the same room means two Agora RTM clients on the same channel with
 * the same uid. Every event is then handled twice — two chat lines per message,
 * two avatars for one person — and Agora rejects the duplicate login often enough
 * to break the tab that was working. Exactly one tab has to own the room.
 *
 * ## What this replaced
 *
 * The previous protocol was two lines: post `TAB_ACTIVE` on mount, and block
 * yourself on receiving *any* message. Both halves were wrong.
 *
 * - **It blocked the wrong tab.** `BroadcastChannel` does not echo to the sender,
 *   so only the already-mounted tab hears a newcomer's announcement. Opening a
 *   second tab therefore blocked the first — the one actually playing — and handed
 *   the room to the new one.
 * - **It never recovered.** Nothing was ever posted again, so once the winning tab
 *   was closed the blocked tab stayed on "open in another tab" forever. Closing
 *   the tab you did not want was enough to lose the party from the tab you did,
 *   short of a manual reload.
 *
 * ## The protocol
 *
 * Each tab stamps a claim with `Date.now()` plus a random id, and broadcasts it. A
 * tab defers only to an **older** claim, so the incumbent keeps the room and the
 * newcomer blocks — which is also the intuitive outcome, since the newcomer has
 * nothing on screen yet to lose. An older tab answers a newer claim with its own,
 * because a tab that mounted later would otherwise never hear the incumbent and
 * would take the room by default.
 *
 * Ties break on the random id. Without it, two tabs opened inside the same
 * millisecond would each find the other "not older" and both would claim
 * ownership — the precise failure the hook exists to prevent.
 *
 * On `pagehide` (and on unmount) a tab announces `TAB_CLOSING`; any blocked tab
 * that hears it clears its block and re-claims. If several blocked tabs are open
 * they settle it between themselves on the exchange of claims that triggers.
 *
 * `pagehide` rather than `unload`: `unload` does not fire on iOS Safari, nor when
 * a page enters the back/forward cache — the two cases where a departing tab would
 * otherwise strand the remaining one.
 *
 * @param roomId - Room code. Scopes the channel, so two different parties in two
 *   tabs do not contend with each other.
 * @returns `true` while another tab owns this room and this one must stay idle.
 */
export function useSingleTabClaim(roomId: string): boolean {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const claimedAt = Date.now();
    const claimId = Math.random().toString(36).slice(2);
    const bc = new BroadcastChannel(`watch-party:${roomId}`);

    type Claim = { type: 'CLAIM'; at: number; id: string };
    type Closing = { type: 'TAB_CLOSING'; id: string };

    const claim = () =>
      bc.postMessage({ type: 'CLAIM', at: claimedAt, id: claimId });

    /** Whether `other` staked its claim before ours. */
    const isOlder = (other: Claim) =>
      other.at < claimedAt || (other.at === claimedAt && other.id < claimId);

    bc.onmessage = (event: MessageEvent<Claim | Closing>) => {
      const data = event.data;

      if (data?.type === 'CLAIM') {
        if (isOlder(data)) {
          setIsBlocked(true);
        } else {
          // We are the older claim. Say so, or the newcomer — which cannot have
          // heard our original announcement — keeps the room.
          claim();
        }
        return;
      }

      if (data?.type === 'TAB_CLOSING') {
        setIsBlocked(false);
        claim();
      }
    };

    claim();

    const announceClosing = () =>
      bc.postMessage({ type: 'TAB_CLOSING', id: claimId });
    window.addEventListener('pagehide', announceClosing);

    return () => {
      window.removeEventListener('pagehide', announceClosing);
      announceClosing();
      bc.close();
    };
  }, [roomId]);

  return isBlocked;
}

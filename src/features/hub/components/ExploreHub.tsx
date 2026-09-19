'use client';

import { HubScreen } from './HubScreen';

/**
 * Entry hub as the `/home` page.
 *
 * `/home` is the post-login landing and the sidebar's Home target, so the hub is the
 * page here rather than an overlay — but it presents identically to the gate, taking
 * over the whole viewport. No `onContinue`: there is nothing behind /home to continue
 * to, so a choice is the only way forward.
 *
 * `HubGate` skips `/home` for this reason; otherwise the two would stack.
 */
export function ExploreHub() {
  return <HubScreen />;
}

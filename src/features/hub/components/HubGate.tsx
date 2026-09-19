'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { HubScreen } from './HubScreen';

/**
 * Route that renders the hub as its page content. The gate stands down there so the
 * two do not stack.
 */
const HUB_PAGE = '/home';

/**
 * Whether the hub has already been answered for this document load.
 *
 * Module scope is the mechanism, not an accident. It is created once per document and
 * survives client-side navigation, which is exactly the "once per cold start or hard
 * refresh" semantics wanted: picking a destination must not re-trigger the gate on the
 * navigation it causes, but a real reload must show it again. `sessionStorage` would
 * persist across reloads and `useState` would reset on every route change — both wrong.
 */
let answeredThisLoad = false;

/** Test-only reset; module state otherwise persists for the life of the document. */
export function __resetHubGateForTests() {
  answeredThisLoad = false;
}

/**
 * Full-screen entry gate.
 *
 * Mounted in the protected layout, so it covers every authenticated route — including
 * the player, watch parties and clips — on each cold start or hard refresh. Because it
 * lives above the layout chrome it hides the sidebars and navbar while up.
 *
 * Deep links stay reachable: when the loaded route is not the hub page itself, the
 * screen offers a way through to it. Without that, a shared watch-party invite could
 * never be opened, since every tile navigates away from it.
 */
export function HubGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (answeredThisLoad) return;

    // The hub page presents the hub itself; treat landing there as having asked.
    if (pathname === HUB_PAGE) {
      answeredThisLoad = true;
      return;
    }

    setOpen(true);
  }, [pathname]);

  const dismiss = useCallback(() => {
    answeredThisLoad = true;
    setOpen(false);
  }, []);

  if (!open) return null;

  return <HubScreen onPick={dismiss} onContinue={dismiss} />;
}

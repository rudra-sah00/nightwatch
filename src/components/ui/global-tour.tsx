'use client';

import type { Driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useDesktopApp } from '@/platforms/desktop/use-desktop-app';
import { useIsMobile } from '@/platforms/mobile/use-is-mobile';
import { useTheme } from '@/providers/theme-provider';

/**
 * The tour runs in two phases, because no single route can show everything.
 *
 * - `hub` — on `/home`, where the entry hub is the page. The hub is an opaque
 *   `fixed inset-0` surface above driver.js's overlay (z-index 10000), so the navbar
 *   and both sidebars are unreachable here. Only the hub's own tiles can be
 *   highlighted.
 * - `chrome` — on `/search`, reached when the hub phase finishes. The hub gate has
 *   already been answered for this document load, so the layout chrome is visible;
 *   and `/search` without a query renders the search landing, which is where the
 *   search input now lives.
 */
type TourPhase = 'hub' | 'chrome';

/** Route that hosts each phase. */
const PHASE_ROUTE: Record<TourPhase, string> = {
  hub: '/home',
  chrome: '/search',
};

/** Query value that selects each phase. `true` is kept for the signup redirects. */
const PHASE_PARAM: Record<TourPhase, string> = {
  hub: 'true',
  chrome: 'chrome',
};

/** How long the chrome phase waits for the hub gate to be dismissed before giving up. */
const HUB_WAIT_TIMEOUT_MS = 20_000;
const HUB_WAIT_POLL_MS = 250;

/**
 * Resolve whether the current theme is dark.
 */
function isDark(theme: string) {
  if (theme === 'dark') return true;
  if (theme === 'system' && typeof window !== 'undefined')
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}

/** The phase to run for the current route and `?tour=` value, if any. */
function resolvePhase(
  pathname: string,
  param: string | null,
): TourPhase | null {
  if (!param) return null;
  for (const phase of ['hub', 'chrome'] as const) {
    if (pathname === PHASE_ROUTE[phase] && param === PHASE_PARAM[phase]) {
      return phase;
    }
  }
  return null;
}

/**
 * Resolve once the hub screen is off the DOM, or after {@link HUB_WAIT_TIMEOUT_MS}.
 *
 * The chrome phase is normally reached by client-side navigation from the hub, where
 * the gate has already stood down. But a hard refresh on `/search?tour=chrome` brings
 * the gate back up over the page, and highlighting chrome underneath it would produce
 * popovers pointing at an opaque surface. Waiting lets the user dismiss it first.
 *
 * @returns `true` if the hub cleared, `false` on timeout.
 */
function waitForHubToClear(signal: { cancelled: boolean }): Promise<boolean> {
  if (!document.querySelector('[data-hub-screen]'))
    return Promise.resolve(true);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      if (signal.cancelled) {
        window.clearInterval(poll);
        resolve(false);
        return;
      }
      if (!document.querySelector('[data-hub-screen]')) {
        window.clearInterval(poll);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt > HUB_WAIT_TIMEOUT_MS) {
        window.clearInterval(poll);
        resolve(false);
      }
    }, HUB_WAIT_POLL_MS);
  });
}

/**
 * Headless component that launches an interactive product tour using `driver.js`.
 *
 * Signup and Google sign-in land on `/home?tour=true`. The hub phase walks the entry
 * tiles there, then hands over to the chrome phase on `/search` for the navigation,
 * friends and profile surfaces the hub does not cover. Cleans up the `tour` query
 * param when the user finishes or closes.
 *
 * Renders nothing to the DOM.
 */
export function GlobalTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tourStarted = useRef(false);
  const { isDesktopApp } = useDesktopApp();
  const mobile = useIsMobile();
  const { theme } = useTheme();
  const { setLeftOpen, setRightOpen } = useSidebar();
  const t = useTranslations('common.tour');

  useEffect(() => {
    if (typeof window === 'undefined' || tourStarted.current) return;

    const phase = resolvePhase(pathname || '', searchParams.get('tour'));
    if (!phase) return;

    tourStarted.current = true;

    const dark = isDark(theme);
    const bg = dark ? '#18181b' : '#ffffff';
    const fg = dark ? '#fafafa' : '#1a1a1a';
    const overlay = dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

    const title = (text: string) =>
      `<span class="font-headline font-black text-xl uppercase tracking-tighter" style="color:${fg}">${text}</span>`;
    const desc = (text: string) =>
      `<span class="font-body text-sm font-medium" style="color:${fg};opacity:0.7">${text}</span>`;

    const clearTourParam = () => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('tour');
      router.replace(
        `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`,
      );
    };

    const signal = { cancelled: false };
    let driverObj: Driver | undefined;

    const timer = setTimeout(async () => {
      if (phase === 'chrome' && !(await waitForHubToClear(signal))) {
        // Gate never dismissed — drop the tour rather than point at an opaque surface.
        clearTourParam();
        return;
      }
      if (signal.cancelled) return;

      const { driver } = await import('driver.js');
      if (signal.cancelled) return;

      /** Hand over to the chrome phase on its own route. */
      const advanceToChrome = () => {
        driverObj?.destroy();
        router.replace(`${PHASE_ROUTE.chrome}?tour=${PHASE_PARAM.chrome}`);
      };

      const steps: DriveStep[] =
        phase === 'hub'
          ? buildHubSteps(title, desc, t, advanceToChrome)
          : mobile
            ? buildMobileChromeSteps(title, desc, t, setLeftOpen, setRightOpen)
            : buildDesktopChromeSteps(
                title,
                desc,
                t,
                isDesktopApp,
                setLeftOpen,
                setRightOpen,
              );

      driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: overlay,
        popoverClass: 'rounded-xl border-2 shadow-xl !font-body',
        stagePadding: 8,
        stageRadius: 12,
        popoverOffset: 12,
        progressText: '{{current}} / {{total}}',
        nextBtnText: t('nextBtn'),
        prevBtnText: t('prevBtn'),
        doneBtnText: phase === 'hub' ? t('continueBtn') : t('doneBtn'),
        steps,
        onPopoverRender: (popover) => {
          const el = popover.wrapper as HTMLElement;
          el.style.backgroundColor = bg;
          el.style.borderColor = dark ? '#27272a' : '#e4e4e7';
        },
        onDestroyStarted: () => {
          setLeftOpen(false);
          setRightOpen(false);
          clearTourParam();
          driverObj?.destroy();
        },
      });

      driverObj.drive();
    }, 600);

    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [
    searchParams,
    pathname,
    router,
    isDesktopApp,
    mobile,
    t,
    theme,
    setLeftOpen,
    setRightOpen,
  ]);

  return null;
}

/**
 * Build the hub phase — the entry tiles on `/home`.
 *
 * Identical on mobile and desktop: the hub grid reflows from two columns to three but
 * carries the same six destinations on both, and none of it is gesture-driven.
 *
 * Tiles are addressed by `data-tour`, not by `href`. The sidebar links to the same
 * routes and precedes the hub in DOM order, so `a[href="/live"]` resolves to the
 * sidebar's copy — which is behind the hub and invisible.
 *
 * @param onFinish - Invoked by the last step's Next button to start the chrome phase.
 */
function buildHubSteps(
  title: (t: string) => string,
  desc: (t: string) => string,
  t: (key: string) => string,
  onFinish: () => void,
): DriveStep[] {
  const tile = (id: string, key: string): DriveStep => ({
    element: `[data-tour="hub-${id}"]`,
    popover: {
      title: title(t(`${key}.title`)),
      description: desc(t(`${key}.description`)),
      side: 'bottom',
      align: 'center',
    },
  });

  return [
    {
      popover: {
        title: title(t('welcome.title')),
        description: desc(t('welcome.description')),
      },
    },
    {
      element: '[data-tour="hub-grid"]',
      popover: {
        title: title(t('hub.title')),
        description: desc(t('hub.description')),
        side: 'top',
        align: 'center',
      },
    },
    tile('live', 'live'),
    tile('movies', 'movies'),
    tile('music', 'music'),
    tile('manga', 'manga'),
    tile('ask-ai', 'askAi'),
    {
      ...tile('games', 'games'),
      popover: {
        title: title(t('games.title')),
        description: desc(t('games.description')),
        side: 'bottom',
        align: 'center',
        onNextClick: onFinish,
      },
    },
  ];
}

/**
 * Build the chrome phase for mobile — emphasizes long-press and swipe gestures.
 *
 * Runs on `/search`, so the navbar and sidebars are visible and the search landing's
 * input is present.
 */
function buildMobileChromeSteps(
  title: (t: string) => string,
  desc: (t: string) => string,
  t: (key: string) => string,
  setLeftOpen: (v: boolean) => void,
  setRightOpen: (v: boolean) => void,
): DriveStep[] {
  return [
    {
      element: 'input[name="q"]',
      popover: {
        title: title(t('search.title')),
        description: desc(t('search.description')),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'a[href="/home"]',
      popover: {
        title: title(t('mobileNav.title')),
        description: desc(t('mobileNav.description')),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: title(t('mobileSidebar.title')),
        description: desc(t('mobileSidebar.description')),
      },
      onHighlightStarted: () => setLeftOpen(true),
    },
    {
      element: 'a[href="/continue-watching"]',
      popover: {
        title: title(t('resume.title')),
        description: desc(t('resume.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'a[href="/watchlist"]',
      popover: {
        title: title(t('watchlist.title')),
        description: desc(t('watchlist.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'a[href="/library"]',
      popover: {
        title: title(t('library.title')),
        description: desc(t('library.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      popover: {
        title: title(t('mobileFriends.title')),
        description: desc(t('mobileFriends.description')),
      },
      onHighlightStarted: () => {
        setLeftOpen(false);
        setRightOpen(true);
      },
    },
    {
      element: 'a[href="/profile"]',
      popover: {
        title: title(t('profile.title')),
        description: desc(t('profile.description')),
        side: 'bottom',
        align: 'end',
      },
      onHighlightStarted: () => setRightOpen(false),
    },
    {
      popover: {
        title: title(t('ready.title')),
        description: desc(t('ready.description')),
      },
    },
  ];
}

/**
 * Build the chrome phase for desktop — hover-based sidebars.
 *
 * Only covers what the hub does not: search, the navigation rail, the destinations
 * absent from the hub (resume, watchlist, library), friends, and profile. Music,
 * manga, games and Ask AI are introduced as hub tiles and are not repeated here.
 */
function buildDesktopChromeSteps(
  title: (t: string) => string,
  desc: (t: string) => string,
  t: (key: string) => string,
  _isDesktopApp: boolean,
  setLeftOpen: (v: boolean) => void,
  setRightOpen: (v: boolean) => void,
): DriveStep[] {
  return [
    {
      element: 'input[name="q"]',
      popover: {
        title: title(t('search.title')),
        description: desc(t('search.description')),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'aside',
      popover: {
        title: title(t('sidebar.title')),
        description: desc(t('sidebar.description')),
        side: 'right',
        align: 'start',
      },
      onHighlightStarted: () => setLeftOpen(true),
    },
    {
      element: 'a[href="/continue-watching"]',
      popover: {
        title: title(t('resume.title')),
        description: desc(t('resume.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'a[href="/watchlist"]',
      popover: {
        title: title(t('watchlist.title')),
        description: desc(t('watchlist.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'a[href="/library"]',
      popover: {
        title: title(t('library.title')),
        description: desc(t('library.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'aside:last-of-type',
      popover: {
        title: title(t('friends.title')),
        description: desc(t('friends.description')),
        side: 'left',
        align: 'start',
      },
      onHighlightStarted: () => {
        setLeftOpen(false);
        setRightOpen(true);
      },
    },
    {
      element: 'a[href="/profile"]',
      popover: {
        title: title(t('profile.title')),
        description: desc(t('profile.description')),
        side: 'bottom',
        align: 'end',
      },
      onHighlightStarted: () => setRightOpen(false),
    },
    {
      popover: {
        title: title(t('ready.title')),
        description: desc(t('ready.description')),
      },
    },
  ];
}

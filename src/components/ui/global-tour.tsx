'use client';

import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useTheme } from '@/providers/theme-provider';

/**
 * Resolve whether the current theme is dark.
 * @param theme - The active theme value.
 * @returns `true` if the resolved theme is dark.
 */
function isDark(theme: string) {
  if (theme === 'dark') return true;
  if (theme === 'system' && typeof window !== 'undefined')
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}

/**
 * Headless component that launches an interactive product tour using `driver.js`.
 *
 * Activates when the URL contains `?tour=true` and the user is on `/home`.
 * Builds platform-specific step sequences (mobile vs desktop) that highlight
 * key UI elements like the search bar, sidebar navigation, friends panel, and
 * profile link. Automatically cleans up the `tour` query param on completion.
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
    if (searchParams.get('tour') !== 'true' || pathname !== '/home') return;

    tourStarted.current = true;

    const dark = isDark(theme);
    const bg = dark ? '#18181b' : '#ffffff';
    const fg = dark ? '#fafafa' : '#1a1a1a';
    const overlay = dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

    const title = (text: string, color?: string) =>
      `<span class="font-headline font-black text-xl uppercase tracking-tighter" style="color:${color ?? fg}">${text}</span>`;
    const desc = (text: string) =>
      `<span class="font-body text-sm font-medium" style="color:${fg};opacity:0.7">${text}</span>`;

    const timer = setTimeout(() => {
      const steps: DriveStep[] = mobile
        ? buildMobileSteps(title, desc, t, setLeftOpen, setRightOpen)
        : buildDesktopSteps(
            title,
            desc,
            t,
            dark,
            isDesktopApp,
            setLeftOpen,
            setRightOpen,
          );

      const driverObj = driver({
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
        doneBtnText: t('doneBtn'),
        steps,
        onPopoverRender: (popover) => {
          const el = popover.wrapper as HTMLElement;
          el.style.backgroundColor = bg;
          el.style.borderColor = dark ? '#27272a' : '#e4e4e7';
        },
        onDestroyStarted: () => {
          setLeftOpen(false);
          setRightOpen(false);
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('tour');
          router.replace(
            `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`,
          );
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 600);

    return () => clearTimeout(timer);
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
 * Build tour steps optimized for mobile (swipe-based navigation).
 * @returns An array of `DriveStep` objects for the mobile tour.
 */
function buildMobileSteps(
  title: (t: string, c?: string) => string,
  desc: (t: string) => string,
  t: (key: string) => string,
  setLeftOpen: (v: boolean) => void,
  setRightOpen: (v: boolean) => void,
): DriveStep[] {
  return [
    {
      popover: {
        title: title(t('welcome.title')),
        description: desc(t('welcome.description')),
      },
    },
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
      popover: {
        title: title('← Swipe Right'),
        description: desc(
          'Swipe from the left edge to open the navigation menu. It has Home, Live, Music, Downloads, and more.',
        ),
      },
      onHighlightStarted: () => setLeftOpen(true),
    },
    {
      popover: {
        title: title('Swipe Left →'),
        description: desc(
          'Swipe from the right edge to see your friends, online status, and start voice calls.',
        ),
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
 * Build tour steps optimized for desktop (hover-based sidebars).
 * @returns An array of `DriveStep` objects for the desktop tour.
 */
function buildDesktopSteps(
  title: (t: string, c?: string) => string,
  desc: (t: string) => string,
  t: (key: string) => string,
  dark: boolean,
  isDesktopApp: boolean,
  setLeftOpen: (v: boolean) => void,
  setRightOpen: (v: boolean) => void,
): DriveStep[] {
  return [
    {
      popover: {
        title: title(t('welcome.title')),
        description: desc(t('welcome.description')),
      },
    },
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
      element: 'a[href="/live"]',
      popover: {
        title: title(t('live.title')),
        description: desc(t('live.description')),
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
    ...(isDesktopApp
      ? [
          {
            element: 'a[href="/downloads"]',
            popover: {
              title: title(t('downloads.title')),
              description: desc(t('downloads.description')),
              side: 'right' as const,
              align: 'center' as const,
            },
          },
        ]
      : []),
    {
      element: 'a[href="/music"]',
      popover: {
        title: title(t('music.title')),
        description: desc(t('music.description')),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: 'a[href="/ask-ai"]',
      popover: {
        title: title(t('askAi.title')),
        description: desc(t('askAi.description')),
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
      element: 'a[href="/profile"]',
      popover: {
        title: title(t('serverTip.title'), dark ? '#fb7185' : '#e63b2e'),
        description: desc(t('serverTip.description')),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      popover: {
        title: title(t('ready.title')),
        description: desc(t('ready.description')),
      },
    },
  ];
}

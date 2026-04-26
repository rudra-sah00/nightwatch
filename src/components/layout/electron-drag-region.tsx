'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import { desktopBridge } from '@/lib/electron-bridge';

const ROUTE_NAMES: Record<string, string> = {
  '/home': 'Home',
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/profile': 'Profile',
  '/search': 'Search',
  '/watchlist': 'Watchlist',
  '/live': 'Live',
  '/downloads': 'Downloads',
  '/whats-new': "What's New",
  '/privacy': 'Privacy',
  '/terms': 'Terms',
  '/continue-watching': 'Continue Watching',
  '/library': 'Library',
  '/ask-ai': 'Ask AI',
  '/changelog': 'Changelog',
};

function getRouteTitle(pathname: string): string {
  if (ROUTE_NAMES[pathname]) return ROUTE_NAMES[pathname];
  if (pathname.startsWith('/watch-party/')) return 'Watch Party';
  if (pathname.startsWith('/watch/')) return 'Watch';
  if (pathname.startsWith('/clip/')) return 'Clip';
  if (pathname.startsWith('/live/')) return 'Live';
  if (pathname.startsWith('/user/')) return 'Profile';
  return 'Nightwatch';
}

function WindowControls() {
  return (
    <div className="absolute right-0 top-0 h-8 flex items-stretch [-webkit-app-region:no-drag]">
      <button
        type="button"
        onClick={() => desktopBridge.windowMinimize()}
        className="w-12 h-8 flex items-center justify-center text-foreground/60 hover:bg-foreground/10 transition-colors"
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" className="fill-current">
          <title>Minimize</title>
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => desktopBridge.windowMaximize()}
        className="w-12 h-8 flex items-center justify-center text-foreground/60 hover:bg-foreground/10 transition-colors"
        aria-label="Maximize"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="stroke-current"
        >
          <title>Maximize</title>
          <rect x="0.5" y="0.5" width="9" height="9" strokeWidth="1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => desktopBridge.windowClose()}
        className="w-12 h-8 flex items-center justify-center text-foreground/60 hover:bg-neo-red hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="stroke-current"
        >
          <title>Close</title>
          <path d="M1 1L9 9M9 1L1 9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ElectronDragRegion() {
  const { isDesktopApp, isMounted, isMacOS, isWindows } = useDesktopApp();
  const router = useRouter();
  const pathname = usePathname();
  const title = useMemo(() => getRouteTitle(pathname), [pathname]);

  useEffect(() => {
    if (!isMounted || !isDesktopApp) return;

    const root = document.documentElement;
    root.style.setProperty('--electron-titlebar-height', '32px');
    root.style.setProperty('--electron-inset-left', isMacOS ? '140px' : '60px');
    root.style.setProperty(
      '--electron-inset-right',
      isWindows ? '138px' : '0px',
    );

    return () => {
      root.style.removeProperty('--electron-titlebar-height');
      root.style.removeProperty('--electron-inset-left');
      root.style.removeProperty('--electron-inset-right');
    };
  }, [isMounted, isDesktopApp, isMacOS, isWindows]);

  const goBack = useCallback(() => router.back(), [router]);
  const goForward = useCallback(() => router.forward(), [router]);

  if (!isMounted || !isDesktopApp) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-8 z-[9999] bg-background [-webkit-app-region:drag] flex items-center">
      <div
        className={`flex items-center gap-0.5 [-webkit-app-region:no-drag] ${isMacOS ? 'ml-[80px]' : 'ml-2'}`}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
          aria-label="Go back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="stroke-current"
          >
            <title>Back</title>
            <path
              d="M10 3L5 8L10 13"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={goForward}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
          aria-label="Go forward"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="stroke-current"
          >
            <title>Forward</title>
            <path
              d="M6 3L11 8L6 13"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-headline font-bold uppercase tracking-[0.15em] text-foreground/70 select-none pointer-events-none">
        {title}
      </span>
      {isWindows && <WindowControls />}
    </div>
  );
}

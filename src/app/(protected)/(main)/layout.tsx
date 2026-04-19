'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { OfflineState } from '@/components/layout/OfflineState';
import { GlobalTour } from '@/components/ui/global-tour';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname() || '';
  const { isOffline, mounted } = useNetworkStatus();

  // Do not show the offline blocker inside player routes or offline vault
  const bypassOfflineState =
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/watch-party/') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/downloads');

  const showOfflineBlocker = mounted && isOffline && !bypassOfflineState;

  return (
    <ServerProvider defaultServer={user?.preferredServer}>
      <div className="min-h-[100dvh] w-full bg-background text-foreground font-body flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-neo-yellow focus:text-foreground focus:px-4 focus:py-2 focus:border-[3px] focus:border-border focus:font-headline focus:font-black focus:uppercase focus:text-sm focus:tracking-widest"
        >
          Skip to content
        </a>
        <Suspense fallback={null}>
          <GlobalTour />
        </Suspense>
        <Navbar />
        <div id="main-content" className="flex-grow flex flex-col">
          {showOfflineBlocker ? <OfflineState /> : children}
        </div>
      </div>
    </ServerProvider>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutInner>{children}</MainLayoutInner>;
}

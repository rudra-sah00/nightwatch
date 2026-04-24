'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { Navbar } from '@/components/layout/navbar';
import { OfflineState } from '@/components/layout/OfflineState';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { GlobalTour } from '@/components/ui/global-tour';
import { useFriendNotifications } from '@/features/friends/hooks/use-friend-notifications';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

type SidebarContextType = {
  leftOpen: boolean;
  rightOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  leftOpen: false,
  rightOpen: false,
  setLeftOpen: () => {},
  setRightOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const LEFT_OPEN_ZONE = 50;
const LEFT_CLOSE_ZONE = 340;
const RIGHT_OPEN_ZONE = 50;
const RIGHT_CLOSE_ZONE = 340;

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useFriendNotifications();
  const pathname = usePathname() || '';
  const { isOffline, mounted } = useNetworkStatus();
  const t = useTranslations('common');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fromRight = rect.width - x;

      // Left sidebar
      if (x < LEFT_OPEN_ZONE) {
        setLeftOpen(true);
      } else if (x > LEFT_CLOSE_ZONE && leftOpen) {
        setLeftOpen(false);
      }

      // Right sidebar
      if (fromRight < RIGHT_OPEN_ZONE) {
        setRightOpen(true);
      } else if (fromRight > RIGHT_CLOSE_ZONE && rightOpen) {
        setRightOpen(false);
      }
    },
    [leftOpen, rightOpen],
  );

  const handleMouseLeave = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const bypassOfflineState =
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/watch-party/') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/downloads');

  const showOfflineBlocker = mounted && isOffline && !bypassOfflineState;

  return (
    <SidebarContext.Provider
      value={{ leftOpen, rightOpen, setLeftOpen, setRightOpen }}
    >
      <ServerProvider defaultServer={user?.preferredServer}>
        <div className="min-h-[100dvh] w-full bg-background text-foreground font-body flex flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-neo-yellow focus:text-foreground focus:px-4 focus:py-2 focus:border-[3px] focus:border-border focus:font-headline focus:font-black focus:uppercase focus:text-sm focus:tracking-widest"
          >
            {t('skipToContent')}
          </a>
          <Suspense fallback={null}>
            <GlobalTour />
          </Suspense>
          <Navbar />
          <div
            ref={containerRef}
            id="main-content"
            className="flex-grow flex flex-row min-h-0 gap-2 p-2 h-[calc(100dvh-5rem)] overflow-hidden"
          >
            <LeftSidebar />
            <div className="flex-grow flex flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-card min-w-0 transition-all duration-300 [&_.container]:!max-w-full">
              {showOfflineBlocker ? <OfflineState /> : children}
            </div>
            <RightSidebar />
          </div>
        </div>
      </ServerProvider>
    </SidebarContext.Provider>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutInner>{children}</MainLayoutInner>;
}

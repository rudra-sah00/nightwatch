'use client';

import dynamic from 'next/dynamic';
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

const GlobalTour = dynamic(
  () => import('@/components/ui/global-tour').then((m) => m.GlobalTour),
  { ssr: false },
);

import { useFriendNotifications } from '@/features/friends/hooks/use-friend-notifications';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';
import { ServerProvider } from '@/providers/server-provider';

type SidebarContextType = {
  leftOpen: boolean;
  rightOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  sidebarsDisabled: boolean;
  setSidebarsDisabled: (disabled: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  leftOpen: false,
  rightOpen: false,
  setLeftOpen: () => {},
  setRightOpen: () => {},
  sidebarsDisabled: false,
  setSidebarsDisabled: () => {},
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
  const [sidebarsDisabled, _setSidebarsDisabled] = useState(false);
  const disabledRef = useRef(false);
  const cooldownRef = useRef(false);
  const recentTouchRef = useRef(false);
  const leftOpenRef = useRef(false);
  const rightOpenRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  leftOpenRef.current = leftOpen;
  rightOpenRef.current = rightOpen;

  const setSidebarsDisabled = useCallback((disabled: boolean) => {
    disabledRef.current = disabled;
    _setSidebarsDisabled(disabled);
    if (disabled) {
      setLeftOpen(false);
      setRightOpen(false);
    } else {
      // Brief cooldown so the next mousemove doesn't immediately open a sidebar
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 300);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (recentTouchRef.current) return;
      if (disabledRef.current || cooldownRef.current) return;
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
    // Mobile native app uses swipe gestures instead of mouse hover
    if (checkIsMobile()) return;
    const container = containerRef.current;
    if (!container) return;

    // Suppress mouse events that originate from touch
    const onTouch = () => {
      recentTouchRef.current = true;
      setTimeout(() => {
        recentTouchRef.current = false;
      }, 500);
    };

    container.addEventListener('touchstart', onTouch, { passive: true });
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('touchstart', onTouch);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  // --- MOBILE: Swipe gestures to open sidebars ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startX = 0;
    let startY = 0;
    let swiping = false;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only count horizontal swipes (dx > dy)
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

      // Wider edge zone on mobile web (browser eats the outermost ~20px for
      // its own back/forward gesture). Native Capacitor doesn't have that
      // conflict so 40px is fine there.
      const edgeZone = checkIsMobile() ? 40 : 80;

      if (dx > 0) {
        if (rightOpenRef.current) {
          setRightOpen(false);
        } else if (startX < edgeZone) {
          setLeftOpen(true);
        }
      } else {
        if (leftOpenRef.current) {
          setLeftOpen(false);
        } else {
          const w = container.getBoundingClientRect().width;
          if (startX > w - edgeZone) setRightOpen(true);
        }
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const bypassOfflineState =
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/watch-party/') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/downloads');

  const showOfflineBlocker = mounted && isOffline && !bypassOfflineState;

  return (
    <SidebarContext.Provider
      value={{
        leftOpen,
        rightOpen,
        setLeftOpen,
        setRightOpen,
        sidebarsDisabled,
        setSidebarsDisabled,
      }}
    >
      <ServerProvider defaultServer={user?.preferredServer}>
        <div className="h-full w-full bg-background text-foreground font-body flex flex-col overflow-hidden">
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
            className="flex-1 flex flex-row min-h-0 gap-2 p-2 overflow-hidden relative"
          >
            <LeftSidebar />
            <div className="flex-grow flex flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-card min-w-0 transition-all duration-300 [&_.container]:!max-w-full relative">
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

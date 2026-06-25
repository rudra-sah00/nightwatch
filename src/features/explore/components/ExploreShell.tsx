'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { DMView } from './DMView';
import { ExploreBottomBar } from './ExploreBottomBar';
import { ExploreFeed } from './ExploreFeed';

const SWIPE_THRESHOLD = 60;

export function ExploreShell() {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(pathname === '/dm' ? 1 : 0);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchRef = useRef<{
    startX: number;
    startY: number;
    locked: boolean | null;
  }>({ startX: 0, startY: 0, locked: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const closeChatRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const target = pathname === '/dm' ? 1 : 0;
    if (target !== activeIndex) setActiveIndex(target);
  }, [pathname, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setTranslateX(0);
      router.push(index === 0 ? '/explore' : '/dm', { scroll: false });
    },
    [router],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: null,
    };
    setIsSwiping(false);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;

      if (touchRef.current.locked === null) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          touchRef.current.locked = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }
      if (!touchRef.current.locked) return;

      setIsSwiping(true);

      if (chatOpen) {
        if (dx < 0) return;
        setTranslateX(dx);
        return;
      }

      if (activeIndex === 0 && dx > 0) return;
      if (activeIndex === 1 && dx < 0) return;
      setTranslateX(dx);
    },
    [activeIndex, chatOpen],
  );

  const onTouchEnd = useCallback(() => {
    if (!isSwiping) {
      setTranslateX(0);
      return;
    }

    if (chatOpen) {
      if (translateX > SWIPE_THRESHOLD) closeChatRef.current?.();
      setTranslateX(0);
      setIsSwiping(false);
      touchRef.current.locked = null;
      return;
    }

    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      navigateTo(translateX < 0 ? 1 : 0);
    } else {
      setTranslateX(0);
    }
    setIsSwiping(false);
    touchRef.current.locked = null;
  }, [isSwiping, translateX, navigateTo, chatOpen]);

  const swipePercent =
    containerRef.current && isSwiping && !chatOpen
      ? (translateX / containerRef.current.clientWidth) * 100
      : 0;

  if (!mounted) return <div className="flex flex-col h-full" />;

  return (
    <div className="flex flex-col h-full relative">
      {!chatOpen && (
        <PageTitle
          title={activeIndex === 0 ? 'Explore' : 'Messages'}
          href={activeIndex === 0 ? '/explore' : '/dm'}
        />
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Explore panel */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translateX(${activeIndex === 0 ? swipePercent : -100 + swipePercent}%)`,
            transition: isSwiping
              ? 'none'
              : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            visibility: activeIndex === 0 || isSwiping ? 'visible' : 'hidden',
          }}
        >
          <ExploreFeed onThreadOpen={setThreadOpen} />
        </div>

        {/* DM panel */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            transform: `translateX(${activeIndex === 1 ? swipePercent : 100 + swipePercent}%)`,
            transition: isSwiping
              ? 'none'
              : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            visibility: activeIndex === 1 || isSwiping ? 'visible' : 'hidden',
          }}
        >
          <DMView onChatOpen={setChatOpen} closeChatRef={closeChatRef} />
        </div>
      </div>

      {!chatOpen && !threadOpen && (
        <ExploreBottomBar onPostCreated={() => {}} />
      )}
    </div>
  );
}

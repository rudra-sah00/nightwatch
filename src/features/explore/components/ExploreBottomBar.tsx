'use client';

import { Home, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ExplorePost } from '@/features/explore/types';
import { apiFetch } from '@/lib/fetch';
import { hapticLight } from '@/lib/haptics';
import { useSocket } from '@/providers/socket-provider';
import { CreatePostDialog } from './CreatePostDialog';

interface ExploreBottomBarProps {
  onPostCreated: (post: ExplorePost) => void;
}

export function ExploreBottomBar({ onPostCreated }: ExploreBottomBarProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const { socket } = useSocket();

  // Fetch unread status on mount
  useEffect(() => {
    apiFetch<{ count: number }>('/api/messages/unread')
      .then((r) => setHasUnread(r.count > 0))
      .catch(() => {});
  }, []);

  // Listen for new DM messages to show unread dot
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      if (pathname !== '/dm') setHasUnread(true);
    };
    socket.on('dm:message', handler);
    return () => {
      socket.off('dm:message', handler);
    };
  }, [socket, pathname]);

  // Clear unread when navigating to /dm
  useEffect(() => {
    if (pathname === '/dm') setHasUnread(false);
  }, [pathname]);

  useEffect(() => {
    let container: Element | null = null;
    let retries = 0;
    const MAX_RETRIES = 15; // 3 seconds max
    const handleScroll = () => {
      if (!container) return;
      const currentY = container.scrollTop;
      setVisible(currentY <= 0 || currentY < lastScrollY.current);
      lastScrollY.current = currentY;
    };
    const attach = () => {
      container = document.querySelector('[data-explore-feed]');
      if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true });
        return true;
      }
      return false;
    };
    if (!attach()) {
      const interval = setInterval(() => {
        retries++;
        if (attach() || retries >= MAX_RETRIES) clearInterval(interval);
      }, 200);
      return () => {
        clearInterval(interval);
        container?.removeEventListener('scroll', handleScroll);
      };
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHomeClick = () => {
    if (pathname === '/explore') {
      document
        .querySelector('[data-explore-feed]')
        ?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/explore');
    }
  };

  return (
    <>
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-card/40 backdrop-blur-xl transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
          <button
            type="button"
            onClick={handleHomeClick}
            className="p-3 rounded-2xl hover:bg-muted transition-colors text-foreground/60 hover:text-foreground"
          >
            <Home className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              setComposerOpen(true);
            }}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5px]" />
          </button>

          <Link
            href="/dm"
            className="relative p-3 rounded-2xl hover:bg-muted transition-colors text-foreground/60 hover:text-foreground"
          >
            <MessageCircle className="w-6 h-6" />
            {hasUnread && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </Link>
        </div>
      </div>

      {composerOpen && (
        <CreatePostDialog
          onClose={() => setComposerOpen(false)}
          onCreated={onPostCreated}
        />
      )}
    </>
  );
}

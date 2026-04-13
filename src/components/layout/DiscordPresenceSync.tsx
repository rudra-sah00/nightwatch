'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';

export function DiscordPresenceSync() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only handle basic page routes, since Watch and Party components
    // override this with their own detailed metadata when mounted.
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
        window.electronAPI.updateDiscordPresence({
          details: 'Ready to stream',
          state: 'At the Login screen',
          largeImageKey: 'watchrudra_logo',
          largeImageText: 'Watch Rudra',
          startTimestamp: Date.now(), // Reset timer
        });
        return;
      }

      if (pathname.includes('/watch/') || pathname.includes('/party/')) {
        // Let the specific player component handle the rich presence details
        return;
      }

      // Default authenticated states
      let details = 'Browsing Dashboard';
      let state = 'Looking for content';

      if (pathname === '/home') {
        details = 'Browsing Homepage';
      } else if (pathname === '/live') {
        details = 'Browsing Live Matches';
        state = 'Finding a stream...';
      } else if (pathname === '/watchlist') {
        details = 'Curating Watchlist';
        state = 'Planning the next marathon';
      } else if (pathname === '/profile') {
        details = 'Adjusting Settings';
        state = 'Customizing profile';
      }

      window.electronAPI.updateDiscordPresence({
        details,
        state,
        largeImageKey: 'watchrudra_logo',
        largeImageText: 'Watch Rudra',
        // Omit startTimestamp so it keeps the original launch time or we can reset it
      });
    }
  }, [pathname, isAuthenticated]);

  return null;
}

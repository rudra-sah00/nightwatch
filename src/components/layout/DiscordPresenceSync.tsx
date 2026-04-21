'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';

export function DiscordPresenceSync() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const t = useTranslations('common');

  useEffect(() => {
    // Only handle basic page routes, since Watch and Party components
    // override this with their own detailed metadata when mounted.
    if (typeof window !== 'undefined' && checkIsDesktop()) {
      if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
        desktopBridge.updateDiscordPresence({
          details: t('discord.readyToStream'),
          state: t('discord.atLoginScreen'),
          largeImageKey: 'watchrudra_logo',
          largeImageText: 'Watch Rudra',
          startTimestamp: Date.now(), // Reset timer
        });
        return;
      }

      if (
        pathname.includes('/watch/') ||
        pathname.includes('/party/') ||
        /^\/live\/[^/]+/.test(pathname)
      ) {
        // Let the specific player component handle the rich presence details
        return;
      }

      // Default authenticated states
      let details = t('discord.browsingDashboard');
      let state = t('discord.lookingForContent');

      if (pathname === '/home') {
        details = t('discord.browsingHomepage');
      } else if (pathname === '/live') {
        details = t('discord.browsingLiveMatches');
        state = t('discord.findingStream');
      } else if (pathname === '/watchlist') {
        details = t('discord.curatingWatchlist');
        state = t('discord.planningMarathon');
      } else if (pathname === '/profile') {
        details = t('discord.adjustingSettings');
        state = t('discord.customizingProfile');
      }

      desktopBridge.updateDiscordPresence({
        details,
        state,
        largeImageKey: 'watchrudra_logo',
        largeImageText: 'Watch Rudra',
        startTimestamp: Date.now(),
      });
    }
  }, [pathname, isAuthenticated, t]);

  return null;
}

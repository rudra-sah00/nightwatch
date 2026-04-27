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
    if (typeof window === 'undefined' || !checkIsDesktop()) return;

    if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
      desktopBridge.updateDiscordPresence({
        details: t('discord.readyToStream'),
        state: t('discord.atLoginScreen'),
        largeImageKey: 'nightwatch_logo',
        largeImageText: 'Nightwatch',
        startTimestamp: Date.now(),
      });
      return;
    }

    if (
      pathname.includes('/watch/') ||
      pathname.includes('/party/') ||
      /^\/live\/[^/]+/.test(pathname)
    ) {
      return;
    }

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
    } else if (pathname.startsWith('/music')) {
      details = 'Browsing Music';
      state = 'Nightwatch';
    }

    desktopBridge.updateDiscordPresence({
      details,
      state,
      largeImageKey: 'nightwatch_logo',
      largeImageText: 'Nightwatch',
      startTimestamp: Date.now(),
    });
  }, [pathname, isAuthenticated, t]);

  return null;
}

'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { usePathname, useRouter } from 'next/navigation';
import { FOCUS_KEYS } from '../lib/focus-keys';

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: 'Home', href: '/home' },
  { icon: 'search', label: 'Search', href: '/search' },
  { icon: 'live_tv', label: 'Live TV', href: '/live' },
  { icon: 'music_note', label: 'Music', href: '/music' },
  { icon: 'menu_book', label: 'Manga', href: '/manga' },
  { icon: 'video_library', label: 'Library', href: '/library' },
  { icon: 'bookmark', label: 'Watchlist', href: '/watchlist' },
  { icon: 'smart_toy', label: 'Ask AI', href: '/ask-ai' },
  { icon: 'person', label: 'Profile', href: '/profile' },
];

function NavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const router = useRouter();
  const { ref, focused } = useFocusable({
    focusKey: `${FOCUS_KEYS.SIDEBAR}_${item.href}`,
    onEnterPress: () => router.push(item.href),
  });

  return (
    <div
      ref={ref}
      className={`
        flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-200
        ${focused ? 'bg-indigo-500 text-foreground' : ''}
        ${isActive && !focused ? 'text-foreground bg-white/10' : ''}
        ${!focused && !isActive ? 'text-muted-foreground' : ''}
      `}
    >
      <span className="material-symbols-outlined text-2xl shrink-0">
        {item.icon}
      </span>
      <span className="tv-navbar__label text-base font-medium whitespace-nowrap">
        {item.label}
      </span>
    </div>
  );
}

export function TvNavbar() {
  const pathname = usePathname() || '';
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: FOCUS_KEYS.SIDEBAR,
    trackChildren: true,
    saveLastFocusedChild: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['left'],
  });

  const collapsed = !hasFocusedChild;

  return (
    <FocusContext.Provider value={focusKey}>
      <nav
        ref={ref}
        className={`tv-navbar flex flex-col gap-1 py-6 px-3 h-full shrink-0 bg-card/80 backdrop-blur-sm ${
          collapsed ? 'tv-navbar--collapsed' : ''
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-4">
          <img src="/logo.png" alt="Nightwatch" className="w-8 h-8 shrink-0" />
          <span className="tv-navbar__label text-lg font-bold whitespace-nowrap">
            Nightwatch
          </span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </FocusContext.Provider>
  );
}

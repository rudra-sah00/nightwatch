'use client';

import {
  BookOpen,
  Bot,
  Compass,
  Gamepad2,
  History,
  Home,
  Library,
  Music,
  Plus,
  Radio,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useExploreNotifications } from '@/features/explore/hooks/use-explore-notifications';
import { useAuthStore } from '@/store/use-auth-store';

export function LeftSidebar() {
  const { leftOpen: open, setLeftOpen } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('common.nav');
  const { unreadCount, clearBadge } = useExploreNotifications();
  const user = useAuthStore((s) => s.user);

  const isActive = (href: string) => pathname?.startsWith(href);

  React.useEffect(() => {
    if (pathname?.startsWith('/explore')) clearBadge();
  }, [pathname, clearBadge]);

  const primaryLinks = [
    { href: '/home', label: t('home'), icon: Home },
    { href: '/explore', label: t('explore'), icon: Compass },
    { href: '/continue-watching', label: t('continue'), icon: History },
    { href: '/live', label: t('live'), icon: Radio },
    { href: '/watchlist', label: t('watchlist'), icon: Plus },
    { href: '/library', label: t('library'), icon: Library },
    { href: '/music', label: t('music'), icon: Music },
    { href: '/manga', label: t('manga'), icon: BookOpen },
    { href: '/games', label: t('games'), icon: Gamepad2 },
    { href: '/ask-ai', label: t('askAi'), icon: Bot },
  ];

  const secondaryLinks = [{ href: '/profile', label: 'Profile', icon: User }];

  const closeSidebar = () => setLeftOpen(false);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
    }`;

  // Desktop nav - original style
  const _desktopNav = () => (
    <nav className="flex-1 flex flex-col py-3 px-3 overflow-y-auto">
      <div className="flex flex-col gap-1.5">
        {primaryLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <span className="relative shrink-0">
              <Icon className="w-5 h-5 stroke-[2.5px]" />
              {href === '/explore' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-neo-red rounded-full border-2 border-card" />
              )}
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );

  // Mobile nav - X/Twitter style
  const mobileNav = (onClick?: () => void) => (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* User profile section */}
      {user && (
        <div className="px-5 pt-6 pb-4">
          <Link href="/profile" onClick={onClick}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-border">
              {user.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt=""
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                  {user.name[0]}
                </div>
              )}
            </div>
          </Link>
          <p className="mt-3 font-bold text-base">{user.name}</p>
          {user.username && (
            <p className="text-sm text-foreground/50">@{user.username}</p>
          )}
        </div>
      )}

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {primaryLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClick}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-bold transition-colors ${
                isActive(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="relative shrink-0">
                <Icon className="w-6 h-6" />
                {href === '/explore' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-neo-red rounded-full border-2 border-card" />
                )}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Divider + secondary */}
      <div className="px-3 py-3 mt-auto">
        {secondaryLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm text-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );

  // Mobile only: push-style (absolute, revealed when content pushes right)
  return (
    <aside
      className={`md:hidden absolute top-0 left-0 bottom-0 w-[75%] z-30 bg-background flex flex-col transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {mobileNav(closeSidebar)}
    </aside>
  );
}

/** Desktop collapsible sidebar - sits inside the flex-row */
export function LeftSidebarDesktop() {
  const { leftOpen: open } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('common.nav');
  const { unreadCount } = useExploreNotifications();

  const isActive = (href: string) => pathname?.startsWith(href);

  const links = [
    { href: '/home', label: t('home'), icon: Home },
    { href: '/explore', label: t('explore'), icon: Compass },
    { href: '/continue-watching', label: t('continue'), icon: History },
    { href: '/live', label: t('live'), icon: Radio },
    { href: '/watchlist', label: t('watchlist'), icon: Plus },
    { href: '/library', label: t('library'), icon: Library },
    { href: '/music', label: t('music'), icon: Music },
    { href: '/manga', label: t('manga'), icon: BookOpen },
    { href: '/games', label: t('games'), icon: Gamepad2 },
    { href: '/ask-ai', label: t('askAi'), icon: Bot },
  ];

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
    }`;

  return (
    <aside
      className={`hidden md:flex shrink-0 h-full bg-card flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'w-80 rounded-2xl' : 'w-11 hover:w-14 rounded-r-2xl -ml-2'
      }`}
    >
      {open ? (
        <nav className="flex-1 flex flex-col py-3 px-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                <span className="relative shrink-0">
                  <Icon className="w-5 h-5 stroke-[2.5px]" />
                  {href === '/explore' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-neo-red rounded-full border-2 border-card" />
                  )}
                </span>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-foreground/60">
            menu
          </span>
        </div>
      )}
    </aside>
  );
}

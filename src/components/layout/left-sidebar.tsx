'use client';

import {
  Bot,
  Download,
  History,
  Home,
  Library,
  Monitor,
  Music,
  Plus,
  Radio,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useDesktopApp } from '@/hooks/use-desktop-app';
import { useCurrentOSDownload } from '@/hooks/use-download-links';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileSidebarShell } from './sidebar/MobileSidebarShell';
import { useSidebarAnimation } from './sidebar/use-sidebar-animation';

/**
 * Detects the user's operating system from the navigator user agent string.
 *
 * @returns The OS name (`"macOS"`, `"Windows"`, or `"Linux"`), or `null` if undetectable.
 */
function useOSName() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Win/i.test(ua)) return 'Windows';
    if (/Linux/i.test(ua)) return 'Linux';
    return null;
  }, []);
}

/**
 * Primary left navigation sidebar with links to all major app sections.
 *
 * Renders as a full-width overlay on mobile (via {@link MobileSidebarShell}) and
 * a collapsible fixed-width panel on desktop. Conditionally shows download and
 * desktop-app-specific links based on the current platform.
 */
export function LeftSidebar() {
  const { leftOpen: open, setLeftOpen } = useSidebar();
  const pathname = usePathname();
  const { isDesktopApp, isMounted } = useDesktopApp();
  const t = useTranslations('common.nav');
  const td = useTranslations('common.desktopApp');
  const tw = useTranslations('common.whatsNew');
  const osName = useOSName();
  const downloadUrl = useCurrentOSDownload();
  const mobile = useIsMobile();
  const { visible, closing } = useSidebarAnimation(open);

  const isActive = (href: string) => pathname?.startsWith(href);

  const links = [
    { href: '/home', label: t('home'), icon: Home },
    { href: '/continue-watching', label: t('continue'), icon: History },
    { href: '/live', label: t('live'), icon: Radio },
    { href: '/watchlist', label: t('watchlist'), icon: Plus },
    { href: '/library', label: 'Library', icon: Library },
    ...(isMounted && (isDesktopApp || mobile)
      ? [{ href: '/downloads', label: t('downloads'), icon: Download }]
      : []),
    { href: '/music', label: t('music'), icon: Music },
    { href: '/ask-ai', label: 'Ask AI', icon: Bot },
  ];

  const whatsNewHref = isMounted && isDesktopApp ? '/changelog' : '/whats-new';
  const showDownloadApp = isMounted && !isDesktopApp && !mobile && osName;
  const closeSidebar = () => setLeftOpen(false);

  const navContent = (onClick?: () => void) => (
    <nav className="flex-1 flex flex-col gap-1.5 py-3 px-3 overflow-y-auto">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${
            isActive(href)
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
          }`}
        >
          <Icon className="w-5 h-5 stroke-[2.5px] shrink-0" />
          {label}
        </Link>
      ))}
      <Link
        href={whatsNewHref}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap mt-auto ${
          isActive('/changelog') || isActive('/whats-new')
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
        }`}
      >
        <Sparkles className="w-5 h-5 stroke-[2.5px] shrink-0" />
        {tw('title')}
      </Link>
      {showDownloadApp && downloadUrl && (
        <a
          href={downloadUrl}
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
        >
          <Monitor className="w-5 h-5 stroke-[2.5px] shrink-0" />
          {td('downloadFor', { os: osName })}
        </a>
      )}
    </nav>
  );

  // Mobile: full-width overlay
  if (mobile) {
    return (
      <MobileSidebarShell
        visible={visible}
        closing={closing}
        direction="left"
        onClose={closeSidebar}
      >
        {navContent(closeSidebar)}
      </MobileSidebarShell>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <aside
      className={`shrink-0 h-full bg-card flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'w-80 rounded-2xl' : 'w-11 hover:w-14 rounded-r-2xl -ml-2'
      }`}
    >
      {open ? (
        navContent()
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

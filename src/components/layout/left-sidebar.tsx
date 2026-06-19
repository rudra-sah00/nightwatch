'use client';

import {
  BookOpen,
  Bot,
  Gamepad2,
  History,
  Home,
  Library,
  Music,
  Plus,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileSidebarShell } from './sidebar/MobileSidebarShell';
import { useSidebarAnimation } from './sidebar/use-sidebar-animation';

/**
 * Primary left navigation sidebar with links to all major app sections.
 *
 * Renders as a full-width overlay on mobile (via {@link MobileSidebarShell}) and
 * a collapsible fixed-width panel on desktop.
 */
export function LeftSidebar() {
  const { leftOpen: open, setLeftOpen } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations('common.nav');
  const mobile = useIsMobile();
  const { visible, closing } = useSidebarAnimation(open);

  const isActive = (href: string) => pathname?.startsWith(href);

  const links = [
    { href: '/home', label: t('home'), icon: Home },
    { href: '/continue-watching', label: t('continue'), icon: History },
    { href: '/live', label: t('live'), icon: Radio },
    { href: '/watchlist', label: t('watchlist'), icon: Plus },
    { href: '/library', label: t('library'), icon: Library },
    { href: '/music', label: t('music'), icon: Music },
    { href: '/manga', label: t('manga'), icon: BookOpen },
    { href: '/games', label: t('games'), icon: Gamepad2 },
    { href: '/ask-ai', label: t('askAi'), icon: Bot },
  ];

  const closeSidebar = () => setLeftOpen(false);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-bold uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
    }`;

  const navContent = (onClick?: () => void) => (
    <nav className="flex-1 flex flex-col py-3 px-3 overflow-y-auto">
      {/* Main nav links — scrollable top section */}
      <div className="flex flex-col gap-1.5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={linkClass(href)}
          >
            <Icon className="w-5 h-5 stroke-[2.5px] shrink-0" />
            {label}
          </Link>
        ))}
      </div>
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

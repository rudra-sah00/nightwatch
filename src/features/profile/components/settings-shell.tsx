'use client';

import { ArrowLeft, KeyRound, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/settings/profile',
    label: 'Profile',
    icon: <UserIcon className="w-4 h-4" />,
  },
  {
    href: '/settings/security',
    label: 'Security',
    icon: <KeyRound className="w-4 h-4" />,
  },
];

interface SettingsShellProps {
  children: React.ReactNode;
}

export function SettingsShell({ children }: SettingsShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors duration-200 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Profile
          </Link>
          <div className="h-4 w-px bg-border/60" />
          <span className="text-sm font-medium text-foreground/70">
            Settings
          </span>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 pt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
          {/* ── Sidebar (desktop) ── */}
          <nav className="hidden md:block md:sticky md:top-24">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-white/[0.06] text-foreground border border-white/[0.08]'
                        : 'text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.03]',
                    )}
                  >
                    <span
                      className={cn(
                        'transition-colors',
                        isActive
                          ? 'text-indigo-400'
                          : 'text-muted-foreground/50',
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* ── Mobile Tabs ── */}
          <nav className="md:hidden flex gap-2 -mt-4 mb-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.06] text-foreground border border-white/[0.08]'
                      : 'text-muted-foreground/70 hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      isActive ? 'text-indigo-400' : 'text-muted-foreground/50',
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Content ── */}
          <main className="min-w-0">
            <div className="animate-in fade-in duration-300">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

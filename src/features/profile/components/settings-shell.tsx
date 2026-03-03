'use client';

import { KeyRound, User as UserIcon } from 'lucide-react';
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
    <div className="pb-16">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Manage your account preferences
          </p>
        </div>

        {/* ── Tabs ── */}
        <nav className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 sm:mb-8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/[0.08] text-foreground shadow-sm'
                    : 'text-muted-foreground/60 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-indigo-400' : 'text-muted-foreground/40',
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
        <div className="animate-in fade-in duration-200">{children}</div>
      </div>
    </div>
  );
}

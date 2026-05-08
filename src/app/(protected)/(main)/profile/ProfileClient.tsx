'use client';

import { Activity, ChevronRight, Monitor, Palette, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UpdateProfileForm } from '@/features/profile/components/update-profile-form';
import { useProfileOverview } from '@/features/profile/hooks/use-profile-overview';

const sections = [
  { href: '/profile/preferences', icon: Palette, key: 'preferences' },
  { href: '/profile/security', icon: Shield, key: 'security' },
  { href: '/profile/devices', icon: Monitor, key: 'devices' },
  { href: '/profile/activity', icon: Activity, key: 'activity' },
] as const;

export default function ProfileClient() {
  const t = useTranslations('profile');
  const { user } = useProfileOverview();

  if (!user) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in duration-200 w-full">
      <UpdateProfileForm />

      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map(({ href, icon: Icon, key }) => (
          <Link
            key={key}
            href={href}
            className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:bg-secondary/50 active:scale-[0.98] transition-all group"
          >
            <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="flex-1 font-headline font-bold uppercase tracking-wider text-sm">
              {t(`nav.${key}`)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </nav>
    </main>
  );
}

'use client';

import { ChevronRight, Monitor, Palette, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ActivityGraph } from '@/features/profile/components/activity-graph';
import { UpdateProfileForm } from '@/features/profile/components/update-profile-form';
import { useProfileOverview } from '@/features/profile/hooks/use-profile-overview';

const sections = [
  { href: '/profile/preferences', icon: Palette, key: 'preferences' },
  { href: '/profile/security', icon: Shield, key: 'security' },
  { href: '/profile/devices', icon: Monitor, key: 'devices' },
] as const;

export default function ProfileClient() {
  const t = useTranslations('profile');
  const { user, activity, loadingActivity } = useProfileOverview();

  const userCreatedAtDate = user?.createdAt
    ? new Date(user.createdAt)
    : undefined;

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

      <section
        className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8"
        aria-label={t('activity.heatmapAriaLabel')}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter">
            {t('activity.title')}
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12">
                Watch
              </span>
              <div className="flex gap-1.5 items-center">
                <div className="w-3.5 h-3.5 bg-secondary" />
                <div className="w-3.5 h-3.5 bg-activity-1" />
                <div className="w-3.5 h-3.5 bg-activity-2" />
                <div className="w-3.5 h-3.5 bg-activity-3" />
                <div className="w-3.5 h-3.5 bg-activity-4" />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12">
                Music
              </span>
              <div className="flex gap-1.5 items-center">
                <div className="w-3.5 h-3.5 bg-secondary" />
                <div className="w-3.5 h-3.5 bg-music-1" />
                <div className="w-3.5 h-3.5 bg-music-2" />
                <div className="w-3.5 h-3.5 bg-music-3" />
                <div className="w-3.5 h-3.5 bg-music-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <ActivityGraph
            activity={activity}
            createdAt={userCreatedAtDate}
            isLoading={loadingActivity}
          />
        </div>
      </section>
    </main>
  );
}

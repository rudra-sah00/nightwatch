'use client';

import { useTranslations } from 'next-intl';
import { ActivityGraph } from '@/features/profile/components/activity-graph';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';
import { useProfileOverview } from '@/features/profile/hooks/use-profile-overview';

export default function ActivityPage() {
  const t = useTranslations('profile');
  const { user, activity, loadingActivity } = useProfileOverview();

  const userCreatedAtDate = user?.createdAt
    ? new Date(user.createdAt)
    : undefined;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <ProfileBackButton label="Profile" />
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

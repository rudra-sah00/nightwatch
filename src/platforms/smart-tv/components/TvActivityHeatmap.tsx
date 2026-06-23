'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { getMusicActivity, getWatchActivity } from '@/features/profile/api';
import { ActivityGraph } from '@/features/profile/components/activity-graph';
import type { ActivityData } from '@/features/profile/types';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * TV Activity Heatmap — exact replica of the web laptop profile heatmap.
 * Uses the same ActivityGraph component, same legend, same data.
 */
export function TvActivityHeatmap() {
  const t = useTranslations('profile');
  const user = useAuthStore((s) => s.user);

  const { data: watchActivity = [] } = useQuery({
    queryKey: ['profile', 'activity', 'watch'],
    queryFn: () => getWatchActivity(),
    staleTime: 60_000,
  });

  const { data: musicActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['profile', 'activity', 'music'],
    queryFn: () => getMusicActivity(),
    staleTime: 60_000,
  });

  const activity: ActivityData = { watch: watchActivity, music: musicActivity };

  const userCreatedAtDate = useMemo(
    () => (user?.createdAt ? new Date(user.createdAt) : undefined),
    [user?.createdAt],
  );

  return (
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
  );
}

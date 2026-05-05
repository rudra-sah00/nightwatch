'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ActivityData } from '../types';

// Helper to get ISO date string YYYY-MM-DD (Local)
const toIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Props for the {@link ActivityGraph} component. */
interface ActivityGraphProps {
  /** Daily watch and music activity records. */
  activity: ActivityData;
  /** Whether the activity data is still loading. */
  isLoading?: boolean;
}

const WATCH_LEVEL_COLORS = [
  'bg-secondary', // Level 0
  'bg-activity-1', // Level 1
  'bg-activity-2', // Level 2
  'bg-activity-3', // Level 3
  'bg-activity-4', // Level 4
] as const;

const MUSIC_LEVEL_COLORS = [
  'bg-secondary', // Level 0
  'bg-music-1', // Level 1
  'bg-music-2', // Level 2
  'bg-music-3', // Level 3
  'bg-music-4', // Level 4
] as const;

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

function getMonthLabelsFromWeeks(
  weeks: { date: Date }[][],
  t: (key: string) => string,
) {
  const labels: { key: string; label: string }[] = [];
  let lastMonth = -1;
  for (const week of weeks) {
    const month = week[0].date.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        key: `${month}-${week[0].date.getFullYear()}`,
        label: t(`activity.months.${MONTH_KEYS[month]}`),
      });
    }
  }
  return labels;
}

function getMonthLabelsForSkeleton(t: (key: string) => string) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (52 * 7 + dayOfWeek));
  const labels: { key: string; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < 53; w++) {
    const d = new Date(start);
    d.setDate(start.getDate() + w * 7);
    const month = d.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        key: `${month}-${d.getFullYear()}`,
        label: t(`activity.months.${MONTH_KEYS[month]}`),
      });
    }
  }
  return labels;
}

function ActivityGraphSkeleton() {
  const t = useTranslations('profile');
  const skeletonIds = useMemo(
    () => Array.from({ length: 53 * 7 }).map((_, i) => `skel-id-${i}`),
    [],
  );
  const monthLabels = useMemo(() => getMonthLabelsForSkeleton(t), [t]);

  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px] mb-4">
        {skeletonIds.map((id) => (
          <div
            key={id}
            className="w-3 h-3 bg-primary/5 border border-border/10"
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-foreground/20 min-w-[800px]">
        {monthLabels.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

function useActivityGraphData(activity: ActivityData, createdAt?: Date) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const watchByDate = new Map(activity.watch?.map((a) => [a.date, a]) ?? []);
    const musicByDate = new Map(activity.music?.map((a) => [a.date, a]) ?? []);

    const dayOfWeek = today.getDay();
    const daysToSubtract = 52 * 7 + dayOfWeek;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    const weeksData: {
      date: Date;
      dateStr: string;
      watchCount: number;
      watchLevel: number;
      musicCount: number;
      musicLevel: number;
      isValid: boolean;
    }[][] = [];

    const currentDate = new Date(startDate);
    const creationDay = createdAt ? new Date(createdAt) : null;
    if (creationDay) creationDay.setHours(0, 0, 0, 0);

    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toIso(currentDate);
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const isFuture = checkDate > todayMidnight;

        let watchCount = 0;
        let watchLevel = 0;
        let musicCount = 0;
        let musicLevel = 0;

        if (!isFuture) {
          const wDay = watchByDate.get(dateStr);
          watchCount = wDay?.count || 0;
          watchLevel = wDay?.level || 0;
          if (watchCount > 0 && watchLevel === 0) {
            if (watchCount > 120) watchLevel = 4;
            else if (watchCount > 60) watchLevel = 3;
            else if (watchCount > 30) watchLevel = 2;
            else watchLevel = 1;
          }

          const mDay = musicByDate.get(dateStr);
          musicCount = mDay?.count || 0;
          musicLevel = mDay?.level || 0;
          if (musicCount > 0 && musicLevel === 0) {
            if (musicCount > 120) musicLevel = 4;
            else if (musicCount > 60) musicLevel = 3;
            else if (musicCount > 30) musicLevel = 2;
            else musicLevel = 1;
          }
        }

        week.push({
          date: new Date(currentDate),
          dateStr,
          watchCount,
          watchLevel,
          musicCount,
          musicLevel,
          isValid: !isFuture,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksData.push(week);
    }

    return { weeks: weeksData };
  }, [activity, createdAt]);
}

export function ActivityGraph({
  activity,
  createdAt,
  isLoading = false,
}: ActivityGraphProps & { createdAt?: Date }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { weeks } = useActivityGraphData(activity, createdAt);
  const monthLabels = useMemo(
    () => getMonthLabelsFromWeeks(weeks, t),
    [weeks, t],
  );

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (isLoading) {
    return <ActivityGraphSkeleton />;
  }

  return (
    <>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px]"
        role="img"
        aria-label={t('activity.heatmapAriaLabel')}
      >
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isLeftSide = weekIndex < 10;
            const isRightSide = weekIndex > weeks.length - 10;
            const tooltipHorizontal = isLeftSide
              ? 'left-0'
              : isRightSide
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';
            const isTopRow = dayIndex < 3;
            const tooltipVertical = isTopRow
              ? 'top-full mt-2'
              : 'bottom-full mb-2';

            const hasWatch = day.watchLevel > 0;
            const hasMusic = day.musicLevel > 0;

            return (
              <div
                key={day.dateStr}
                className={cn(
                  'w-3 h-3 border border-border/10 transition-colors relative group/cell',
                  !hasWatch && !hasMusic ? 'bg-secondary' : '',
                  !day.isValid ? 'opacity-0' : 'cursor-pointer',
                )}
              >
                {/* Clipped Activity Bars */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Watch Activity (Left Half) */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 bottom-0 transition-colors',
                      hasWatch || hasMusic ? 'w-1/2' : 'w-full',
                      WATCH_LEVEL_COLORS[day.watchLevel],
                    )}
                  />
                  {/* Music Activity (Right Half) */}
                  <div
                    className={cn(
                      'absolute top-0 right-0 bottom-0 transition-colors',
                      hasWatch || hasMusic ? 'w-1/2' : 'w-0',
                      MUSIC_LEVEL_COLORS[day.musicLevel],
                    )}
                  />
                </div>

                {/* Tooltip (Outside overflow-hidden) */}
                {day.isValid && (
                  <div
                    className={cn(
                      'absolute hidden group-hover/cell:flex flex-col gap-1 z-50 whitespace-nowrap bg-primary text-primary-foreground font-headline tracking-tighter text-[11px] px-2 py-1 shadow-lg pointer-events-none uppercase font-bold',
                      tooltipHorizontal,
                      tooltipVertical,
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span>{formatDate(day.date)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-t border-primary-foreground/20 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-activity-4" />
                        <span>
                          {day.watchCount > 0
                            ? t('activity.minSuffix', {
                                count: Math.ceil(day.watchCount),
                              })
                            : t('activity.noWatch')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-music-4" />
                        <span>
                          {day.musicCount > 0
                            ? t('activity.minMusicSuffix', {
                                count: Math.ceil(day.musicCount),
                              })
                            : t('activity.noMusic')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-foreground/40 min-w-[800px]">
        {monthLabels.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </>
  );
}
